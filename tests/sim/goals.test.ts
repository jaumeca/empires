import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { nextGoal } from '../../src/sim/systems/goals';
import { launchTier } from '../../src/sim/systems/launch';
import type { Project } from '../../src/sim/model/state';

/** Block 1.3 (next natural goal) and block 5 (how a launch feels), D-063. */
function g0(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  return g;
}
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}

describe('next goal (block 1.3)', () => {
  it('follows the real state: create, finish, sell, improve…', () => {
    const g = g0(3);
    expect(nextGoal(createNewGame(1))).toBeNull(); // nothing before the studio exists
    expect(nextGoal(g.state)!.id).toBe('first_game');
    g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    expect(nextGoal(g.state)!.id).toBe('finish_first');
    expect(nextGoal(g.state)!.text.params!.name).toBe('Isla');
    for (let i = 0; i < 40000 && g.state.activeProjectId; i++) step(g);
    expect(nextGoal(g.state)!.id).toBe('first_sales');
    for (let i = 0; i < 8 * 8; i++) step(g);
    expect(['better_pc', 'good_review', 'first_contract']).toContain(nextGoal(g.state)!.id);
  });

  it('never points at something still locked, and goes quiet when everything is done', () => {
    const g = g0(4);
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    for (let i = 0; i < 40000 && g.state.activeProjectId; i++) step(g);
    for (let i = 0; i < 8 * 10; i++) step(g);
    const id = nextGoal(g.state)!.id;
    expect(['first_hire', 'medium_game', 'expand']).not.toContain(id); // team/studio/expansion are not unlocked yet
  });
});

describe('launch tiers (block 5)', () => {
  const p = (score: number, day = 100, id = 'P-x') => ({ id, result: { averageScore: score, releasedDay: day } }) as unknown as Project;
  it('flop, ok, surprise and hit depend on the score and on what the studio had done', () => {
    const s = g0().state;
    expect(launchTier(s, p(4.5))).toBe('flop');
    expect(launchTier(s, p(6.2))).toBe('ok');
    expect(launchTier(s, p(7.2))).toBe('surprise'); // first game well above the usual
    expect(launchTier(s, p(8.4))).toBe('hit');
    s.projects.push(p(7.3, 50, 'P-old'));
    expect(launchTier(s, p(7.4))).toBe('ok'); // not a surprise for a studio that already did this well
  });
  it('a real first game gets a tier', () => {
    const g = g0(5);
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    const id = g.state.activeProjectId!;
    for (let i = 0; i < 40000 && g.state.activeProjectId; i++) step(g);
    expect(['flop', 'ok', 'surprise', 'hit']).toContain(launchTier(g.state, getProject(g.state, id)!));
  });
});
