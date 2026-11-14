import { describe, expect, it } from 'vitest';
import { autoplay } from '../../src/sim/autoplay';
import { Game } from '../../src/sim/game';
import { deserialize, SaveError, serialize, checksum } from '../../src/sim/save/save';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';

const meta = { gameVersion: 'test', savedAt: '2026-01-01T00:00:00Z' };

describe('save / load', () => {
  it('round-trip preserves the exact state', () => {
    const { state } = autoplay({ seed: 9, bigIdea: 'approve' });
    expect(deserialize(serialize(state, meta))).toEqual(state);
  });
  it('a loaded game continues exactly like the original', () => {
    const a = new Game(createNewGame(11));
    a.dispatch({ type: 'setup_founder', name: 'X', companyName: 'X', appearance: DEFAULT_APPEARANCE });
    a.dispatch({ type: 'start_project', name: 'P', topicId: 'pirates', size: 'small', focus: 0.4, budget: 800, days: 40, price: 9.99 });
    for (let i = 0; i < 100; i++) a.tick();
    const b = new Game(deserialize(serialize(a.state, meta)));
    for (let i = 0; i < 100; i++) {
      a.tick();
      b.tick();
    }
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
  });
  it('rejects corrupted, foreign and future files with clear errors', () => {
    const good = serialize(createNewGame(1), meta);
    expect(() => deserialize('not json')).toThrow(SaveError);
    expect(() => deserialize('{"format":"other"}')).toThrow(/No es una partida/);
    const tampered = good.replace('"money":8000', '"money":999999');
    expect(() => deserialize(tampered)).toThrow(/dañada/);
    const future = JSON.parse(good);
    future.schemaVersion = 999;
    expect(() => deserialize(JSON.stringify(future))).toThrow(/más nueva/);
  });
  it('migrates a schema-0 save', () => {
    const s1 = createNewGame(3) as unknown as Record<string, unknown>;
    const { company, topicTrends, setupComplete, ...rest } = s1 as Record<string, any>;
    void topicTrends;
    void setupComplete;
    const v0 = { ...rest, schemaVersion: 0, money: 1234, companyName: 'Old Co' };
    const file = { format: 'empires-save', schemaVersion: 0, gameVersion: 'old', savedAt: '', checksum: checksum(JSON.stringify(v0)), state: v0 };
    const migrated = deserialize(JSON.stringify(file));
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.company.money).toBe(1234);
    expect(migrated.company.name).toBe('Old Co');
    void company;
  });
});
