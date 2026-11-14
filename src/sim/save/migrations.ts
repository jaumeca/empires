/**
 * Chain of save migrations: MIGRATIONS[n] converts a schema-n state into schema n+1.
 * Never change the save format without adding a migration and a test (CLAUDE.md).
 *
 * Schema 0 was the pre-release prototype shape used during F1 development:
 * money lived at the root (`money`) and there was no `topicTrends` / `setupComplete`.
 * It is kept as a real example of how migrations work.
 */
type AnyState = Record<string, unknown>;

export const MIGRATIONS: Record<number, (s: AnyState) => AnyState> = {
  0: (s) => {
    const { money, companyName, ...rest } = s as AnyState & { money?: number; companyName?: string };
    return {
      ...rest,
      schemaVersion: 1,
      company: { name: companyName ?? 'Mi Estudio', money: money ?? 0, reputation: 30 },
      topicTrends: (rest.topicTrends as AnyState | undefined) ?? {},
      setupComplete: true,
      pendingDecision: rest.pendingDecision ?? null,
      activeProjectId: rest.activeProjectId ?? null,
    };
  },
};
