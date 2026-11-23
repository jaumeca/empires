import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { canPlace } from '../../src/sim/systems/office';
import { ambitionCoordination, ambitionVerdict, indieSpark, profileFor } from '../../src/sim/systems/ambition';
import { acceptContract, cancelContract, clientOf } from '../../src/sim/systems/contracts';
import { SIM_CONFIG } from '../../src/sim/config';
import type { Project, Rot } from '../../src/sim/model/state';

/** D.4 / D-060 — indie, ambitious and client work on the same systems; none dominates. */
const K = SIM_CONFIG.ambition;
const noop = () => {};
function studio(seed: number, hires = 0) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  const s = g.state; s.company.money = 60000; s.contracts.completed = 1; s.eventLog.lastDay = 1e9;
  if (hires > 1) g.dispatch({ type: 'expand_office' });
  for (let i = 0; i < hires; i++) {
    let b = false;
    for (let z = 0; z < s.office.d && !b; z++) for (let x = 0; x < s.office.w && !b; x++) for (const rot of [0, 1, 2, 3] as Rot[]) if (!b && !canPlace(s.office, 'desk_basic', x, z, rot)) b = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: `H${i}`, name: `B${i}`, appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
    expect(g.dispatch({ type: 'hire', candidateId: `H${i}` }).ok).toBe(true);
  }
  return g;
}
type Plan = { size: 'small' | 'medium'; days: number; features: string[]; topic: string; focus: number };
function run(g: Game, plan: Plan) {
  const m0 = g.state.company.money; const d0 = g.state.day;
  expect(g.dispatch({ type: 'start_project', name: 'X', topicId: plan.topic, size: plan.size, focus: plan.focus, budget: plan.size === 'medium' ? 3000 : 1000, days: plan.days, price: plan.size === 'medium' ? 14.99 : 9.99, features: plan.features }).ok).toBe(true);
  const pid = g.state.activeProjectId!;
  for (let i = 0; i < 80000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) { const pref = d.kind === 'deadline' ? 'release' : d.kind === 'polish_plan' ? 'balanced' : d.kind === 'big_idea' ? 'keep' : d.kind === 'exhausted' ? 'rest' : d.kind === 'scope_idea' ? 'keep' : d.kind === 'tech_shortcut' ? 'proper' : d.kind === 'feature_trouble' ? 'push' : d.options[d.options.length - 1]!.id; g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((x) => x.id === pref) ? pref : d.options[0]!.id }); }
    else g.tick();
  }
  for (let i = 0; i < 8 * 70; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id }); else g.tick(); }
  return { p: getProject(g.state, pid)!, perDay: (g.state.company.money - m0) / (g.state.day - d0) };
}
const avg = (hires: number, plan: Plan, seeds = [51, 52, 53, 54]) => seeds.reduce((a, s) => a + run(studio(s, hires), plan).perDay, 0) / seeds.length;

