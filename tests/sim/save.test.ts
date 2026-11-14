import { readFileSync } from 'node:fs';
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
    expect(() => deserialize('{"format":"other"}')).toThrow(/not_empires/);
    const tampered = good.replace('"money":8000', '"money":999999');
    expect(() => deserialize(tampered)).toThrow(/corrupted/);
    const future = JSON.parse(good);
    future.schemaVersion = 999;
    expect(() => deserialize(JSON.stringify(future))).toThrow(/too_new/);
  });
  it('migrates a schema-0 save', () => {
    const s1 = createNewGame(3) as unknown as Record<string, unknown>;
    const { company, topicTrends, setupComplete, ...rest } = s1 as Record<string, any>;
    void topicTrends;
    void setupComplete;
    const v0 = { ...rest, schemaVersion: 0, money: 1234, companyName: 'Old Co' };
    const file = { format: 'empires-save', schemaVersion: 0, gameVersion: 'old', savedAt: '', checksum: checksum(JSON.stringify(v0)), state: v0 };
    const migrated = deserialize(JSON.stringify(file));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.company.money).toBe(1234);
    expect(migrated.company.name).toBe('Old Co');
    void company;
  });
});

describe('schema 1 → 2 migration (real saves produced by the pre-i18n build)', () => {
  it('migrates a finished game: ledger and reviews become TextRefs, outlets become ids', () => {
    const st = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    expect(st.schemaVersion).toBe(2);
    for (const e of st.ledger) expect(typeof e.text.key).toBe('string');
    const r = st.projects[0]!.result!;
    expect(r.reviews.map((x) => x.outlet)).toEqual(['pixelpost', 'tecla', 'bitacora', 'arcade']);
    expect(r.reviews[0]!.quote.key).toBe('legacy.text');
    expect(String(r.reviews[0]!.quote.params?.text).length).toBeGreaterThan(3);
  });
  it('migrates a game with a pending decision and keeps playing deterministically', () => {
    const st = deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8'));
    const d = st.pendingDecision!;
    expect(d.text.key).toBe('legacy.text');
    expect(d.options.every((o) => typeof o.label.key === 'string' && o.hints.every((h) => typeof h.key === 'string'))).toBe(true);
    const a = new Game(st);
    const b = new Game(deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8')));
    for (const g of [a, b]) {
      expect(g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: 'approve' }).ok).toBe(true);
      for (let i = 0; i < 400; i++) g.tick();
    }
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
});
