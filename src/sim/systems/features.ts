import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import type { GameState, Project } from '../model/state';
import { FEATURE_SLOTS, FEATURES, getFeature, type FeatureDef } from '../../content/features';
import { SIM_CONFIG } from '../config';

/**
 * Features and prototypes (AW.D.1/D.2, builds on F3.2). Choosing features adds
 * work, bugs and a hidden technical risk in exchange for quality (if they fit
 * the topic) or reach (more players). A prototype costs time and money and
 * reveals the risks while they are still cheap to fix — or confirms the idea.
 * Risks are decided deterministically from the seed (no stream is consumed).
 */
export const FEATURE_CFG = {
  /** A feature added mid-production costs this much more work than if planned (D-058). */
  lateWork: 1.3,
  /** Extra days when adding it with more time, and the interest lost by moving the date. */
  lateDelayDays: 7,
  lateDelayHype: 0.9,
  prototypeWork: 0.04,
  prototypeCost: 200,
  /** Extra work to fix a troubled feature: found early (prototype) vs late. */
  fixEarly: 0.25,
  fixLate: 0.8,
  /** Shipping a troubled feature as it is. */
  troublePenalty: 0.6,
  troubleBugs: 1.15,
  /** Cutting an announced feature disappoints a little. */
  cutHype: 0.85,
  /** A prototype that finds no problem validates the idea. */
  validatedBonus: 0.15,
  /** Each extra feature adds a bit less (attention is limited). */
  diminishing: 0.35,
  /** Progress at which an unprototyped problem shows up. */
  discoverAt: 0.35,
} as const;

const base = (p: Project) => SIM_CONFIG.work.requiredPoints[p.size] ?? p.requiredPoints;

