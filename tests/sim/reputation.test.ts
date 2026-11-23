import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unlockAll } from '../../src/sim/systems/progress';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { bugTolerance, clientTerms, fame, fameOf, fameWeek, noteFame, startingHype } from '../../src/sim/systems/reputation';
import { acceptContract } from '../../src/sim/systems/contracts';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';

/** F3.8 / D-059 — a track record from real facts: recoverable, capped, remembered in the Story. */
const noop = () => {};
const K = SIM_CONFIG.fame;
function g0(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state); // these tests are about the mechanic, not about when it unlocks (D-062)
  g.state.eventLog.lastDay = 1e9; g.state.company.money = 30000;
  return g;
}
function game(g: Game, topic: string, days: number, pace?: 'crunch') {
  g.dispatch({ type: 'start_project', name: 'X', topicId: topic, size: 'small', focus: topic === 'kart' ? 0.7 : 0.45, budget: 1500, days, price: 9.99 });
  if (pace) g.dispatch({ type: 'adjust_project', pace });
  const pid = g.state.activeProjectId!;
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) { const pref = d.kind === 'deadline' ? 'release' : d.kind === 'polish_plan' ? (pace ? 'polish' : 'balanced') : d.kind === 'big_idea' ? 'keep' : d.kind === 'exhausted' ? (pace ? 'push' : 'rest') : d.kind === 'scope_idea' ? 'keep' : d.options[d.options.length - 1]!.id; g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((x) => x.id === pref) ? pref : d.options[0]!.id }); }
    else g.tick();
  }
  return getProject(g.state, pid)!;
}

