import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import { nextFloat, nextInt, nextRange, pick } from '../core/rng';
import type { Candidate, Empirian, GameState, Hiring, PlacedItem, SkillId, TraitId } from '../model/state';
import { EMPIRIAN_NAMES } from '../../content/names';
import { founderDesk, getItemDef, officeEffects, type OfficeEffects } from './office';
import { rememberFarewell, rememberHire } from './story';

/**
 * Team growth (GT.1–GT.3): applicants, hiring and firing, weekly salaries,
 * personality traits and the coordination cost of working together.
 * Every number lives in SIM_CONFIG.team.
 */
const K = () => SIM_CONFIG.team;

export const TRAITS: readonly TraitId[] = ['perfectionist', 'night_owl', 'sociable', 'curious'];

export function createHiring(): Hiring {
  return { candidates: [], nextRefreshDay: 1, hired: 0, salariesPaid: 0 };
}

export function employees(state: GameState): Empirian[] {
  return state.empirians.filter((e) => e.id !== state.founderId);
}

/** Hiring opens once the studio has shipped something (a game or a contract). */
export function hiringUnlocked(state: GameState): boolean {
  return state.projects.some((p) => p.phase === 'released') || state.contracts.completed > 0;
}

/** Desks with computer and chair that nobody uses (the founder takes the best unassigned one). */
export function freeWorkstations(state: GameState): PlacedItem[] {
  const fd = founderDesk(state.office);
  return state.office.items.filter((it) => getItemDef(it.defId).category === 'desk' && it.mounts?.computer && it.mounts?.chair && !it.assignedTo && it !== fd);
}

export function deskOf(state: GameState, e: Empirian): PlacedItem | null {
  if (e.id === state.founderId) return founderDesk(state.office);
  return state.office.items.find((it) => it.assignedTo === e.id) ?? null;
}

/** Office effects as felt by one Empirian: shared items + their own computer and chair. */
export function workstationEffects(state: GameState, e: Empirian): OfficeEffects {
  const fx = officeEffects(state.office);
  if (e.id === state.founderId) return fx;
  const desk = deskOf(state, e);
  const pc = desk?.mounts?.computer ? getItemDef(desk.mounts.computer).effects ?? {} : {};
  const chair = desk?.mounts?.chair ? getItemDef(desk.mounts.chair).effects ?? {} : {};
  return { ...fx, techSpeed: desk ? pc.techSpeed ?? 1 : 0.6, designSpeed: desk ? pc.designSpeed ?? 1 : 0.6, fatigue: chair.fatigue ?? 1 };
}

/** Per-person work factor: two people are not twice as fast (GT.3). */
export function coordinationFactor(teamSize: number): number {
  return 1 / (1 + K().coordination * Math.max(0, teamSize - 1));
}

export function teamSize(state: GameState): number {
  return state.empirians.length;
}

// ------------------------------------------------------------------ traits

export function traitSpeed(e: Empirian, pace: string): number {
  const T = K().traits;
  switch (e.trait) {
    case 'perfectionist': return T.perfectionist.speed;
    case 'night_owl': return pace === 'crunch' ? T.night_owl.crunchSpeed : 1;
    case 'sociable': return T.sociable.speed;
    case 'curious': return T.curious.speed;
    default: return 1;
  }
}
export function traitBugs(e: Empirian): number {
  return e.trait === 'perfectionist' ? K().traits.perfectionist.bugs : 1;
}
export function traitDrain(e: Empirian): number {
  return e.trait === 'night_owl' ? K().traits.night_owl.drain : 1;
}
export function traitXp(e: Empirian): number {
  return e.trait === 'curious' ? K().traits.curious.xp : 1;
}
/** Extra morale target for everyone when a sociable person is on the team (does not stack). */
export function teamMoraleBonus(state: GameState): number {
  return state.empirians.some((e) => e.trait === 'sociable') ? K().traits.sociable.teamMorale : 0;
}

// -------------------------------------------------------------- applicants

