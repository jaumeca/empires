import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { SIM_CONFIG } from '../../src/sim/config';
import { productsWeek, supportWork, updateBlock } from '../../src/sim/systems/products';
import { unlockAll, unlocked } from '../../src/sim/systems/progress';
import { MIGRATIONS } from '../../src/sim/save/migrations';
import type { GameState, Project } from '../../src/sim/model/state';

/** GT.6 (D-064): products after launch — patches, content updates, later life. */
function released(seed = 7) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state);
  g.dispatch({ type: 'start_project', name: 'Isla', topicId: 'kart', size: 'small', focus: 0.6, budget: 1000, days: 35, price: 9.99 });
  const id = g.state.activeProjectId!;
  run(g, () => !!g.state.activeProjectId);
  return { g, p: getProject(g.state, id)! };
}
const err = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}
function run(g: Game, cond: () => boolean, max = 40000) {
  for (let i = 0; i < max && cond(); i++) step(g);
}
const days = (g: Game, n: number) => { const end = g.state.day + n; run(g, () => g.state.day < end); };

describe('patches (GT.6)', () => {
  it('fix every bug left, keep the score, and cost real working time', () => {
    const { g, p } = released();
    p.bugs.hidden = 6; p.bugs.known = 2;
    const score = p.result!.averageScore;
    const rep = g.state.company.reputation;
    const money = g.state.company.money;
    expect(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'patch' }).ok).toBe(true);
    // One job at a time: no new game or contract meanwhile.
    expect(err(g.dispatch({ type: 'start_project', name: 'X', topicId: 'kart', size: 'small', focus: 0.6, budget: 0, days: 35, price: 9.99 }))).toBe('support_in_progress');
    const start = g.state.day;
    run(g, () => !!g.state.support);
    expect(g.state.day - start).toBeGreaterThanOrEqual(1);
    expect(p.bugs.hidden + p.bugs.known).toBe(0);
    expect(p.result!.averageScore).toBe(score); // nothing erases the launch
    expect(g.state.company.reputation).toBeGreaterThanOrEqual(rep);
    expect(p.result!.support!.patches).toBe(1);
    // No magic money: the studio kept paying its costs while it worked.
    expect(g.state.company.money).toBeLessThan(money + p.result!.revenue);
    expect(err(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'patch' }))).toBe('no_bugs');
  });

  it('a bigger mess takes longer to patch', () => {
    const { p } = released();
    p.bugs.hidden = 2; p.bugs.known = 0;
    const small = supportWork(p, 'patch');
    p.bugs.hidden = 12;
    expect(supportWork(p, 'patch')).toBeGreaterThan(small);
  });
});

describe('content updates (GT.6)', () => {
  it('bring a retired game back on sale, each one weaker and costlier, at most two', () => {
    const { g, p } = released(11);
    p.result!.averageScore = 7.4;
    p.result!.salesEnded = true;
    const w0 = supportWork(p, 'update');
    expect(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'update' }).ok).toBe(true);
    run(g, () => !!g.state.support);
    expect(p.result!.salesEnded).toBe(false);
    const f1 = p.result!.updateWave!.strength;
    expect(f1).toBe(1);
    expect(supportWork(p, 'update')).toBeGreaterThan(w0);
    expect(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'update' }).ok).toBe(true);
    run(g, () => !!g.state.support);
    expect(p.result!.updateWave!.strength).toBeCloseTo(SIM_CONFIG.products.updateDiminishing, 5);
    expect(err(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'update' }))).toBe('updated_enough');
  });

  it('only for games with an audience, and not forever', () => {
    const { g, p } = released(12);
    p.result!.averageScore = 5.5;
    expect(updateBlock(g.state, p)).toBe('no_audience');
    p.result!.averageScore = 7;
    p.result!.releasedDay = g.state.day - SIM_CONFIG.products.updateMaxAgeDays - 1;
    expect(updateBlock(g.state, p)).toBe('too_old');
  });

  it('pays, but is not a money machine: extra sales below half of the launch campaign', () => {
    for (const seed of [21, 22, 23, 24, 25, 26]) {
      const life = (update: boolean) => {
        const { g, p } = released(seed);
        days(g, 7 * 12); // launch weeks over
        // Eligible for content (an audience), whatever the launch was like.
        p.result!.averageScore = Math.max(p.result!.averageScore, SIM_CONFIG.products.updateMinScore);
        const before = p.result!.revenue;
        if (update) { g.dispatch({ type: 'start_support', projectId: p.id, kind: 'update' }); run(g, () => !!g.state.support); }
        days(g, 7 * 12);
        return { before, after: p.result!.revenue };
      };
      const a = life(false), b = life(true);
      const extra = b.after - a.after;
      expect(extra, `seed ${seed}`).toBeGreaterThan(0); // not a hollow option
      expect(extra, `seed ${seed}`).toBeLessThan(b.before * 0.5);
    }
  });
});

describe('later life (GT.6)', () => {
  it('quiet happenings: one per product, spaced out, deterministic', () => {
    const { g, p } = released(31);
    const s = g.state;
    p.result!.averageScore = 7.5;
    p.result!.releasedDay = s.day - 200;
    const before = s.ledger.length;
    for (let d = 0; d < 400; d++) { s.day += 1; productsWeek(s, () => {}); }
    const notes = s.ledger.slice(before).filter((l) => l.text.key.startsWith('ledger.product.'));
    expect(notes.length).toBeLessThanOrEqual(1); // one product → at most one happening
    // Same seed, same story.
    const { g: g2, p: p2 } = released(31);
    p2.result!.averageScore = 7.5; p2.result!.releasedDay = g2.state.day - 200;
    for (let d = 0; d < 400; d++) { g2.state.day += 1; productsWeek(g2.state, () => {}); }
    expect(p2.result!.happening).toBe(p.result!.happening);
  });

  it('abandoning a buggy game is noticed (only if nobody patched it)', () => {
    const { g, p } = released(41);
    const s = g.state;
    p.bugs.hidden = 12; p.result!.averageScore = 6.6; p.result!.salesEnded = false; p.result!.releasedDay = s.day - 150;
    p.bugReported = false;
    for (let d = 0; d < 300 && !p.result!.happening; d++) { s.day += 1; productsWeek(s, () => {}); }
    expect(['abandoned', 'community']).toContain(p.result!.happening);
  });
});

describe('progression and saves (GT.6)', () => {
  it('unlocks with two games out, one past its launch weeks', () => {
    const { g, p } = released(51);
    g.state.progress = { seen: [], days: {} };
    expect(unlocked(g.state, 'products')).toBe(false);
    const second = { ...p, id: 'P-b', result: { ...p.result!, weeklySales: Array(SIM_CONFIG.market.salesWeeks).fill(10) } } as Project;
    g.state.projects.push(second);
    expect(unlocked(g.state, 'products')).toBe(true);
    // Locked: the command refuses.
    g.state.projects.pop();
    expect(err(g.dispatch({ type: 'start_support', projectId: p.id, kind: 'patch' }))).toBe('locked');
  });

  it('v11 saves load without a maintenance job', () => {
    const { g } = released(61);
    const old = JSON.parse(JSON.stringify(g.state)) as Record<string, unknown>;
    old.schemaVersion = 11;
    delete old.support;
    const s = MIGRATIONS[11]!(old) as unknown as GameState;
    expect(s.schemaVersion).toBe(12);
    expect(s.support).toBeNull();
  });
});