describe('different kinds of project (D.4 / D-060)', () => {
  it('the profile comes from the plan (no separate modes)', () => {
    expect(profileFor(studio(1).state, 'small', 0)).toBe('indie');
    expect(profileFor(studio(1, 1).state, 'small', 1)).toBe('indie');
    expect(profileFor(studio(1, 2).state, 'small', 0)).toBe('standard');
    expect(profileFor(studio(1).state, 'medium', 2)).toBe('ambitious');
    expect(profileFor(studio(1).state, 'medium', 1)).toBe('standard');
    const g = studio(2);
    g.dispatch({ type: 'start_project', name: 'X', topicId: 'pirates', size: 'medium', focus: 0.45, budget: 3000, days: 112, price: 14.99, features: ['story', 'customization'] });
    const amb = getProject(g.state, g.state.activeProjectId!)!;
    const h = studio(2);
    h.dispatch({ type: 'start_project', name: 'X', topicId: 'pirates', size: 'medium', focus: 0.45, budget: 3000, days: 112, price: 14.99, features: ['story'] });
    expect(amb.profile).toBe('ambitious');
    expect(amb.hype).toBeGreaterThan(getProject(h.state, h.state.activeProjectId!)!.hype + K.ambitiousHype - 0.01);
  });

  it('an indie game stands out only when the idea is round (a signature feature, the right focus)', () => {
    const base = { profile: 'indie', topicId: 'pirates', focus: 0.45, features: ['story'] } as unknown as Project;
    expect(indieSpark(base)).toBe(K.indieSpark);
    expect(indieSpark({ ...base, features: [] })).toBe(0);
    expect(indieSpark({ ...base, focus: 0.8 })).toBe(0);
    expect(indieSpark({ ...base, features: ['story', 'level_editor'] })).toBe(0); // something out of place
    expect(indieSpark({ ...base, profile: 'standard' })).toBe(0);
    const r = run(studio(3), { size: 'small', days: 49, features: ['story'], topic: 'pirates', focus: 0.45 });
    expect(studio(3).state && r.p.result!.explanation.length).toBeGreaterThan(0);
  });

  it('ambition is judged by expectations: a phenomenon sells more, a letdown less', () => {
    const p = { profile: 'ambitious', name: 'X', id: 'P-1', result: { averageScore: 8.2 } } as unknown as Project;
    const g = studio(4);
    ambitionVerdict(g.state, p, noop);
    expect(p.result!.salesBoost!.factor).toBeCloseTo(K.phenomenonSales, 5);
    const q = { ...p, id: 'P-2', result: { averageScore: 6.6 } } as unknown as Project;
    ambitionVerdict(g.state, q, noop);
    expect(q.result!.salesBoost!.factor).toBeCloseTo(K.letdownSales, 5);
    expect(g.state.story.memories.some((m) => m.text.key === 'ledger.ambition.letdown' && m.tone < 0)).toBe(true);
    const r = { ...p, id: 'P-3', result: { averageScore: 7.5 } } as unknown as Project;
    ambitionVerdict(g.state, r, noop);
    expect(r.result!.salesBoost).toBeUndefined();
  });

  it('more features mean more coordination for bigger teams (capped); solo or standard is unaffected', () => {
    const p = { profile: 'ambitious', features: ['a', 'b', 'c'] } as unknown as Project;
    expect(ambitionCoordination(studio(5).state, p)).toBe(1);
    expect(ambitionCoordination(studio(5, 2).state, p)).toBeLessThan(1);
    expect(ambitionCoordination(studio(5, 2).state, { ...p, features: Array(20).fill('x') } as Project)).toBeCloseTo(1 - K.maxCoordination, 5);
    expect(ambitionCoordination(studio(5, 2).state, { ...p, profile: 'standard' } as Project)).toBe(1);
  });

  it('no dominant strategy: a well-planned ambitious game is a fair bet, a misfit one a costly mistake', () => {
    const good = avg(1, { size: 'medium', days: 98, features: ['story', 'customization'], topic: 'pirates', focus: 0.45 });
    const standard = avg(1, { size: 'medium', days: 98, features: ['story'], topic: 'pirates', focus: 0.45 });
    const misfit = avg(1, { size: 'medium', days: 98, features: ['story', 'customization'], topic: 'kart', focus: 0.7 });
    const kartStandard = avg(1, { size: 'medium', days: 98, features: ['customization'], topic: 'kart', focus: 0.7 });
    expect(good).toBeGreaterThan(standard * 0.9);
    expect(good).toBeLessThan(standard * 1.25);
    expect(misfit).toBeLessThan(kartStandard * 0.9);
    // A solo indie game with a round idea is viable and cheap.
    expect(avg(0, { size: 'small', days: 49, features: ['story'], topic: 'pirates', focus: 0.45 })).toBeGreaterThan(200);
  });

  it('clients remember: good work makes regulars who pay more; a let-down client stays away for a while', () => {
    const g = studio(6);
    const s = g.state;
    for (let job = 0; job < 3; job++) {
      s.contracts.offers = [{ id: `C-${job}`, clientId: 'museum', kind: 'website', focus: 0.5, work: 60, days: 30, payment: 2000, expiresDay: s.day + 10 }];
      expect(acceptContract(s, `C-${job}`)).toBeNull();
      for (let i = 0; i < 8 * 40 && s.contracts.active; i++) g.tick();
    }
    expect(clientOf(s, 'museum').jobs).toBe(3);
    expect(clientOf(s, 'museum').trust).toBeGreaterThan(0);
    expect(s.story.memories.some((m) => m.text.key === 'memory.client.loyal')).toBe(true);
    // Cancelling a job: that client is let down and will not ask for a while.
    s.contracts.offers = [{ id: 'C-x', clientId: 'gym', kind: 'website', focus: 0.5, work: 60, days: 30, payment: 2000, expiresDay: s.day + 10 }];
    acceptContract(s, 'C-x');
    expect(cancelContract(s)).toBeNull();
    expect(clientOf(s, 'gym').trust).toBeLessThanOrEqual(K.clientAwayBelow);
    for (let w = 0; w < 30; w++) for (let i = 0; i < 8 * 7; i++) g.tick();
    expect(clientOf(s, 'gym').trust).toBeGreaterThan(K.clientAwayBelow); // forgiven in time
  });
});
