import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import { nextFloat } from '../core/rng';
import { hashUnit } from './features';
import { estimateDays } from './contracts';
import type { Empirian, GameState, Project, SupportJob } from '../model/state';
import { getFounder } from '../state';
import { efficiency, officeWorkMultiplier, skillFor, skillSpeed } from './project';
import { gainXp } from './progression';
import { noteFame } from './reputation';
import { remember } from './story';
import { traitSpeed, workstationEffects } from './team';
import { demandFactor, toolMultiplier } from './world';

/**
 * Products that stay alive after launch (GT.6, D-064). A launched game is not
 * forgotten: it can be PATCHED (fix what shipped broken) or UPDATED (new content
 * for an audience that's still there). Both are a maintenance job — the third
 * kind of work beside your own game and contracts — so they cost the time a new
 * project would use. Nothing erases a launch: the score stays; players notice.
 * Quiet post-launch happenings tell each product's later life (memories).
 * Numbers in SIM_CONFIG.products.
 */
const K = () => SIM_CONFIG.products;
const shipped = (p: Project) => p.bugs.hidden + p.bugs.known;

export function supportOf(p: Project) {
  return p.result?.support ?? { patches: 0, updates: 0 };
}

/** Commercial state, in words: on sale (launch weeks), long tail, or retired. */
export function productStatus(p: Project): 'launch' | 'tail' | 'retired' {
  const r = p.result!;
  if (r.salesEnded) return 'retired';
  return r.weeklySales.length < SIM_CONFIG.market.salesWeeks ? 'launch' : 'tail';
}

/** Why a patch can't be made now (null = it can). */
export function patchBlock(state: GameState, p: Project): string | null {
  if (!p.result) return 'not_released';
  if (shipped(p) === 0) return 'no_bugs';
  return busy(state);
}

/** Why an update can't be made now (null = it can). */
export function updateBlock(state: GameState, p: Project): string | null {
  if (!p.result) return 'not_released';
  if (p.result.averageScore < K().updateMinScore) return 'no_audience';
  if (supportOf(p).updates >= K().maxUpdates) return 'updated_enough';
  if (state.day - p.result.releasedDay > K().updateMaxAgeDays) return 'too_old';
  return busy(state);
}

function busy(state: GameState): string | null {
  return state.activeProjectId || state.contracts.active || state.support ? 'busy' : null;
}

/** Work points: patches grow with the bugs left; each update costs more than the last. */
export function supportWork(p: Project, kind: SupportJob['kind']): number {
  const base = SIM_CONFIG.work.requiredPoints[p.size] ?? 220;
  if (kind === 'patch') return Math.round(K().patchBase + shipped(p) * K().patchPerBug);
  return Math.round(base * K().updateShare * (1 + K().updateGrowth * supportOf(p).updates));
}

/** Working days the studio needs for it (estimate shown to the player). */
export function supportDays(state: GameState, p: Project, kind: SupportJob['kind']): number {
  return estimateDays(state, supportWork(p, kind), kind === 'patch' ? 1 : p.focus);
}

export function startSupport(state: GameState, projectId: string, kind: SupportJob['kind']): string | null {
  const p = state.projects.find((q) => q.id === projectId);
  if (!p) return 'unknown_project';
  const block = kind === 'patch' ? patchBlock(state, p) : updateBlock(state, p);
  if (block) return block;
  const causeId = record(state, { kind: 'decision', text: { key: `ledger.support.${kind}_started`, params: { project: p.name } }, causes: [], tone: 0, projectId: p.id });
  state.support = { projectId, kind, work: supportWork(p, kind), done: 0, startDay: state.day, causeId };
  return null;
}

export function cancelSupport(state: GameState): string | null {
  if (!state.support) return 'no_support';
  state.support = null;
  return null;
}

/** One working hour of one Empirian on the maintenance job (like a contract). */
export function supportTick(state: GameState, e: Empirian, emit: EventSink, coord = 1): void {
  const job = state.support!;
  const p = state.projects.find((q) => q.id === job.projectId);
  if (!p) { state.support = null; return; }
  const isTech = job.kind === 'patch' || nextFloat(state.rng.work) < p.focus;
  const fx = workstationEffects(state, e);
  const area = isTech ? 'tech' : 'design';
  const pts = SIM_CONFIG.work.basePointsPerTick * skillSpeed(skillFor(e, isTech ? 1 : 0)) * efficiency(e) * traitSpeed(e, 'normal') * coord * officeWorkMultiplier(fx, area) * toolMultiplier(state, area);
  job.done += pts;
  e.activity = job.kind === 'patch' ? 'testing' : isTech ? 'coding' : 'designing';
  emit({ type: 'work', empirianId: e.id, kind: job.kind === 'patch' ? 'test' : isTech ? 'tech' : 'design', amount: pts, severity: 'info' });
  gainXp(state, e, isTech ? 'tech' : 'design', 1, emit);
  if (job.done >= job.work) finishSupport(state, p, emit);
}

