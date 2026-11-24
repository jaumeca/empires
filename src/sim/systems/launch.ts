import type { GameState, Project } from '../model/state';

/**
 * How a launch feels (block 5, D-063): the same score means different things
 * for a first game, a studio with hits behind it, or an ambitious bet.
 *  - flop: below 5 (still a story: a lesson for the next one).
 *  - ok: an honest launch.
 *  - surprise: better than anything the studio had done (≥ 7 and > its best by ≥ 0.8).
 *  - hit: 8 or more.
 */
export type LaunchTier = 'flop' | 'ok' | 'surprise' | 'hit';

export function launchTier(state: GameState, p: Project): LaunchTier {
  const score = p.result?.averageScore ?? 0;
  if (score >= 8) return 'hit';
  if (score < 5) return 'flop';
  const before = state.projects.filter((q) => q.id !== p.id && q.result && q.result.releasedDay <= (p.result?.releasedDay ?? 0)).map((q) => q.result!.averageScore);
  const best = before.length ? Math.max(...before) : 6;
  return score >= 7 && score >= best + 0.8 ? 'surprise' : 'ok';
}
