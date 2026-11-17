import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { currentStep, stepDone, TUTORIAL_STEPS } from '../../src/sim/systems/tutorial';
import { canPlace } from '../../src/sim/systems/office';
import { checksum, deserialize, serialize } from '../../src/sim/save/save';
import type { Rot } from '../../src/sim/model/state';

/** AW.A — tutorial progress lives in the game and follows real facts. */
function newGame(seed = 1) {
  return new Game(createNewGame(seed));
}
function setup(g: Game) {
  g.dispatch({ type: 'setup_founder', name: 'Ada', companyName: 'Nest', appearance: DEFAULT_APPEARANCE });
}
function runUntil(g: Game, cond: () => boolean, max = 30000) {
  for (let i = 0; i < max && !cond(); i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
    else g.tick();
  }
}
const mark = (g: Game, step: string) => expect(g.dispatch({ type: 'tutorial', action: 'mark', step }).ok).toBe(true);
function buySomething(g: Game) {
  for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) if (!canPlace(g.state.office, 'plant_small', x, z, 0 as Rot)) return g.dispatch({ type: 'buy_item', defId: 'plant_small', x, z, rot: 0 });
  return { ok: false };
}

describe('tutorial (AW.A)', () => {
  it('a full first session completes every step, in order, from real actions', () => {
    const g = newGame(3);
    expect(currentStep(g.state)).toBe('founder');
    setup(g);
    expect(currentStep(g.state)).toBe('meet');
    mark(g, 'meet');
    mark(g, 'speed');
    expect(currentStep(g.state)).toBe('first_game');
    g.dispatch({ type: 'start_project', name: 'Uno', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    expect(currentStep(g.state)).toBe('progress');
    mark(g, 'progress');
    runUntil(g, () => stepDone(g.state, 'decision'));
    expect(currentStep(g.state)).toBe('release');
    runUntil(g, () => !g.state.activeProjectId);
    expect(currentStep(g.state)).toBe('reviews');
    mark(g, 'reviews');
    expect(currentStep(g.state)).toBe('decorate');
    g.state.company.money += 1000;
    expect(buySomething(g).ok).toBe(true);
    expect(currentStep(g.state)).toBe('story');
    mark(g, 'story');
    expect(currentStep(g.state)).toBe('hiring');
    expect(g.dispatch({ type: 'tutorial', action: 'finish' })).toEqual({ ok: false, error: 'tutorial_not_done' });
    mark(g, 'hiring');
    expect(currentStep(g.state)).toBeNull();
    expect(g.dispatch({ type: 'tutorial', action: 'finish' }).ok).toBe(true);
    expect(g.state.tutorial.active).toBe(false);
    expect(g.state.tutorial.finishedDay).toBe(g.state.day);
  });

  it('doing things on your own is recognised (no need to repeat them)', () => {
    const g = newGame(4);
    setup(g);
    g.state.company.money += 1000;
    buySomething(g);
    g.dispatch({ type: 'start_project', name: 'Uno', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    // Still asked to meet the founder first, but the game and the purchase already count.
    expect(currentStep(g.state)).toBe('meet');
    expect(stepDone(g.state, 'first_game')).toBe(true);
    expect(stepDone(g.state, 'decorate')).toBe(true);
    mark(g, 'meet');
    mark(g, 'speed');
    expect(currentStep(g.state)).toBe('progress');
  });

  it('can be skipped from the very beginning, and unknown marks are rejected', () => {
    const g = newGame(5);
    expect(g.dispatch({ type: 'tutorial', action: 'skip' }).ok).toBe(true);
    expect(currentStep(g.state)).toBeNull();
    expect(g.dispatch({ type: 'tutorial', action: 'mark', step: 'first_game' })).toEqual({ ok: false, error: 'unknown_step' });
    expect(g.dispatch({ type: 'tutorial', action: 'mark', step: 'nope' }).ok).toBe(false);
  });

  it('restarting keeps the game and asks for new actions (not old ones)', () => {
    const g = newGame(6);
    setup(g);
    g.dispatch({ type: 'tutorial', action: 'skip' });
    g.dispatch({ type: 'start_project', name: 'Uno', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    runUntil(g, () => !g.state.activeProjectId);
    const before = JSON.stringify({ projects: g.state.projects, money: g.state.company.money });
    g.dispatch({ type: 'tutorial', action: 'restart' });
    expect(JSON.stringify({ projects: g.state.projects, money: g.state.company.money })).toBe(before);
    expect(currentStep(g.state)).toBe('meet');
    mark(g, 'meet');
    mark(g, 'speed');
    expect(currentStep(g.state)).toBe('first_game'); // the old game doesn't count again
  });

  it('progress survives save/load mid-tutorial', () => {
    const g = newGame(7);
    setup(g);
    mark(g, 'meet');
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(JSON.stringify(back.tutorial)).toBe(JSON.stringify(g.state.tutorial));
    expect(currentStep(back)).toBe('speed');
  });

  it('older saves: veterans are not shown the tutorial; games still at the start are', () => {
    for (const f of ['save-v1-released.empires', 'save-v1-pending-decision.empires']) {
      const s = deserialize(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8'));
      expect(s.tutorial.active).toBe(false);
      expect(currentStep(s)).toBeNull();
    }
    const g = newGame(8);
    setup(g);
    const v9 = JSON.parse(serialize(g.state, { gameVersion: '0.6.0', savedAt: 'x' }));
    delete v9.state.tutorial;
    v9.state.schemaVersion = 9;
    v9.schemaVersion = 9;
    v9.checksum = checksum(JSON.stringify(v9.state));
    const s = deserialize(JSON.stringify(v9));
    expect(s.tutorial.active).toBe(true);
    expect(currentStep(s)).toBe('meet');
    expect(TUTORIAL_STEPS).toHaveLength(11);
  });
});
