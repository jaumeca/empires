import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoplay, autoplayCareer } from '../../src/sim/autoplay';
import { SIM_CONFIG } from '../../src/sim/config';
import { createNewGame } from '../../src/sim/state';
import { gainXp, levelFor, progressToNext, specializations, topicBonus } from '../../src/sim/systems/progression';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { SimEvent } from '../../src/sim/core/events';

describe('founder experience (LS.1)', () => {
  it('levels have diminishing returns and a ceiling', () => {
    const steps = [0, 500, 1000, 1500, 2000].map((xp) => levelFor(5, xp));
    for (let i = 2; i < steps.length; i++) expect(steps[i]! - steps[i - 1]!).toBeLessThan(steps[i - 1]! - steps[i - 2]!);
    expect(levelFor(5, 1e9)).toBeLessThanOrEqual(5 + SIM_CONFIG.progression.gainMax);
    expect(levelFor(9, 1e9)).toBeLessThanOrEqual(SIM_CONFIG.progression.cap);
  });

  it('learning depends on what the founder actually does', () => {
    const tech = autoplay({ seed: 1, focus: 0.95, topicId: 'robots', weeksAfter: 0 }).state.empirians[0]!;
    const design = autoplay({ seed: 1, focus: 0.05, topicId: 'cat-puzzle', weeksAfter: 0 }).state.empirians[0]!;
    expect(tech.xp.tech).toBeGreaterThan(tech.xp.design * 3);
    expect(design.xp.design).toBeGreaterThan(design.xp.tech * 3);
    expect(tech.topicXp.robots).toBeGreaterThan(0);
    expect(tech.topicXp['cat-puzzle'] ?? 0).toBe(0);
    for (const e of [tech, design]) {
      expect(e.xp.creativity).toBeGreaterThan(0); // concept + polish
      expect(e.xp.management).toBeGreaterThan(0); // days managing + decisions + release
    }
  });

  it('a career produces visible but bounded growth, and different strategies give different profiles', () => {
    const techCareer = autoplayCareer(3, 8, () => ({ topicId: 'robots', focus: 0.75 })).game.state.empirians[0]!;
    const designCareer = autoplayCareer(3, 8, () => ({ topicId: 'cat-puzzle', focus: 0.25 })).game.state.empirians[0]!;
    expect(techCareer.skills.tech).toBeGreaterThan(6);
    expect(techCareer.skills.tech).toBeLessThan(8.2);
    expect(techCareer.skills.tech).toBeGreaterThan(designCareer.skills.tech + 0.5);
    expect(designCareer.skills.design).toBeGreaterThan(techCareer.skills.design + 0.5);
    expect(specializations(techCareer)[0]!.topicId).toBe('robots');
    expect(specializations(designCareer)[0]!.topicId).toBe('cat-puzzle');
    expect(topicBonus(techCareer, 'robots')).toBeLessThan(SIM_CONFIG.progression.topicGainMax);
  });

  it('later games benefit from experience (same plan, same topic)', () => {
    // Averaged over seeds (a single career is noisy).
    let early = 0, late = 0;
    for (const seed of [5, 6, 7]) {
      const { scores } = autoplayCareer(seed, 8, () => ({ topicId: 'kart', focus: 0.7 }));
      early += (scores[0]! + scores[1]!) / 6;
      late += (scores[6]! + scores[7]!) / 6;
    }
    expect(late).toBeGreaterThan(early);
    expect(late - early).toBeLessThan(1.8); // no runaway progression (reputation also grows)
  });

  it('announces whole-level gains once and records them', () => {
    const s = createNewGame(1);
    const e = s.empirians[0]!;
    const events: SimEvent[] = [];
    gainXp(s, e, 'tech', 2000, (ev) => events.push(ev));
    gainXp(s, e, 'tech', 1, (ev) => events.push(ev));
    expect(events.filter((x) => x.type === 'skill_up')).toHaveLength(1);
    expect(s.ledger.some((l) => l.kind === 'skill_up')).toBe(true);
    expect(progressToNext(e, 'tech')).toBeGreaterThanOrEqual(0);
    expect(progressToNext(e, 'tech')).toBeLessThanOrEqual(1);
  });

  it('experience survives save/load and old saves get starting values', () => {
    const { state } = autoplay({ seed: 2, weeksAfter: 0 });
    expect(deserialize(serialize(state, { gameVersion: 't', savedAt: 't' }))).toEqual(state);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    const f = old.empirians[0]!;
    expect(f.skills).toEqual({ tech: 5, design: 5, creativity: 5, management: 5 });
    expect(f.xp.tech).toBe(0);
    expect(f.topicXp).toEqual({});
  });
});
