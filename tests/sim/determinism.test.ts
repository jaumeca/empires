import { describe, expect, it } from 'vitest';
import { autoplay } from '../../src/sim/autoplay';
import { Game } from '../../src/sim/game';
import { createNewGame } from '../../src/sim/state';

describe('determinism', () => {
  it('same seed + same decisions => identical results', () => {
    const plan = { seed: 123, bigIdea: 'approve' as const, atDeadline: 'extend7' as const };
    const a = autoplay(plan);
    const b = autoplay(plan);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
  it('different seeds give different (but valid) outcomes', () => {
    const a = autoplay({ seed: 1 });
    const b = autoplay({ seed: 2 });
    expect(JSON.stringify(a.state)).not.toBe(JSON.stringify(b.state));
    for (const r of [a, b]) {
      expect(r.score).toBeGreaterThanOrEqual(1);
      expect(r.score).toBeLessThanOrEqual(10);
    }
  });
  it('replaying the command log reproduces the game exactly', () => {
    const original = autoplay({ seed: 77, bigIdea: 'simple', pace: 'crunch' });
    const replay = new Game(createNewGame(77));
    for (const { tick, cmd } of original.game.commandLog) replay.schedule(tick, cmd);
    while (replay.state.tick < original.state.tick) replay.tick();
    expect(JSON.stringify(replay.state)).toBe(JSON.stringify(original.state));
  });
});