describe('reputation with memory (F3.8 / D-059)', () => {
  it('starts neutral; old saves load neutral', () => {
    const g = g0();
    expect(fameOf(g.state)).toMatchObject({ quality: 0, reliability: 0, innovation: 0 });
    const old = deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8'));
    expect(fameOf(old).quality).toBe(0);
    expect(bugTolerance(old)).toBe(1);
  });

  it('a buggy flop hurts the quality record; good games afterwards recover it (no permanent punishment)', () => {
    const g = g0(41);
    const flop = game(g, 'kart', 18, 'crunch');
    expect(flop.result!.averageScore).toBeLessThan(5);
    const low = fameOf(g.state).quality;
    expect(low).toBeLessThan(-1.5);
    game(g, 'pirates', 42); game(g, 'robots', 42); game(g, 'kart', 42);
    expect(fameOf(g.state).quality).toBeGreaterThan(low + 2);
    expect(fameOf(g.state).quality).toBeGreaterThan(-1.5); // back to neutral or better
  });

  it('reaching a bad name and climbing out of it are remembered in the Story', () => {
    const g = g0();
    for (let i = 0; i < 3; i++) noteFame(g.state, 'reliability', -10, noop);
    expect(g.state.story.memories.some((m) => m.text.key === 'memory.fame.reliability.poor' && m.tone < 0)).toBe(true);
    for (let i = 0; i < 6; i++) noteFame(g.state, 'reliability', 6, noop);
    expect(g.state.story.memories.some((m) => m.text.key === 'memory.fame.reliability.recovered' && m.tone > 0)).toBe(true);
  });

  it('never piles up: bounded at ±10 and slowly forgotten', () => {
    const g = g0();
    for (let i = 0; i < 50; i++) noteFame(g.state, 'quality', 50, noop);
    expect(fameOf(g.state).quality).toBeLessThanOrEqual(10);
    const top = fameOf(g.state).quality;
    for (let w = 0; w < 52; w++) fameWeek(g.state);
    expect(fameOf(g.state).quality).toBeLessThan(top * 0.6);
    expect(fameOf(g.state).quality).toBeGreaterThan(0);
  });

  it('a fact only moves the record in its own direction', () => {
    const g = g0();
    g.state.company.fame = { quality: -8, reliability: 8, innovation: 0 };
    noteFame(g.state, 'quality', -2, noop); // a small new bug doesn't "improve" a bad name
    noteFame(g.state, 'reliability', 3, noop); // a decent delivery doesn't spoil a great name
    expect(fameOf(g.state).quality).toBe(-8);
    expect(fameOf(g.state).reliability).toBe(8);
    noteFame(g.state, 'quality', 6, noop); // but a good game starts the recovery
    expect(fameOf(g.state).quality).toBeGreaterThan(-8);
  });

  it('effects are moderate and capped', () => {
    const g = g0();
    for (const a of ['quality', 'reliability', 'innovation'] as const) g.state.company.fame = { ...fameOf(g.state), [a]: 10 };
    expect(bugTolerance(g.state)).toBeCloseTo(1 - K.bugTolerance, 5);
    expect(startingHype(g.state, 2)).toBeCloseTo(1 + K.trustHype + K.innovationHype, 5);
    expect(clientTerms(g.state).pay).toBeCloseTo(1 + K.clientPay, 5);
    g.state.company.fame = { quality: -10, reliability: -10, innovation: -10 };
    expect(bugTolerance(g.state)).toBeCloseTo(1 + K.bugTolerance, 5);
    expect(startingHype(g.state, 0)).toBeGreaterThanOrEqual(K.minHype);
    expect(clientTerms(g.state).slack).toBeCloseTo(1 - K.clientSlack, 5);
    expect(fame(g.state, 'quality')).toBe(-1);
  });

  it('the same buggy game is judged more kindly by a studio known for quality', () => {
    const score = (q: number) => { const g = g0(7); g.state.company.fame = { quality: q, reliability: 0, innovation: 0 }; return game(g, 'kart', 18, 'crunch').result!.averageScore; };
    expect(score(10)).toBeGreaterThan(score(-10));
  });

  it('repeating the same topic with nothing new reads as repetitive; new topics and features as innovative', () => {
    const same = g0(42); for (let i = 0; i < 4; i++) game(same, 'kart', 42);
    const varied = g0(42); for (const t of ['kart', 'pirates', 'robots', 'cooking']) game(varied, t, 42);
    expect(fameOf(same.state).innovation).toBeLessThan(-1.5);
    expect(fameOf(varied.state).innovation).toBeGreaterThan(fameOf(same.state).innovation + 3);
  });

  it('clients remember: late contracts mean lower pay and less room in the next offers', () => {
    const reliable = g0(5); const late = g0(5);
    reliable.state.company.fame = { quality: 0, reliability: 8, innovation: 0 };
    late.state.company.fame = { quality: 0, reliability: -8, innovation: 0 };
    reliable.state.contracts.nextRefreshDay = 0; late.state.contracts.nextRefreshDay = 0;
    for (let i = 0; i < 8; i++) { reliable.tick(); late.tick(); }
    const a = reliable.state.contracts.offers[0]!; const b = late.state.contracts.offers[0]!;
    expect(a.payment).toBeGreaterThan(b.payment);
    expect(a.days).toBeGreaterThanOrEqual(b.days);
    // Delivering late lowers a neutral record (and never improves a bad one).
    late.state.company.fame = { quality: 0, reliability: 0, innovation: 0 };
    expect(acceptContract(late.state, b.id)).toBeNull();
    const before = fameOf(late.state).reliability;
    late.state.contracts.active!.dueDay = late.state.day; // already due
    for (let i = 0; i < 8 * 40 && late.state.contracts.active; i++) late.tick();
    expect(fameOf(late.state).reliability).toBeLessThan(before);
  });

  it('deterministic and saved', () => {
    const run = () => { const g = g0(9); game(g, 'kart', 42); return JSON.stringify(g.state.company.fame); };
    expect(run()).toBe(run());
    const g = g0(9); game(g, 'kart', 42);
    expect(deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' })).company.fame).toEqual(g.state.company.fame);
  });
});