/** Deterministic number in [0,1) from the game seed, a project and a feature. */
export function hashUnit(seed: number, a: string, b: string): number {
  let h = 2166136261 ^ seed;
  for (const ch of `${a}|${b}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Why a feature can't be chosen now (null = available). */
export function featureLock(state: GameState, f: FeatureDef, size: string): string | null {
  if (f.minSize === 'medium' && size !== 'medium') return 'too_small';
  const u = f.unlock;
  if (!u) return null;
  const released = state.projects.filter((p) => p.phase === 'released').length;
  if (u.released !== undefined && released < u.released) return 'needs_releases';
  if (u.reputation !== undefined && state.company.reputation < u.reputation) return 'needs_reputation';
  const founder = state.empirians.find((e) => e.id === state.founderId)!;
  if (u.tech !== undefined && Math.max(...state.empirians.map((e) => e.skills.tech), founder.skills.tech) < u.tech) return 'needs_tech';
  return null;
}

export function activeFeatures(p: Project): FeatureDef[] {
  return (p.features ?? []).filter((id) => !(p.featureDropped ?? []).includes(id)).map((id) => getFeature(id)!).filter(Boolean);
}

/** Quality the features add (or take away) to the ceiling. */
export function featureCeiling(p: Project): number {
  const act = activeFeatures(p);
  let sum = 0;
  for (const f of act) sum += f.appeal * (0.5 + 0.5 * (f.fit[p.topicId] ?? 0));
  sum *= act.length ? 1 / (1 + FEATURE_CFG.diminishing * (act.length - 1)) : 0;
  sum -= (p.featureIgnored ?? []).length * FEATURE_CFG.troublePenalty;
  if (p.prototypeValidated) sum += FEATURE_CFG.validatedBonus;
  return sum;
}

/** Sales multiplier from features that let more people play. */
export function featureReach(p: Project): number {
  return 1 + activeFeatures(p).reduce((a, f) => a + f.reach, 0);
}

/** Validates and applies the plan at project start. Returns an error code or null. */
export function setupFeatures(state: GameState, p: Project, ids: string[], prototype: boolean, causeId: string): string | null {
  const unique = [...new Set(ids)];
  if (unique.length > (FEATURE_SLOTS[p.size] ?? 2)) return 'too_many_features';
  const defs: FeatureDef[] = [];
  for (const id of unique) {
    const f = getFeature(id);
    if (!f) return 'unknown_feature';
    const lock = featureLock(state, f, p.size);
    if (lock) return `feature_${lock}`;
    defs.push(f);
  }
  if (prototype && state.company.money < FEATURE_CFG.prototypeCost) return 'not_enough_money';
  p.features = unique;
  p.featureTrouble = defs.filter((f) => hashUnit(state.seed, p.id, f.id) < f.risk).map((f) => f.id);
  p.requiredPoints = Math.round(p.requiredPoints + base(p) * defs.reduce((a, f) => a + f.work, 0) + (prototype ? base(p) * FEATURE_CFG.prototypeWork : 0));
  const complexity = defs.reduce((a, f) => a + f.complexity, 0);
  if (complexity > 0) p.bugRateMods.push({ factor: 1 + complexity, causeId });
  if (prototype) {
    p.prototype = true;
    state.company.money -= FEATURE_CFG.prototypeCost;
    p.spent += FEATURE_CFG.prototypeCost;
  }
  return null;
}

/** Called every working hour: a prototype with no problems validates the idea when the concept ends. */
export function featuresTick(state: GameState, p: Project, emit: EventSink): void {
  if (!p.prototype || p.prototypeDone || p.phase === 'concept') return;
  const open = (p.featureTrouble ?? []).filter((id) => !(p.featureDropped ?? []).includes(id));
  if (open.length) return; // the prototype_result moment handles it
  p.prototypeDone = true;
  p.prototypeValidated = true;
  record(state, { kind: 'decision', text: { key: 'ledger.prototype.validated', params: { project: p.name } }, causes: [], tone: 1, projectId: p.id });
  emit({ type: 'prototype_validated', projectId: p.id, severity: 'info' });
}

/** Troubled features not yet dealt with. */
export function openTrouble(p: Project): string[] {
  const done = new Set([...(p.featureDropped ?? []), ...(p.featureResolved ?? []), ...(p.featureIgnored ?? [])]);
  return (p.featureTrouble ?? []).filter((id) => !done.has(id));
}

export function fixTrouble(p: Project, early: boolean): void {
  for (const id of openTrouble(p)) {
    p.requiredPoints = Math.round(p.requiredPoints + base(p) * getFeature(id)!.work * (early ? FEATURE_CFG.fixEarly : FEATURE_CFG.fixLate));
    p.featureResolved = [...(p.featureResolved ?? []), id];
  }
}

export function cutTrouble(p: Project, early: boolean): void {
  for (const id of openTrouble(p)) {
    // Early: nothing built yet, the whole share goes away. Late: half was already spent.
    p.requiredPoints = Math.round(p.requiredPoints - base(p) * getFeature(id)!.work * (early ? 1 : 0.5));
    p.featureDropped = [...(p.featureDropped ?? []), id];
    if (!early) p.hype *= FEATURE_CFG.cutHype;
  }
}

export function ignoreTrouble(p: Project, causeId: string): void {
  for (const id of openTrouble(p)) p.featureIgnored = [...(p.featureIgnored ?? []), id];
  p.bugRateMods.push({ factor: FEATURE_CFG.troubleBugs, causeId });
}

/**
 * Mid-production scope idea (F3.2 / D-058): the feature someone would add now,
 * if any. A free slot, unlocked, not already in the plan; the best fit for the
 * topic — or, when the topic is trending, one that reaches more players.
 */
export function scopeCandidate(state: GameState, p: Project, trending: boolean): FeatureDef | null {
  if (activeFeatures(p).length + (p.featureDropped ?? []).length >= (FEATURE_SLOTS[p.size] ?? 2)) return null;
  const taken = new Set([...(p.features ?? []), ...(p.featureDropped ?? [])]);
  const value = (f: FeatureDef) => f.appeal * (0.5 + 0.5 * (f.fit[p.topicId] ?? 0)) + (trending ? f.reach * 2 : 0);
  const options = FEATURES.filter((f) => !taken.has(f.id) && !featureLock(state, f, p.size) && ((f.fit[p.topicId] ?? 0) >= 0.5 || (trending && f.reach >= 0.15)));
  return options.sort((a, b) => value(b) - value(a) || (a.id < b.id ? -1 : 1))[0] ?? null;
}

/** Adds a feature during production: late changes cost more work than planned ones. */
export function addFeatureLate(state: GameState, p: Project, f: FeatureDef, causeId: string): void {
  p.features = [...(p.features ?? []), f.id];
  p.requiredPoints = Math.round(p.requiredPoints + base(p) * f.work * FEATURE_CFG.lateWork);
  if (f.complexity > 0) p.bugRateMods.push({ factor: 1 + f.complexity, causeId });
  // Its hidden risk is the same as if it had been planned (deterministic).
  if (hashUnit(state.seed, p.id, f.id) < f.risk) p.featureTrouble = [...(p.featureTrouble ?? []), f.id];
}
