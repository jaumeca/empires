import type { EventSink } from '../core/events';
import type { GameState, UnlockId } from '../model/state';
import { remember } from './story';
import { OFFICE_SIZES } from '../../content/officeSizes';
import { getItemDef } from './office';

/**
 * Progression (D-062, docs/PROGRESSION.md): the studio starts small and the
 * game reveals its systems as real milestones are reached. Nothing is removed;
 * only WHEN it is presented changes. Each unlock is permanent once reached
 * (stored in `state.progress.seen`) and is also granted by evidence that the
 * player already used it (old saves never lose anything).
 */
export const UNLOCKS: readonly UnlockId[] = ['equipment', 'planning', 'newspaper', 'contracts', 'team', 'studio', 'expansion'];

const released = (s: GameState) => s.projects.filter((p) => p.phase === 'released').length;
const bought = (s: GameState, cats: string[]) => s.office.items.some((it) => cats.includes(getItemDef(it.defId).category) && !['pc_basic', 'chair_basic'].includes(it.defId))
  || s.office.items.some((it) => (it.mounts?.computer && it.mounts.computer !== 'pc_basic') || (it.mounts?.chair && it.mounts.chair !== 'chair_basic'));

/** The milestone (or evidence of use) behind each unlock. */
const MET: Record<UnlockId, (s: GameState) => boolean> = {
  equipment: (s) => s.projects.some((p) => p.phase !== 'concept') || bought(s, ['computer', 'chair', 'creative']),
  planning: (s) => released(s) >= 1 || s.projects.some((p) => (p.features ?? []).length > 0),
  newspaper: (s) => released(s) >= 1,
  contracts: (s) => s.projects.some((p) => (p.result?.weeklySales.length ?? 0) >= 1) || s.contracts.completed > 0 || !!s.contracts.active,
  team: (s) => released(s) >= 2 || s.contracts.completed >= 1 || (released(s) >= 1 && s.company.money >= 15000) || s.hiring.hired > 0 || s.empirians.length > 1,
  studio: (s) => released(s) >= 2 || s.projects.some((p) => p.size === 'medium' || p.prototype),
  expansion: (s) => released(s) >= 4 || (s.office.size ?? 'room') !== 'room' || (s.empirians.length - 1 >= OFFICE_SIZES.room.maxEmployees && (s.hiring.hired > 0)),
};

export function unlocked(state: GameState, id: UnlockId): boolean {
  return (state.progress?.seen ?? []).includes(id) || MET[id](state);
}

/** Unlocks already reached, without announcing them (new progress for older saves). */
export function reachedUnlocks(state: GameState): UnlockId[] {
  return UNLOCKS.filter((id) => MET[id](state));
}

/** Days an unlock shows its "new" dot. */
export const NEW_DAYS = 3;
export function isFresh(state: GameState, id: UnlockId): boolean {
  const d = state.progress?.days?.[id];
  return d !== undefined && state.day - d < NEW_DAYS;
}

/**
 * Called every tick: announce what has just been unlocked — never while a
 * decision is pending (it waits), once, remembered in the Story.
 */
export function progressTick(state: GameState, emit: EventSink): void {
  if (!state.setupComplete || state.pendingDecision) return;
  const p = (state.progress ??= { seen: [], days: {} });
  for (const id of UNLOCKS) {
    if (p.seen.includes(id) || !MET[id](state)) continue;
    p.seen = [...p.seen, id];
    p.days = { ...(p.days ?? {}), [id]: state.day };
    remember(state, `unlock:${id}`, 'unlock', { key: `memory.unlock.${id}` }, { tone: 1 }, emit);
    emit({ type: 'unlock', unlockId: id, severity: 'important' });
  }
}

/** Tests/debug: open every unlock (as an experienced studio would have). */
export function unlockAll(state: GameState): void {
  state.progress = { seen: [...UNLOCKS], days: { ...(state.progress?.days ?? {}) } };
}
