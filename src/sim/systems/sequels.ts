import { SIM_CONFIG } from '../config';
import type { GameState, Project } from '../model/state';
import { remember } from './story';

/**
 * Sequels and sagas (0.23.0, D-073). A game people liked can have a sequel:
 * - **Fans waiting:** it starts with more interest and reaches more of the
 *   first game's players — how many depends on how good the original was.
 * - **A known world:** some work is reused (a bit less to do).
 * - **Expectations:** the critics compare it with the original. Worse than
 *   the original → a letdown on the reviews; better → it surpasses it.
 * - **Saga fatigue:** the third entry and later bring fewer fans each time
 *   (unless they keep getting better, which only quality can do).
 * Measured with the career simulator: a bet, not a dominant strategy.
 */
const K = () => SIM_CONFIG.sequels;

/** The saga a game belongs to, from its first entry to this one. */
export function sagaOf(state: GameState, p: Project): Project[] {
  const chain: Project[] = [p];
  let cur = p;
  for (let i = 0; i < 50 && cur.sequelOf; i++) {
    const prev = state.projects.find((q) => q.id === cur.sequelOf);
    if (!prev) break;
    chain.unshift(prev);
    cur = prev;
  }
  return chain;
}

/** Why a released game can't have a sequel now (null = it can). */
export function sequelBlock(state: GameState, orig: Project | undefined): string | null {
  if (!orig || !orig.result) return 'sequel_not_released';
  if (orig.result.averageScore < K().minScore) return 'sequel_no_fans';
  if (state.projects.some((q) => q.sequelOf === orig.id)) return 'sequel_exists';
  return null;
}

/** 0..1: how many players are waiting for more (the original's score and its sales). */
export function fansOf(orig: Project): number {
  const r = orig.result;
  if (!r) return 0;
  const byScore = Math.max(0, Math.min(1, (r.averageScore - K().minScore + 0.5) / 2.5));
  const bySales = Math.min(1, r.totalUnits / K().fullFansUnits);
  return byScore * (0.6 + 0.4 * bySales);
}

/** Saga fatigue: entry number n (1 = original) → share of the fans that still come. */
export function sagaFatigue(entry: number): number {
  return entry <= 2 ? 1 : Math.pow(K().fatigue, entry - 2);
}

/** Starting a sequel: fans, a known world, and the original as the bar to beat. */
export function startSequel(state: GameState, p: Project, orig: Project): void {
  p.sequelOf = orig.id;
  const entry = sagaOf(state, orig).length + 1;
  const fans = fansOf(orig) * sagaFatigue(entry);
  p.sequelFans = Math.round(fans * 1000) / 1000;
  p.hype += K().hype * fans;
  p.requiredPoints = Math.round(p.requiredPoints * (1 - K().reuse));
}

/** At release: the critics' verdict against the original (signed effect on every review). */
export function sequelVerdict(state: GameState, p: Project, base: number): { amount: number; key: string | null } {
  const orig = state.projects.find((q) => q.id === p.sequelOf);
  if (!orig?.result) return { amount: 0, key: null };
  const bar = orig.result.averageScore;
  // Fans expect at least as much as the original: anything below it is a letdown.
  if (base < bar) return { amount: -Math.min(K().letdownMax, (bar - base) * K().letdown), key: 'factor.sequel_letdown' };
  if (base >= bar + K().margin) return { amount: K().surpass, key: 'factor.sequel_better' };
  return { amount: 0, key: null };
}

/** Sales: the original's players who come back for more (launch weeks only). */
export function sequelReach(p: Project): number {
  return 1 + K().audience * (p.sequelFans ?? 0);
}

/** A memory for the saga: the second entry, and every third one after. */
export function rememberSequel(state: GameState, p: Project): void {
  if (!p.sequelOf || !p.result) return;
  const saga = sagaOf(state, p);
  const better = p.result.averageScore >= (saga[saga.length - 2]?.result?.averageScore ?? 0);
  remember(state, `saga:${p.id}`, 'saga', { key: better ? 'memory.saga_better' : 'memory.saga_worse', params: { game: p.name, first: saga[0]!.name, n: saga.length } }, { tone: better ? 1 : -1, projectId: p.id });
}
