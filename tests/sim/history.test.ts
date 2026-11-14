import { describe, expect, it } from 'vitest';
import { autoplayCareer } from '../../src/sim/autoplay';
import { HISTORY } from '../../src/sim/systems/history';
import { deserialize, serialize } from '../../src/sim/save/save';
import { Game } from '../../src/sim/game';

const policy = (i: number) => ({ bigIdea: (i % 2 ? 'approve' : 'keep') as 'approve' | 'keep', pace: (i % 3 ? 'normal' : 'crunch') as 'normal' | 'crunch', atDeadline: 'extend7' as const });

describe('long games: history and saves', () => {
  const { game } = autoplayCareer(11, 30, (i, s) => {
    // Some player tweaks so there is routine history to archive.
    void s;
    return policy(i);
  });
  const s = game.state;

  it('keeps every explanation and its causes resolvable after compaction', () => {
    const ids = new Set(s.ledger.map((e) => e.id));
    for (const p of s.projects) {
      for (const id of p.result!.explanation) {
        expect(ids.has(id)).toBe(true);
        for (const c of s.ledger.find((e) => e.id === id)!.causes) expect(ids.has(c)).toBe(true);
      }
    }
  });
  it('keeps the last projects complete and marks older ones as compacted', () => {
    const released = s.projects.filter((p) => p.result);
    expect(released.slice(-HISTORY.HOT_PROJECTS).every((p) => !p.historyCompacted)).toBe(true);
    expect(released.slice(0, -HISTORY.HOT_PROJECTS).every((p) => p.historyCompacted)).toBe(true);
  });
  it('keeps product records (reviews, sales) for every project', () => {
    for (const p of s.projects) expect(p.result!.reviews.length).toBe(4);
  });
  it('save size stays small and a long game round-trips exactly', () => {
    const text = serialize(s, { gameVersion: 't', savedAt: 't' });
    expect(text.length / s.projects.length).toBeLessThan(4096); // < 4 KB per product
    expect(deserialize(text)).toEqual(s);
  });
  it('a long game is still deterministic (compaction included)', () => {
    const again = autoplayCareer(11, 30, policy).game.state;
    expect(JSON.stringify(again)).toBe(JSON.stringify(s));
  });
  it('the in-memory command log is capped', () => {
    const g = new Game(s);
    g.commandLogLimit = 10;
    for (let i = 0; i < 25; i++) g.dispatch({ type: 'adjust_project', pace: 'normal' });
    expect(g.commandLog.length).toBeLessThanOrEqual(10);
  });
});
