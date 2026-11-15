import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import type { Empirian, GameState, SkillId } from '../model/state';

/**
 * Founder experience (LS.1, D-035). Empirians learn from what they actually do:
 * xp accumulates per activity and converts into a skill level with diminishing
 * returns and a hard ceiling:
 *
 *   level = base + gainMax · (1 − e^(−xp / xpScale))      (never above `cap`)
 *
 * Topic specialization works the same way and adds a small quality bonus for
 * games of that topic. Designed to extend to employees in F4.
 */
export const SKILLS: readonly SkillId[] = ['tech', 'design', 'creativity', 'management'];

const P = () => SIM_CONFIG.progression;

export function levelFor(base: number, xp: number): number {
  const p = P();
  return Math.min(p.cap, base + p.gainMax * (1 - Math.exp(-xp / p.xpScale)));
}

export function topicBonus(e: Empirian, topicId: string): number {
  const xp = e.topicXp?.[topicId] ?? 0;
  return P().topicGainMax * (1 - Math.exp(-xp / P().topicScale));
}

/** Progress (0-1) towards the next whole level, for the UI. */
export function progressToNext(e: Empirian, skill: SkillId): number {
  const lvl = e.skills[skill];
  const next = Math.floor(lvl) + 1;
  const base = e.baseSkills[skill];
  const p = P();
  if (next > Math.min(p.cap, base + p.gainMax)) return 1;
  // xp needed for a level L: xp = −xpScale · ln(1 − (L − base)/gainMax)
  const xpAt = (L: number) => (L <= base ? 0 : -p.xpScale * Math.log(1 - Math.min(0.9999, (L - base) / p.gainMax)));
  const from = xpAt(Math.floor(lvl));
  const to = xpAt(next);
  return Math.max(0, Math.min(1, (e.xp[skill] - from) / Math.max(1e-6, to - from)));
}

/** Adds experience; recomputes the level and announces whole-level gains. */
export function gainXp(state: GameState, e: Empirian, skill: SkillId, amount: number, emit: EventSink): void {
  if (amount <= 0) return;
  const before = e.skills[skill];
  e.xp[skill] += amount;
  e.skills[skill] = levelFor(e.baseSkills[skill], e.xp[skill]);
  const level = Math.floor(e.skills[skill]);
  if (level > Math.floor(before)) {
    record(state, { kind: 'skill_up', text: { key: 'ledger.skill_up', params: { name: e.name, skill, level } }, causes: [], tone: 1 });
    emit({ type: 'skill_up', empirianId: e.id, skill, level, severity: 'important' });
  }
}

export function gainTopicXp(e: Empirian, topicId: string, amount: number): void {
  if (amount <= 0) return;
  e.topicXp[topicId] = (e.topicXp[topicId] ?? 0) + amount;
}

/** Top specializations (topic id + bonus 0..topicGainMax), strongest first. */
export function specializations(e: Empirian, limit = 3): { topicId: string; bonus: number }[] {
  return Object.keys(e.topicXp)
    .map((topicId) => ({ topicId, bonus: topicBonus(e, topicId) }))
    .filter((x) => x.bonus >= 0.05)
    .sort((a, b) => b.bonus - a.bonus)
    .slice(0, limit);
}
