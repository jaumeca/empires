import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { canPlace } from '../../src/sim/systems/office';
import { mixPenalty } from '../../src/sim/systems/project';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { Project, Role, Rot } from '../../src/sim/model/state';

/** AW.E.2 — who does what: specialists, testers and the work mix. Headless, deterministic. */
function teamGame(seed: number, roles: [Role, Role] = ['auto', 'auto']) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  const s = g.state;
  s.company.money = 60000;
  s.contracts.completed = 1;
  let bought = false;
  for (let z = 0; z < s.office.d && !bought; z++)
    for (let x = 0; x < s.office.w && !bought; x++)
      for (const rot of [0, 1, 2, 3] as Rot[])
        if (!bought && !canPlace(s.office, 'desk_basic', x, z, rot)) bought = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
  s.hiring.candidates.push({ id: 'H-r', name: 'Bea', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
  expect(g.dispatch({ type: 'hire', candidateId: 'H-r' }).ok).toBe(true);
  s.empirians[0]!.skills.tech = 5; s.empirians[0]!.skills.design = 5;
  s.eventLog.lastDay = 1e9; // isolate the roles mechanic from random story events
  s.empirians.forEach((e, i) => expect(g.dispatch({ type: 'set_role', empirianId: e.id, role: roles[i]! }).ok).toBe(true));
  return g;
}
function play(g: Game, focus = 0.5, size: 'small' | 'medium' = 'small', days = 42) {
  g.dispatch({ type: 'start_project', name: 'R', topicId: 'pirates', size, focus, budget: 1500, days, price: 9.99 });
  const pid = g.state.activeProjectId!;
  let productionTicks = 0;
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) {
      const pref = d.kind === 'deadline' ? 'release' : d.kind === 'exhausted' ? 'rest' : d.options[d.options.length - 1]!.id;
      g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((o) => o.id === pref) ? pref : d.options[0]!.id });
    } else {
      if (getProject(g.state, pid)!.phase === 'production') productionTicks++;
      g.tick();
    }
  }
  return { p: getProject(g.state, pid)!, productionTicks };
}
const SEEDS = [31, 32, 33, 34, 35, 36];
const avg = (roles: [Role, Role], f: (r: ReturnType<typeof play>) => number, focus = 0.5, size: 'small' | 'medium' = 'small', days = 42) =>
  SEEDS.reduce((a, seed) => a + f(play(teamGame(seed, roles), focus, size, days)), 0) / SEEDS.length;
const score = (r: ReturnType<typeof play>) => r.p.result!.averageScore;

describe('roles (AW.E.2)', () => {
  it('set_role validates input and auto is the default (no field stored)', () => {
    const g = teamGame(1);
    const e = g.state.empirians[1]!;
    expect(e.role).toBeUndefined();
    expect(g.dispatch({ type: 'set_role', empirianId: 'nobody', role: 'code' })).toEqual({ ok: false, error: 'unknown_empirian' });
    expect(g.dispatch({ type: 'set_role', empirianId: e.id, role: 'boss' as Role })).toEqual({ ok: false, error: 'unknown_role' });
    expect(g.dispatch({ type: 'set_role', empirianId: e.id, role: 'test' }).ok).toBe(true);
    expect(e.role).toBe('test');
    g.dispatch({ type: 'set_role', empirianId: e.id, role: 'auto' });
    expect('role' in e).toBe(false);
  });

  it('a balanced split of specialists builds faster than everyone on auto', () => {
    const auto = avg(['auto', 'auto'], (r) => r.productionTicks);
    const split = avg(['design', 'code'], (r) => r.productionTicks);
    expect(split).toBeLessThan(auto);
  });

  it('a tester pays off in a tight, bigger game but not in a roomy small one (no dominant role)', () => {
    expect(avg(['auto', 'test'], score, 0.5, 'medium', 56)).toBeGreaterThan(avg(['auto', 'auto'], score, 0.5, 'medium', 56) + 0.2);
    expect(avg(['auto', 'test'], score)).toBeLessThan(avg(['auto', 'auto'], score));
  });

  it('a tester means fewer bugs ship, at the cost of a slower build', () => {
    const autoBugs = avg(['auto', 'auto'], (r) => r.p.bugs.hidden + r.p.bugs.known);
    const testBugs = avg(['auto', 'test'], (r) => r.p.bugs.hidden + r.p.bugs.known);
    expect(testBugs).toBeLessThan(autoBugs);
    expect(avg(['auto', 'test'], (r) => r.productionTicks)).toBeGreaterThan(avg(['auto', 'auto'], (r) => r.productionTicks));
  });

  it('everyone on code for a design-heavy game loses quality (no dominant role)', () => {
    const balanced = avg(['auto', 'auto'], (r) => r.p.result!.averageScore, 0.3);
    const allCode = avg(['code', 'code'], (r) => r.p.result!.averageScore, 0.3);
    expect(allCode).toBeLessThan(balanced - 0.3);
    expect(mixPenalty({ workDone: { tech: 100, design: 0 }, focus: 0.3 } as Project)).toBeGreaterThan(1);
    expect(mixPenalty({ workDone: { tech: 30, design: 70 }, focus: 0.3 } as Project)).toBe(0);
  });

  it('if everyone is a tester, somebody still builds the game', () => {
    const { p } = play(teamGame(5, ['test', 'test']));
    expect(p.phase).toBe('released');
  });

  it('roles are deterministic and saved', () => {
    const run = () => JSON.stringify(play(teamGame(9, ['code', 'test'])).p);
    expect(run()).toBe(run());
    const g = teamGame(9, ['design', 'test']);
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.empirians.map((e) => e.role)).toEqual(['design', 'test']);
  });
});
