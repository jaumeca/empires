import { SIM_CONFIG } from '../config';
import { clientTerms, fameContract, noteFame } from './reputation';
import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import { nextFloat, nextInt, nextRange, pick } from '../core/rng';
import type { ActiveContract, ContractOffer, Contracts, Empirian, GameState } from '../model/state';
import { getFounder } from '../state';
import { efficiency, officeWorkMultiplier, skillFor, skillSpeed } from './project';
import { officeEffects } from './office';
import { traitSpeed, workstationEffects } from './team';
import { teamSpeedFactor } from '../estimates';
import { gainXp } from './progression';
import { toolMultiplier } from './world';

/**
 * External contracts (LS.8): the first alternative activity. Predictable income
 * in exchange for time, effort and a commitment (deadline). One work item at a
 * time: a game *or* a contract. Clients and kinds are fictional (D-021).
 */
const K = () => SIM_CONFIG.contracts;

export const CLIENTS = ['bakery', 'gym', 'museum', 'startup', 'school', 'florist'] as const;
export const CONTRACT_KINDS = [
  { id: 'website', focus: 0.45, work: [70, 130] as [number, number] },
  { id: 'app', focus: 0.65, work: [110, 190] as [number, number] },
  { id: 'bugfix', focus: 0.9, work: [50, 90] as [number, number] },
  { id: 'prototype', focus: 0.35, work: [80, 150] as [number, number] },
] as const;

export function createContracts(): Contracts {
  return { offers: [], active: null, nextRefreshDay: 3, completed: 0 };
}

/** Working days a founder needs for `work` points at a given focus (estimate shown to the player). */
export function estimateDays(state: GameState, work: number, focus: number): number {
  const f = getFounder(state);
  const perDay = SIM_CONFIG.work.basePointsPerTick * skillSpeed(skillFor(f, focus)) * teamSpeedFactor(state, focus) * SIM_CONFIG.ticksPerDay * K().estimateEfficiency;
  return Math.ceil(work / Math.max(0.1, perDay));
}

function makeOffer(state: GameState): ContractOffer {
  const rng = state.rng.people;
  const kind = pick(rng, CONTRACT_KINDS);
  const work = nextInt(rng, kind.work[0], kind.work[1]);
  const days = estimateDays(state, work, kind.focus);
  const slack = 1 + nextRange(rng, K().slack[0], K().slack[1]);
  const rep = state.company.reputation;
  // Clients remember whether the studio delivers on time (F3.8).
  const terms = clientTerms(state);
  const payment = Math.round((work * K().ratePerPoint * (0.85 + rep / 200) * terms.pay * nextRange(rng, 0.9, 1.1)) / 50) * 50;
  return {
    id: newId(state, 'C'),
    clientId: pick(rng, CLIENTS),
    kind: kind.id,
    focus: kind.focus,
    work,
    days: Math.max(5, Math.round(days * slack * terms.slack)),
    payment,
    expiresDay: state.day + nextInt(rng, 7, 14),
  };
}

/** Daily: drop expired offers, refresh weekly up to the maximum. */
export function contractsDay(state: GameState): void {
  const c = state.contracts;
  c.offers = c.offers.filter((o) => o.expiresDay > state.day);
  if (state.day >= c.nextRefreshDay) {
    c.nextRefreshDay = state.day + 7;
    // At least one new offer each week (when there is room), sometimes more.
    if (c.offers.length < K().maxOffers) c.offers.push(makeOffer(state));
    while (c.offers.length < K().maxOffers && nextFloat(state.rng.people) < 0.6) c.offers.push(makeOffer(state));
  }
}

export function acceptContract(state: GameState, offerId: string): string | null {
  const c = state.contracts;
  if (state.activeProjectId || c.active) return 'busy';
  const o = c.offers.find((x) => x.id === offerId);
  if (!o) return 'offer_gone';
  c.offers = c.offers.filter((x) => x.id !== offerId);
  const causeId = record(state, { kind: 'contract', text: { key: 'ledger.contract.accepted', params: { client: o.clientId, kind: o.kind, payment: o.payment, days: o.days } }, causes: [], tone: 0 });
  c.active = { ...o, startDay: state.day, dueDay: state.day + o.days, done: 0, causeId };
  return null;
}

export function cancelContract(state: GameState): string | null {
  const a = state.contracts.active;
  if (!a) return 'no_contract';
  state.contracts.active = null;
  state.company.reputation = Math.max(0, state.company.reputation - K().cancelReputation);
  noteFame(state, 'reliability', -SIM_CONFIG.fame.cancel, () => {});
  record(state, { kind: 'contract', text: { key: 'ledger.contract.cancelled', params: { client: a.clientId } }, causes: [a.causeId], tone: -1 });
  return null;
}

/** Payment on delivery: bonus if early, penalty per late day (capped). */
export function settlement(a: ActiveContract, day: number): { pay: number; lateDays: number; early: boolean } {
  const lateDays = Math.max(0, day - a.dueDay);
  const early = day <= a.dueDay - Math.ceil(a.days * 0.25);
  const penalty = Math.min(K().maxPenalty, lateDays * K().latePenaltyPerDay);
  const pay = Math.round(a.payment * (1 - penalty) * (early ? 1 + K().earlyBonus : 1));
  return { pay, lateDays, early };
}

/** One working hour of one Empirian on the active contract (called instead of project work). */
export function contractTick(state: GameState, e: Empirian, emit: EventSink, coord = 1): void {
  const a = state.contracts.active;
  if (!a) return;
  const isTech = nextFloat(state.rng.work) < a.focus;
  const fx = workstationEffects(state, e);
  const pts = SIM_CONFIG.work.basePointsPerTick * skillSpeed(skillFor(e, a.focus)) * efficiency(e) * traitSpeed(e, 'normal') * coord * officeWorkMultiplier(fx, isTech ? 'tech' : 'design') * toolMultiplier(state, isTech ? 'tech' : 'design');
  a.done += pts;
  e.activity = isTech ? 'coding' : 'designing';
  emit({ type: 'work', empirianId: e.id, kind: isTech ? 'tech' : 'design', amount: pts, severity: 'info' });
  gainXp(state, e, isTech ? 'tech' : 'design', 1, emit);
  if (a.done >= a.work) deliver(state, getFounder(state), emit);
}

function deliver(state: GameState, founder: Empirian, emit: EventSink): void {
  const a = state.contracts.active!;
  const { pay, lateDays, early } = settlement(a, state.day);
  state.company.money += pay;
  state.contracts.active = null;
  state.contracts.completed += 1;
  const repDelta = lateDays > 0 ? -Math.min(3, Math.ceil(lateDays / 3)) : early ? 2 : 1;
  state.company.reputation = Math.max(0, Math.min(100, state.company.reputation + repDelta));
  fameContract(state, lateDays, early, emit);
  gainXp(state, founder, 'management', K().managementXp, emit);
  record(state, {
    kind: 'contract',
    text: { key: lateDays > 0 ? 'ledger.contract.late' : early ? 'ledger.contract.early' : 'ledger.contract.delivered', params: { client: a.clientId, pay, days: lateDays } },
    causes: [a.causeId],
    tone: lateDays > 0 ? -1 : 1,
  });
  founder.activity = 'celebrating';
  emit({ type: 'contract_done', contractId: a.id, pay, lateDays, severity: 'important' });
}
