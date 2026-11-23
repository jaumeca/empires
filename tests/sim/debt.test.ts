import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { canPlace } from '../../src/sim/systems/office';
import { debtBugs, debtCeiling, debtLevel, debtSpeed, personDebtFactor } from '../../src/sim/systems/debt';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';
import type { Empirian, Project, Rot, TraitId } from '../../src/sim/model/state';

/** F3.4 / D-057 — technical debt: from haste, costly later, partly inherited, paid by refactoring. */
const D = SIM_CONFIG.debt;
type Answers = Record<string, string>;
function studio(seed: number, team: TraitId | null = null) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  const s = g.state;
  s.company.money = 40000; s.contracts.completed = 1; s.eventLog.lastDay = 1e9;
  if (team) {
    let b = false;
    for (let z = 0; z < s.office.d && !b; z++) for (let x = 0; x < s.office.w && !b; x++) for (const rot of [0, 1, 2, 3] as Rot[]) if (!b && !canPlace(s.office, 'desk_basic', x, z, rot)) b = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: 'H', name: 'B', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 4 }, trait: team, salary: 450, expiresDay: 99 });
    expect(g.dispatch({ type: 'hire', candidateId: 'H' }).ok).toBe(true);
  }
  return g;
}
const policy = (d: { kind: string; options: { id: string }[] }, ans: Answers) => {
  const o = ans[d.kind] ?? (d.kind === 'deadline' ? 'release' : d.kind === 'polish_plan' ? 'balanced' : d.kind === 'big_idea' ? 'keep' : d.kind === 'exhausted' ? 'rest' : d.options[d.options.length - 1]!.id);
  return d.options.some((x) => x.id === o) ? o : d.options[0]!.id;
};
function game(g: Game, opts: { days?: number; pace?: 'crunch' | 'relaxed'; ans?: Answers } = {}): Project {
  g.dispatch({ type: 'start_project', name: `G${g.state.projects.length}`, topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: opts.days ?? 42, price: 9.99 });
  if (opts.pace) g.dispatch({ type: 'adjust_project', pace: opts.pace });
  const pid = g.state.activeProjectId!;
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: policy(d, opts.ans ?? {}) });
    else g.tick();
  }
  return getProject(g.state, pid)!;
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEDS = [21, 22, 23, 24, 25, 26];

