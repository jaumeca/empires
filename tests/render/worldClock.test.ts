import { describe, expect, it } from 'vitest';
import { WorldClock } from '../../src/render/worldClock';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';

describe('pause freezes the world (ML.1)', () => {
  it('world time stops while paused and resumes from the same instant', () => {
    const w = new WorldClock();
    w.advance(0.016, 1);
    w.advance(0.016, 4);
    const at = w.time;
    for (let i = 0; i < 100; i++) expect(w.advance(0.25, 0)).toBe(0);
    expect(w.time).toBe(at);
    expect(w.paused).toBe(true);
    w.advance(0.016, 1);
    expect(w.time).toBeCloseTo(at + 0.016, 10); // no jump on resume
    expect(w.paused).toBe(false);
  });

  it('a paused game does not advance time, money, energy, projects or salaries, at any frame length', () => {
    const g = new Game(createNewGame(4));
    g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1500, days: 42, price: 9.99 });
    g.clock.setSpeed(8);
    g.frame(2000);
    g.clock.setSpeed(0);
    const before = JSON.stringify(g.state);
    for (const ms of [16, 250, 1000, 60_000]) g.frame(ms);
    expect(JSON.stringify(g.state)).toBe(before);
    g.clock.setSpeed(1);
    g.frame(1000);
    expect(g.state.tick).toBeGreaterThan(JSON.parse(before).tick);
  });
});
