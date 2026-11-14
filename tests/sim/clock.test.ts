import { describe, expect, it } from 'vitest';
import { Game, SimClock } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import type { Command } from '../../src/sim/commands';

const startCmds: Command[] = [
  { type: 'setup_founder', name: 'Ana', companyName: 'Ana Games', appearance: DEFAULT_APPEARANCE },
  { type: 'start_project', name: 'Test', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 30, price: 9.99 },
];

/**
 * Plays a full project driving the sim only through frames of `frameMs`.
 * Decisions are answered whenever the game auto-pauses, like a player would.
 */
function playWithFrames(frameMs: number, seed = 5) {
  const game = new Game(createNewGame(seed), 10);
  for (const c of startCmds) game.dispatch(c);
  game.clock.setSpeed(4);
  const released = () => game.state.projects[0]!.phase === 'released';
  for (let guard = 0; guard < 100000 && !released(); guard++) {
    const d = game.state.pendingDecision;
    if (d) {
      game.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'big_idea' ? 'approve' : 'release' });
      if (!released()) game.clock.setSpeed(4);
      continue;
    }
    game.frame(frameMs);
  }
  return game;
}

describe('SimClock', () => {
  it('paused clock produces no ticks', () => {
    const c = new SimClock(100);
    expect(c.consume(10_000)).toBe(0);
  });
  it('speed multiplies ticks', () => {
    const c1 = new SimClock(100);
    c1.setSpeed(1);
    const c8 = new SimClock(100);
    c8.setSpeed(8);
    expect(c1.consume(1000)).toBe(10);
    expect(c8.consume(1000)).toBe(64); // capped at maxTicksPerFrame
    const c4 = new SimClock(100);
    c4.setSpeed(4);
    expect(c4.consume(1000)).toBe(40);
  });
  it('accumulates fractional frames', () => {
    const c = new SimClock(100);
    c.setSpeed(1);
    let n = 0;
    for (let i = 0; i < 60; i++) n += c.consume(1000 / 60);
    expect(n).toBe(10);
  });
});

describe('frame-rate independence', () => {
  it('different FPS produce identical state', () => {
    const states = [1000 / 120, 1000 / 60, 1000 / 30, 100, 250].map((ms) => JSON.stringify(playWithFrames(ms).state));
    expect(JSON.parse(states[0]!).projects[0].phase).toBe('released');
    for (const s of states) expect(s).toBe(states[0]);
  });
  it('pause stops simulated time', () => {
    const game = new Game(createNewGame(1), 10);
    for (const c of startCmds) game.dispatch(c);
    game.clock.setSpeed(1);
    game.frame(500);
    const tick = game.state.tick;
    game.clock.setSpeed(0);
    for (let i = 0; i < 100; i++) game.frame(16);
    expect(game.state.tick).toBe(tick);
    game.clock.setSpeed(2);
    game.frame(100);
    expect(game.state.tick).toBe(tick + 20);
  });
  it('decisive events auto-pause the clock', () => {
    const game = new Game(createNewGame(3), 10);
    for (const c of startCmds) game.dispatch(c);
    game.clock.setSpeed(8);
    for (let i = 0; i < 2000 && !game.state.pendingDecision; i++) game.frame(50);
    expect(game.state.pendingDecision).not.toBeNull();
    expect(game.clock.speed).toBe(0);
  });
});

it('3000 ms at 120 FPS yields exactly 300 ticks of 10 ms', () => {
  const c = new SimClock(10);
  c.setSpeed(1);
  let n = 0;
  for (let i = 0; i < 360; i++) n += c.consume(1000 / 120);
  expect(n).toBe(300);
});