function finishSupport(state: GameState, p: Project, emit: EventSink): void {
  const job = state.support!;
  const r = p.result!;
  const s = supportOf(p);
  const k = K();
  state.support = null;
  if (job.kind === 'patch') {
    const fixed = shipped(p);
    p.bugs.fixed += fixed;
    p.bugs.hidden = 0;
    p.bugs.known = 0;
    r.support = { ...s, patches: s.patches + 1, lastDay: state.day };
    // Players notice: a little goodwill and some sales while it's still on sale. The score stays.
    state.company.reputation = Math.min(100, state.company.reputation + k.patchReputation);
    noteFame(state, 'quality', k.patchFame, emit);
    if (!r.salesEnded) boost(state, p, k.patchSales, k.patchWeeks);
    const id = record(state, { kind: 'consequence', text: { key: 'ledger.support.patch_done', params: { project: p.name, count: fixed } }, causes: [job.causeId], tone: 1, projectId: p.id });
    remember(state, `support:${id}`, 'decision', { key: 'ledger.support.patch_done', params: { project: p.name, count: fixed } }, { tone: 1, projectId: p.id }, emit);
  } else {
    // New content: back on sale (if it had stopped), a fresh push that fades; each update counts less.
    const strength = Math.pow(k.updateDiminishing, s.updates);
    r.support = { ...s, updates: s.updates + 1, lastDay: state.day };
    if (r.salesEnded) r.salesEnded = false;
    r.tailWeeks = Math.max(0, (r.tailWeeks ?? 0) - Math.round(k.updateRewind * strength));
    r.updateWave = { startDay: state.day, strength };
    noteFame(state, 'innovation', k.updateFame * strength, emit);
    const id = record(state, { kind: 'consequence', text: { key: 'ledger.support.update_done', params: { project: p.name } }, causes: [job.causeId], tone: 1, projectId: p.id });
    remember(state, `support:${id}`, 'decision', { key: 'ledger.support.update_done', params: { project: p.name } }, { tone: 1, projectId: p.id }, emit);
  }
  gainXp(state, getFounder(state), 'management', SIM_CONFIG.contracts.managementXp / 2, emit);
  emit({ type: 'support_done', projectId: p.id, kind: job.kind, severity: 'important' });
}

function boost(state: GameState, p: Project, factor: number, weeks: number): void {
  const r = p.result!;
  const prev = r.salesBoost && r.salesBoost.untilDay > state.day ? r.salesBoost.factor : 1;
  r.salesBoost = { factor: Math.max(prev, factor), untilDay: state.day + weeks * 7 };
}

// ------------------------------------------------------------- after launch

/** Weekly: the extra sales of recent content updates (a small relaunch that fades). */
function updateWaves(state: GameState, emit: EventSink): void {
  const k = K();
  for (const p of state.projects) {
    const r = p.result;
    const w = r?.updateWave;
    if (!r || !w) continue;
    const week = Math.floor((state.day - w.startDay) / 7);
    if (week >= k.updateWeeks) { delete r.updateWave; continue; }
    const week1 = r.weeklySales[0] ?? 0;
    const units = Math.round(week1 * k.updateWaveShare * w.strength * Math.pow(k.updateWaveDecay, week) * demandFactor(state, p.topicId));
    if (units <= 0) continue;
    const revenue = Math.round(units * r.price * 0.7 * 100) / 100; // 30 % store fee
    r.totalUnits += units;
    r.revenue += revenue;
    state.company.money += revenue;
    emit({ type: 'sales_week', projectId: p.id, units, revenue, severity: 'info' });
  }
}

/**
 * Weekly: the later life of products — quiet notes, never a window. At most one
 * happening per product and one every few weeks for the whole studio. Some are
 * good, some are not; all come from the product's real situation.
 */
export function productsWeek(state: GameState, emit: EventSink): void {
  updateWaves(state, emit);
  const k = K();
  const last = state.productsLog?.lastDay;
  if (last !== undefined && state.day - last < k.happeningGapDays) return;
  const candidates: { p: Project; kind: string }[] = [];
  for (const p of state.projects) {
    const res = p.result;
    if (!res || res.happening) continue;
    const age = state.day - res.releasedDay;
    if (res.salesEnded && res.averageScore >= 6 && res.averageScore < 7.5 && age >= k.lateCriticAge) candidates.push({ p, kind: 'late_critic' });
    else if (res.averageScore < 5 && age >= k.loyalAge && !res.salesEnded) candidates.push({ p, kind: 'loyal_few' });
    else if (res.salesEnded && res.totalUnits >= k.farewellUnits) candidates.push({ p, kind: 'farewell' });
    else if (res.averageScore >= 7 && age >= k.communityAge) candidates.push({ p, kind: 'community' });
    else if (shipped(p) >= k.abandonBugs && age >= k.abandonAge && supportOf(p).patches === 0 && !p.bugReported) candidates.push({ p, kind: 'abandoned' });
  }
  // Own deterministic draw (seed + day): a new system must not reshuffle the luck of the others.
  if (!candidates.length || hashUnit(state.seed, `day${state.day}`, 'product_happening') >= k.happeningChance) return;
  const { p, kind } = candidates[Math.floor(hashUnit(state.seed, `day${state.day}`, 'product_pick') * candidates.length)]!;
  const res = p.result!;
  res.happening = kind;
  state.productsLog = { lastDay: state.day };
  let tone: -1 | 0 | 1 = 1;
  if (kind === 'late_critic') { res.salesEnded = false; res.tailWeeks = Math.max(0, (res.tailWeeks ?? 0) - 4); boost(state, p, k.lateCriticSales, 4); }
  else if (kind === 'loyal_few') { boost(state, p, k.loyalSales, 8); }
  else if (kind === 'community') { state.company.reputation = Math.min(100, state.company.reputation + 1); }
  else if (kind === 'farewell') { tone = 0; }
  else if (kind === 'abandoned') { tone = -1; noteFame(state, 'reliability', -k.abandonFame, emit); }
  const text = { key: `ledger.product.${kind}`, params: { project: p.name } };
  record(state, { kind: 'consequence', text, causes: [], tone, projectId: p.id });
  remember(state, `product:${p.id}:${kind}`, 'decision', text, { tone, projectId: p.id }, emit);
  emit({ type: 'product_happening', projectId: p.id, kind, severity: 'important' });
}
