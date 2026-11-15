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
  /**
   * 1 → 2 (i18n): player-facing sentences became TextRefs. Old Spanish sentences
   * are kept verbatim through the `legacy.text` key; review outlets become ids.
   */
  1: (s) => {
    const legacy = (v: unknown) => (typeof v === 'string' ? { key: 'legacy.text', params: { text: v } } : v);
    const outletIds: Record<string, string> = { PixelPost: 'pixelpost', 'Tecla Crítica': 'tecla', 'Bitácora Lúdica': 'bitacora', 'Modo Arcade': 'arcade' };
    const ledger = ((s.ledger as AnyState[] | undefined) ?? []).map((e) => ({ ...e, text: legacy(e.text) }));
    const projects = ((s.projects as AnyState[] | undefined) ?? []).map((p) => {
      const r = p.result as AnyState | undefined;
      if (!r) return p;
      const reviews = ((r.reviews as AnyState[] | undefined) ?? []).map((rv) => ({ ...rv, outlet: outletIds[rv.outlet as string] ?? rv.outlet, quote: legacy(rv.quote) }));
      return { ...p, result: { ...r, reviews } };
    });
    let pendingDecision = s.pendingDecision as AnyState | null;
    if (pendingDecision) {
      pendingDecision = {
        ...pendingDecision,
        text: legacy(pendingDecision.text),
        options: ((pendingDecision.options as AnyState[]) ?? []).map((o) => ({ ...o, label: legacy(o.label), hints: ((o.hints as unknown[]) ?? []).map(legacy) })),
      };
    }
    return { ...s, schemaVersion: 2, ledger, projects, pendingDecision };
  },
  /**
   * 2 → 3 (LS.1, founder experience): Empirians get creativity/management,
   * starting levels, empty experience and no topic specialization yet.
   */
  2: (s) => {
    const empirians = ((s.empirians as AnyState[] | undefined) ?? []).map((e) => {
      const old = (e.skills as Record<string, number> | undefined) ?? {};
      const skills = { tech: old.tech ?? 5, design: old.design ?? 5, creativity: old.creativity ?? 5, management: old.management ?? 5 };
      return { ...e, skills, baseSkills: { ...skills }, xp: { tech: 0, design: 0, creativity: 0, management: 0 }, topicXp: {} };
    });
    return { ...s, schemaVersion: 3, empirians };
  },
};
