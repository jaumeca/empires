import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { IDEA_BONUS, IDEA_GAP, IDEA_MAX, ideaFits, inspirationDay } from '../../src/sim/systems/inspiration';
import { unlockAll } from '../../src/sim/systems/progress';
import type { Inspiration } from '../../src/sim/model/state';
import { SIM_CONFIG } from '../../src/sim/config';

/** 0.19.0 (D-068): ideas that come from the people and the history of the studio. */
function studio(seed = 3) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  return g;
}
const err = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);
const startCmd = (over: Record<string, unknown> = {}) => ({ type: 'start_project' as const, name: 'X', topicId: 'kart', size: 'small' as const, focus: 0.6, budget: 500, days: 35, price: 9.99, ...over });

describe('ideas from the team', () => {
  it('a hit inspires a sequel; a flop teaches a lesson — once per game', () => {
    const g = studio();
    const s = g.state;
    s.projects.push({ id: 'P-h', name: 'Faro', topicId: 'pirates', phase: 'released', result: { releasedDay: s.day, averageScore: 8.4 } } as never);
    inspirationDay(s, () => {});
    expect(s.company.inspirations!.map((i) => [i.source, i.topicId])).toEqual([['sequel', 'pirates']]);
    s.day += IDEA_GAP;
    inspirationDay(s, () => {});
    expect(s.company.inspirations!.filter((i) => i.source === 'sequel').length).toBe(1);
    s.projects.push({ id: 'P-f', name: 'Ups', topicId: 'kart', phase: 'released', result: { releasedDay: s.day, averageScore: 4.2 } } as never);
    inspirationDay(s, () => {});
    expect(s.company.inspirations!.some((i) => i.source === 'lesson')).toBe(true);
  });

  it('few and spaced out: never more than 3 waiting, at most one every few days', () => {
    const g = studio(9);
    const s = g.state;
    s.empirians[0]!.trait = 'curious';
    const days: number[] = [];
    for (let d = 0; d < 400; d++) {
      const before = s.company.inspirations?.length ?? 0;
      const last = s.company.lastIdeaDay;
      s.day += 1;
      inspirationDay(s, () => {});
      if (s.company.lastIdeaDay !== last) days.push(s.day);
      expect(s.company.inspirations?.length ?? 0).toBeLessThanOrEqual(IDEA_MAX);
      expect((s.company.inspirations?.length ?? 0) - before).toBeLessThanOrEqual(1);
    }
    expect(days.length).toBeGreaterThan(3);
    for (let i = 1; i < days.length; i++) expect(days[i]! - days[i - 1]!).toBeGreaterThanOrEqual(IDEA_GAP);
  });

  it('nothing before the studio knows how to plan (progression)', () => {
    const g = new Game(createNewGame(4));
    g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
    g.state.empirians[0]!.trait = 'curious';
    for (let d = 0; d < 60; d++) { g.state.day += 1; inspirationDay(g.state, () => {}); }
    expect(g.state.company.inspirations ?? []).toEqual([]);
  });

  it('an idea only helps a game that follows it, and is used up', () => {
    const g = studio();
    const s = g.state;
    const idea: Inspiration = { id: 'I-1', day: 1, kind: 'combo', source: 'chat', topicId: 'pirates', featureId: 'story', by: s.founderId };
    s.company.inspirations = [idea];
    expect(ideaFits(idea, { topicId: 'kart', features: ['story'] })).toBe(false);
    expect(err(g.dispatch(startCmd({ ideaId: 'I-1', topicId: 'kart' })))).toBe('idea_not_fit');
    expect(s.activeProjectId).toBeNull(); // nothing changed
    expect(g.dispatch(startCmd({ ideaId: 'I-1', topicId: 'pirates', features: ['story'] })).ok).toBe(true);
    const p = getProject(s, s.activeProjectId!)!;
    expect(p.ceilingMods.some((m) => m.amount === IDEA_BONUS)).toBe(true);
    expect(p.requiredPoints).toBeGreaterThan(SIM_CONFIG.work.requiredPoints.small!); // a bit more ambitious: more work
    expect(s.company.inspirations).toEqual([]);
  });

  it('a lesson fits any game; ideas are optional (a game without one starts normally)', () => {
    const g = studio();
    g.state.company.inspirations = [{ id: 'I-2', day: 1, kind: 'polish', source: 'lesson', by: g.state.founderId }];
    expect(g.dispatch(startCmd()).ok).toBe(true);
    expect(g.state.company.inspirations!.length).toBe(1); // still waiting for another game
  });
});
