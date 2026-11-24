/**
 * Chain of save migrations: MIGRATIONS[n] converts a schema-n state into schema n+1.
 * Never change the save format without adding a migration and a test (CLAUDE.md).
 *
 * Schema 0 was the pre-release prototype shape used during F1 development:
 * money lived at the root (`money`) and there was no `topicTrends` / `setupComplete`.
 * It is kept as a real example of how migrations work.
 */
import { reachedUnlocks } from '../systems/progress';
import type { GameState } from '../model/state';
import { createStartingOffice } from '../systems/office';
import { createWorld } from '../systems/world';
import { createRngState } from '../core/rng';

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
  /** 3 → 4 (LS.2): the bedroom becomes a catalog-based office with the same furniture. */
  3: (s) => {
    let uid = 0;
    return { ...s, schemaVersion: 4, office: createStartingOffice(() => `I-start-${++uid}`) };
  },
  /** 4 → 5 (LS.5): the world (Empires Daily) starts calm; its own random stream is derived from the seed. */
  4: (s) => {
    const rng = { ...(s.rng as AnyState), world: createRngState(s.seed as number, 'world') };
    return { ...s, schemaVersion: 5, rng, world: createWorld() };
  },
  /** 5 → 6 (LS.7): dynamic events start with nothing scheduled. */
  5: (s) => ({ ...s, schemaVersion: 6, scheduled: [], eventLog: { lastDay: null, lastByKind: {} } }),
  /** 6 → 7 (LS.8): no contracts yet; the first offers arrive in a few days. */
  6: (s) => ({ ...s, schemaVersion: 7, contracts: { offers: [], active: null, nextRefreshDay: (s.day as number) + 3, completed: 0 } }),
  /** 7 → 8 (GT.1): still a solo founder; applicants start arriving soon (own random stream). */
  7: (s) => {
    const rng = { ...(s.rng as AnyState), hiring: createRngState(s.seed as number, 'hiring') };
    return { ...s, schemaVersion: 8, rng, hiring: { candidates: [], nextRefreshDay: (s.day as number) + 1, hired: 0, salariesPaid: 0 } };
  },
  /** 8 → 9 (ML.2/ML.3): the studio starts remembering. Past releases and hires become memories on the next day. */
  8: (s) => ({
    ...s,
    schemaVersion: 9,
    story: {
      memories: [{ id: 'M-founded', day: 1, kind: 'founded', text: { key: 'memory.founded', params: { company: (s.company as AnyState).name } }, tone: 1, fact: 'founded', empirianIds: [s.founderId] }],
      achievements: {},
      scannedTick: s.tick,
      seenReleases: [],
    },
  }),
  /**
   * 9 → 10 (AW.A): tutorial. Players who already created a game don't get it
   * (they can start it from Help); games still at the start do.
   */
  9: (s) => {
    const projects = (s.projects as unknown[]).length;
    const veteran = !!s.setupComplete && projects > 0;
    return { ...s, schemaVersion: 10, tutorial: { active: !veteran, marks: [], base: { projects: 0, released: 0, decisions: 0, purchases: 0 } } };
  },
  // v11 (D-062): progressive unlocks. Everything an older save already reached
  // (or used) is unlocked silently — nothing is ever taken away.
  10: (s) => ({ ...s, schemaVersion: 11, progress: { seen: reachedUnlocks(s as unknown as GameState), days: {} } }),
  // v12 (GT.6, D-064): products after launch. No maintenance job yet; the products unlock
  // is announced normally when reached (it is a new feature, not something taken away).
  11: (s) => ({ ...s, schemaVersion: 12, support: null }),
};
