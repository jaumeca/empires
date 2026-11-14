import type { GameState, LedgerEntry } from '../model/state';
import { newId } from '../core/ledger';

/**
 * Long-game history policy (see ARCHITECTURE §14):
 * - The ledger of the active project and of the last HOT_PROJECTS released
 *   projects is kept complete.
 * - Older released projects are compacted: milestone entries (start, decisions,
 *   promises, release) and every entry an explanation cites — transitively —
 *   are kept; routine entries (budget/pace/testing tweaks, phase notes) are
 *   dropped and replaced by one summary entry with the count.
 * - Compaction is part of the deterministic simulation (runs on release), so
 *   replays and saves stay reproducible. Product records (reviews, sales) are
 *   never deleted: they feed the future museum/history (GDD §15).
 */
export const HISTORY = {
  HOT_PROJECTS: 5,
  KEEP_KINDS: new Set(['project_started', 'decision', 'promise', 'released', 'score_factor', 'compacted']),
} as const;

export function compactHistory(state: GameState): number {
  const released = state.projects.filter((p) => p.phase === 'released' && p.result);
  const cold = released.slice(0, Math.max(0, released.length - HISTORY.HOT_PROJECTS));
  let removed = 0;
  for (const p of cold) {
    if (p.historyCompacted) continue;
    p.historyCompacted = true;
    const entries = state.ledger.filter((e) => e.projectId === p.id);
    const byId = new Map(state.ledger.map((e) => [e.id, e] as const));
    const keep = new Set<string>();
    const visit = (id: string) => {
      if (keep.has(id)) return;
      const e = byId.get(id);
      if (!e) return;
      keep.add(id);
      e.causes.forEach(visit);
    };
    for (const e of entries) if (HISTORY.KEEP_KINDS.has(e.kind)) visit(e.id);
    for (const id of p.result?.explanation ?? []) visit(id);
    const drop = entries.filter((e) => !keep.has(e.id));
    if (drop.length === 0) continue;
    const dropIds = new Set(drop.map((e) => e.id));
    state.ledger = state.ledger.filter((e) => !dropIds.has(e.id));
    state.ledger.push(summary(state, p.id, p.name, drop.length));
    removed += drop.length;
  }
  return removed;
}

function summary(state: GameState, projectId: string, name: string, n: number): LedgerEntry {
  return {
    id: newId(state, 'L'),
    tick: state.tick,
    day: state.day,
    kind: 'compacted',
    text: { key: 'ledger.compacted', params: { project: name, entries: n } },
    causes: [],
    tone: 0,
    projectId,
  };
}
