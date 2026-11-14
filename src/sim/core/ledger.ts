import type { GameState, LedgerEntry } from '../model/state';

export function newId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return id;
}

/** Records a causal ledger entry and returns its id. */
export function record(
  state: GameState,
  entry: Omit<LedgerEntry, 'id' | 'tick' | 'day'>,
): string {
  const id = newId(state, 'L');
  state.ledger.push({ id, tick: state.tick, day: state.day, ...entry });
  return id;
}

export function getEntry(state: GameState, id: string): LedgerEntry | undefined {
  return state.ledger.find((e) => e.id === id);
}

export function entriesFor(state: GameState, projectId: string, kinds?: string[]): LedgerEntry[] {
  return state.ledger.filter(
    (e) => e.projectId === projectId && (!kinds || kinds.includes(e.kind)),
  );
}