function makeCandidate(state: GameState): Candidate {
  const r = state.rng.hiring;
  const profile = pick(r, ['coder', 'designer', 'generalist'] as const);
  const lvl = (lo: number, hi: number) => Math.round(nextRange(r, lo, hi) * 2) / 2;
  const strong = () => lvl(4, 7.5);
  const weak = () => lvl(2, 4.5);
  const mid = () => lvl(3, 6);
  const baseSkills: Record<SkillId, number> = {
    tech: profile === 'coder' ? strong() : profile === 'designer' ? weak() : mid(),
    design: profile === 'designer' ? strong() : profile === 'coder' ? weak() : mid(),
    creativity: lvl(3, 6.5),
    management: lvl(2, 5),
  };
  const avg = (Math.max(baseSkills.tech, baseSkills.design) + (baseSkills.tech + baseSkills.design) / 2) / 2;
  const salary = Math.round(((K().salaryBase + K().salaryPerLevel * (avg - 3)) * nextRange(r, 0.9, 1.1)) / 10) * 10;
  const taken = new Set([...state.empirians.map((e) => e.name), ...state.hiring.candidates.map((c) => c.name)]);
  const names = EMPIRIAN_NAMES.filter((n) => !taken.has(n));
  return {
    id: newId(state, 'H'),
    name: pick(r, names.length ? names : EMPIRIAN_NAMES),
    appearance: {
      skin: nextInt(r, 0, 7), hairStyle: nextInt(r, 0, 7), hairColor: nextInt(r, 0, 11), top: nextInt(r, 0, 4),
      topColor: nextInt(r, 0, 9), pantsColor: nextInt(r, 0, 5), accessory: nextFloat(r) < 0.5 ? 0 : nextInt(r, 1, 5),
    },
    baseSkills,
    trait: pick(r, TRAITS),
    salary: Math.max(200, salary),
    expiresDay: state.day + nextInt(r, K().candidateDays[0], K().candidateDays[1]),
  };
}

/** Daily: applicants expire; every two weeks new ones arrive (once hiring is unlocked). */
export function hiringDay(state: GameState, emit: EventSink): void {
  const h = state.hiring;
  h.candidates = h.candidates.filter((c) => c.expiresDay > state.day);
  if (!hiringUnlocked(state) || state.day < h.nextRefreshDay) return;
  h.nextRefreshDay = state.day + K().refreshDays;
  if (employees(state).length >= K().maxEmployees) return;
  let added = 0;
  while (h.candidates.length < K().candidatesPerRefresh) { h.candidates.push(makeCandidate(state)); added++; }
  if (added) emit({ type: 'candidates_arrived', count: added, severity: 'important' });
}

// ---------------------------------------------------------------- commands

export function hire(state: GameState, candidateId: string, emit: EventSink): string | null {
  const c = state.hiring.candidates.find((x) => x.id === candidateId);
  if (!c) return 'candidate_gone';
  if (employees(state).length >= K().maxEmployees) return 'team_full';
  const desk = freeWorkstations(state)[0];
  if (!desk) return 'no_free_desk';
  if (state.company.money < c.salary) return 'not_enough_money';
  const id = newId(state, 'E');
  const e: Empirian = {
    id, name: c.name, appearance: { ...c.appearance },
    skills: { ...c.baseSkills }, baseSkills: { ...c.baseSkills },
    xp: { tech: 0, design: 0, creativity: 0, management: 0 }, topicXp: {},
    energy: SIM_CONFIG.energy.max, morale: K().hireMorale, activity: 'idle',
    salary: c.salary, trait: c.trait, hiredDay: state.day,
  };
  state.empirians.push(e);
  desk.assignedTo = id;
  state.hiring.candidates = state.hiring.candidates.filter((x) => x.id !== c.id);
  state.hiring.hired += 1;
  record(state, { kind: 'team', text: { key: 'ledger.team.hired', params: { name: e.name, salary: e.salary!, trait: e.trait! } }, causes: [], tone: 0 });
  rememberHire(state, e, emit);
  e.activity = 'celebrating';
  emit({ type: 'hired', empirianId: id, severity: 'important' });
  emit({ type: 'office_changed', severity: 'info' });
  return null;
}

export function fire(state: GameState, empirianId: string, emit: EventSink): string | null {
  if (empirianId === state.founderId) return 'cannot_fire_founder';
  const e = state.empirians.find((x) => x.id === empirianId);
  if (!e) return 'unknown_empirian';
  rememberFarewell(state, e, emit);
  const severance = (e.salary ?? 0) * K().severanceWeeks;
  state.company.money -= severance;
  state.empirians = state.empirians.filter((x) => x.id !== empirianId);
  for (const it of state.office.items) if (it.assignedTo === empirianId) delete it.assignedTo;
  for (const o of state.empirians) o.morale = Math.max(0, o.morale - K().fireMorale);
  state.company.reputation = Math.max(0, state.company.reputation - K().fireReputation);
  record(state, { kind: 'team', text: { key: 'ledger.team.fired', params: { name: e.name, severance } }, causes: [], tone: -1 });
  emit({ type: 'fired', empirianId, severity: 'important' });
  emit({ type: 'office_changed', severity: 'info' });
  return null;
}

/** Weekly payroll (called on the weekly boundary). */
export function payroll(state: GameState): number {
  let total = 0;
  for (const e of employees(state)) total += e.salary ?? 0;
  if (total > 0) {
    state.company.money -= total;
    state.hiring.salariesPaid += total;
  }
  return total;
}
