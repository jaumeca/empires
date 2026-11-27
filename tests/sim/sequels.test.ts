import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { unlockAll } from '../../src/sim/systems/progress';
import { fansOf, sagaFatigue, sagaOf, sequelBlock, sequelReach, sequelVerdict } from '../../src/sim/systems/sequels';
import { SIM_CONFIG } from '../../src/sim/config';
import { serialize, deserialize } from '../../src/sim/save/save';
import type { Project } from '../../src/sim/model/state';

/** 0.23.0 (D-073): sequels and sagas. */
const K = SIM_CONFIG.sequels;
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}
function newGame(seed = 5) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  g.state.company.money = 50000;
  return g;
}
const plan = (name: string, extra: Record<string, unknown> = {}) => ({ type: 'start_project' as const, name, topicId: 'kart', size: 'small' as const, focus: 0.6, budget: 1500, days: 42, price: 9.99, ...extra });
function make(g: Game, name: string, extra: Record<string, unknown> = {}): Project {
  const r = g.dispatch(plan(name, extra));
  expect(r.ok, r.ok ? '' : r.error).toBe(true);
  const id = g.state.activeProjectId!;
  for (let i = 0; i < 40000 && g.state.activeProjectId; i++) step(g);
  return getProject(g.state, id)!;
}

describe('starting a sequel', () => {
  it('only of a released game people liked, once, in its world', () => {
    const g = newGame();
    const orig = make(g, 'Turbo');
    orig.result!.averageScore = 5.9;
    expect(sequelBlock(g.state, orig)).toBe('sequel_no_fans');
    orig.result!.averageScore = 7.6;
    expect(sequelBlock(g.state, orig)).toBeNull();
    const err = g.dispatch(plan('Turbo 2', { topicId: 'pirates', sequelOf: orig.id }));
    expect(err.ok ? null : err.error).toBe('sequel_topic');
    expect(g.dispatch(plan('Turbo 2', { sequelOf: orig.id })).ok).toBe(true);
    expect(sequelBlock(g.state, orig)).toBe('sequel_exists');
  });

  it('fans waiting: more starting interest and less work than the same game without being a sequel', () => {
    const a = newGame(); const oa = make(a, 'Turbo'); oa.result!.averageScore = 8; oa.result!.totalUnits = 9000;
    const b = newGame(); const ob = make(b, 'Turbo'); ob.result!.averageScore = 8; ob.result!.totalUnits = 9000;
    a.dispatch(plan('Turbo 2', { sequelOf: oa.id }));
    b.dispatch(plan('Turbo 2'));
    const pa = getProject(a.state, a.state.activeProjectId!)!, pb = getProject(b.state, b.state.activeProjectId!)!;
    expect(pa.hype).toBeGreaterThan(pb.hype + 0.5);
    expect(pa.requiredPoints).toBeLessThan(pb.requiredPoints);
    expect(sequelReach(pa)).toBeGreaterThan(1);
    expect(sequelReach(pb)).toBe(1);
  });

  it('a better original leaves more fans', () => {
    const g = newGame();
    const p = make(g, 'Turbo');
    p.result!.totalUnits = 6000;
    p.result!.averageScore = 6.8; const low = fansOf(p);
    p.result!.averageScore = 8.5; const high = fansOf(p);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });
});

describe('expectations and sagas', () => {
  it('critics compare with the original: a letdown below it, a small bonus above it, nothing in between', () => {
    const g = newGame();
    const orig = make(g, 'Turbo');
    orig.result!.averageScore = 7.5;
    g.dispatch(plan('Turbo 2', { sequelOf: orig.id }));
    const p = getProject(g.state, g.state.activeProjectId!)!;
    expect(sequelVerdict(g.state, p, 6).amount).toBeLessThan(0);
    expect(sequelVerdict(g.state, p, 3).amount).toBeCloseTo(-K.letdownMax, 5); // capped
    expect(sequelVerdict(g.state, p, 7.5).amount).toBe(0);
    expect(sequelVerdict(g.state, p, 8.2).amount).toBeCloseTo(K.surpass, 5);
  });

  it('the verdict reaches the reviews and is explained, with the saga remembered', () => {
    const g = newGame(9);
    const orig = make(g, 'Turbo');
    orig.result!.averageScore = 9.6; // a very high bar: the sequel will fall short
    const seq = make(g, 'Turbo 2', { sequelOf: orig.id });
    const keys = seq.result!.explanation.map((id) => g.state.ledger.find((l) => l.id === id)?.text.key);
    expect(keys).toContain('factor.sequel_letdown');
    expect(g.state.story.memories.some((m) => m.kind === 'saga' && m.projectId === seq.id)).toBe(true);
    expect(sagaOf(g.state, seq).map((p) => p.name)).toEqual(['Turbo', 'Turbo 2']);
  });

  it('saga fatigue: the third entry and later bring fewer fans each time', () => {
    expect(sagaFatigue(2)).toBe(1);
    expect(sagaFatigue(3)).toBeLessThan(1);
    expect(sagaFatigue(5)).toBeLessThan(sagaFatigue(4));
  });

  it('a sequel survives saving and loading (optional fields, no migration)', () => {
    const g = newGame();
    const orig = make(g, 'Turbo');
    orig.result!.averageScore = 7.5;
    g.dispatch(plan('Turbo 2', { sequelOf: orig.id }));
    const back = deserialize(serialize(g.state, { gameVersion: 'test', savedAt: 'now' }));
    const p = getProject(back, back.activeProjectId!)!;
    expect(p.sequelOf).toBe(orig.id);
    expect(p.sequelFans).toBeGreaterThan(0);
  });
});