describe('technical debt (F3.4 / D-057)', () => {
  it('builds up while programming: more in crunch, less relaxed; it has costs', () => {
    const normal = game(studio(1));
    const crunch = game(studio(1), { pace: 'crunch' });
    const relaxed = game(studio(1), { pace: 'relaxed', days: 49 });
    expect(normal.debt).toBeGreaterThan(0);
    expect(crunch.debt!).toBeGreaterThan(normal.debt! * 1.4);
    expect(relaxed.debt!).toBeLessThan(normal.debt!);
    const p = { debt: 40 } as Project;
    expect(debtSpeed(p)).toBeLessThan(1);
    expect(debtBugs(p)).toBeGreaterThan(1);
    expect(debtCeiling(p)).toBeGreaterThan(0);
    // Effects are capped.
    expect(debtSpeed({ debt: 100 } as Project)).toBeCloseTo(1 - D.maxSlowdown, 5);
    expect(debtCeiling({ debt: 100 } as Project)).toBeCloseTo(D.maxCeiling, 5);
    expect(debtLevel(0)).toBe('solid');
    expect(debtLevel(50)).toBe('fragile');
  });

  it('skills, personality and a well-coordinated team influence it moderately', () => {
    const base = { skills: { tech: 5 }, trait: 'curious' } as unknown as Empirian;
    expect(personDebtFactor({ ...base, skills: { ...base.skills, tech: 8 } } as Empirian)).toBeLessThan(personDebtFactor(base));
    expect(personDebtFactor({ ...base, trait: 'perfectionist' } as Empirian)).toBeLessThan(personDebtFactor(base));
    expect(personDebtFactor({ ...base, skills: { ...base.skills, tech: 9.5 } } as Empirian)).toBeGreaterThanOrEqual(0.6);
    // A team on good terms leaves less debt than the same team in tension.
    const make = (b: number) => {
      const g = studio(4, 'curious');
      const [x, y] = g.state.empirians.map((e) => e.id).sort() as [string, string];
      g.state.relations = [{ a: x, b: y, bond: b, days: 0, shared: 0, hits: 0, since: 0 }];
      return game(g, { ans: { tech_shortcut: 'proper' } }).debt!;
    };
    expect(make(80)).toBeLessThan(make(-80));
  });

  it('part of the debt is inherited by the next game, which starts slower and buggier; it is explained', () => {
    const g = studio(2);
    const first = game(g, { pace: 'crunch' });
    expect(g.state.company.techDebt).toBeCloseTo(first.debt! * D.carryShare, 5);
    const carried = g.state.company.techDebt!;
    const second = game(g);
    expect(g.state.ledger.some((l) => l.text.key === 'ledger.debt.inherited' && l.projectId === second.id)).toBe(true);
    // The same second game from a calm studio ends with less debt.
    const c = studio(2);
    game(c, { pace: 'relaxed', days: 49 });
    expect(c.state.company.techDebt ?? 0).toBeLessThan(carried);
    expect(game(c).debt!).toBeLessThan(second.debt!);
  });

  it('a shortcut wins when the game cannot be finished in time, and loses over a series (no dominant answer)', () => {
    const single = (o: string, days: number) => avg(SEEDS.map((s) => game(studio(s, 'curious'), { days, ans: { tech_shortcut: o } }).result!.averageScore));
    expect(single('shortcut', 16)).toBeGreaterThan(single('proper', 16));
    const series = (o: string) => avg(SEEDS.map((s) => { const g = studio(s, 'curious'); const a = game(g, { ans: { tech_shortcut: o } }); const b = game(g, { ans: { tech_shortcut: o } }); return a.result!.averageScore + b.result!.averageScore; }));
    expect(series('shortcut')).toBeLessThan(series('proper'));
  });

  it('a solid base costs work now and saves work in the next game', () => {
    const g = studio(5, 'curious');
    const a = game(g, { ans: { tech_shortcut: 'solid_base' } });
    const h = studio(5, 'curious');
    const a2 = game(h, { ans: { tech_shortcut: 'proper' } });
    expect(a.requiredPoints).toBeGreaterThan(a2.requiredPoints);
    expect(g.state.company.solidBase).toBeTruthy();
    const b = game(g, { ans: { tech_shortcut: 'proper' } });
    const b2 = game(h, { ans: { tech_shortcut: 'proper' } });
    expect(b.requiredPoints).toBeLessThan(b2.requiredPoints);
    expect(g.state.company.solidBase).toBeUndefined(); // used once
    expect(g.state.story.memories.some((m) => m.text.key === 'ledger.moment.tech_shortcut.solid_base')).toBe(true);
  });

  it('the debt review: refactoring costs days and cleans the code; living with it passes it on', () => {
    const run = (o: string) => {
      // Debt piles up over two hurried games: the second one gets the review.
      const g = studio(6);
      game(g, { pace: 'crunch', days: 49, ans: { debt_review: o } });
      const p = game(g, { pace: 'crunch', days: 49, ans: { debt_review: o } });
      return { p, seen: p.decisionsTaken.some((d) => d.startsWith('debt_review')), carry: g.state.company.techDebt ?? 0, g };
    };
    const refactor = run('refactor');
    const live = run('live_with');
    expect(refactor.seen && live.seen).toBe(true);
    expect(refactor.p.debt!).toBeLessThan(live.p.debt!);
    expect(refactor.p.requiredPoints).toBeGreaterThan(live.p.requiredPoints);
    expect(refactor.carry).toBeLessThan(live.carry);
    expect(live.g.state.story.memories.some((m) => m.text.key === 'ledger.moment.debt_review.live_with' && m.tone < 0)).toBe(true);
  });

  it('code questions are raised by the best coder; the founder learns from deciding', () => {
    const g = studio(7, 'curious');
    g.state.empirians[1]!.skills.tech = 9;
    const m0 = g.state.empirians[0]!.xp.management;
    g.dispatch({ type: 'start_project', name: 'Q', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    let speaker = '';
    for (let i = 0; i < 60000 && g.state.activeProjectId && !speaker; i++) {
      const d = g.state.pendingDecision;
      if (d?.kind === 'tech_shortcut') speaker = d.speakerId;
      else if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: policy(d, {}) });
      else g.tick();
    }
    expect(speaker).toBe(g.state.empirians[1]!.id);
    g.dispatch({ type: 'choose_option', decisionId: g.state.pendingDecision!.id, optionId: 'proper' });
    expect(g.state.empirians[0]!.xp.management).toBeGreaterThan(m0);
    // A solo founder is never asked about shortcuts (only the debt review).
    const solo = game(studio(7), { pace: 'crunch' });
    expect(solo.decisionsTaken.some((d) => d.startsWith('tech_shortcut'))).toBe(false);
  });

  it('small solo games stay viable and normal play is barely affected', () => {
    const scores = SEEDS.map((s) => game(studio(s)).result!.averageScore);
    expect(avg(scores)).toBeGreaterThan(5.5);
    expect(Math.max(...SEEDS.map((s) => game(studio(s)).debt!))).toBeLessThan(D.reviewAt);
  });

  it('deterministic, saved, and old saves load with no debt', () => {
    const run = () => { const g = studio(8); game(g, { pace: 'crunch' }); return JSON.stringify([g.state.projects[0]!.debt, g.state.company.techDebt]); };
    expect(run()).toBe(run());
    const g = studio(8);
    game(g, { pace: 'crunch' });
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.company.techDebt).toBe(g.state.company.techDebt);
    expect(back.projects[0]!.debt).toBe(g.state.projects[0]!.debt);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8'));
    expect(old.company.techDebt ?? 0).toBe(0);
  });
});
