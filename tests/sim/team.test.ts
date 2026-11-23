import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject, SCHEMA_VERSION } from '../../src/sim/state';
import { coordinationFactor, employees, freeWorkstations, hiringUnlocked } from '../../src/sim/systems/team';
import { canPlace } from '../../src/sim/systems/office';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';
import type { Candidate, GameState, Rot, TraitId } from '../../src/sim/model/state';

/** GT.1 — hiring the first Empirian. Headless, deterministic. */
function newGame(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  return g;
}
function answer(g: Game) {
  const d = g.state.pendingDecision;
  if (!d) return false;
  const pref = d.kind === 'deadline' ? 'release' : d.kind === 'exhausted' ? 'rest' : d.options[d.options.length - 1]!.id;
  g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((o) => o.id === pref) ? pref : d.options[0]!.id });
  return true;
}
function runUntil(g: Game, cond: () => boolean, max = 30000) {
  for (let i = 0; i < max && !cond(); i++) if (!answer(g)) g.tick();
}
/** Ships one small game so hiring unlocks. */
function shipOne(g: Game) {
  g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
  runUntil(g, () => !g.state.activeProjectId);
}
function buyDesk(g: Game): boolean {
  const s = g.state;
  for (let z = 0; z < s.office.d; z++)
    for (let x = 0; x < s.office.w; x++)
      for (const rot of [0, 1, 2, 3] as Rot[])
        if (!canPlace(s.office, 'desk_basic', x, z, rot)) return g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
  return false;
}
/** A controlled applicant (for comparisons between traits). */
function addCandidate(s: GameState, trait: TraitId, skills = 5, salary = 500): Candidate {
  const c: Candidate = { id: `H-test-${trait}-${s.nextId++}`, name: 'Test', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: skills, design: skills, creativity: 5, management: 4 }, trait, salary, expiresDay: s.day + 30 };
  s.hiring.candidates.push(c);
  return c;
}
function projectWith(trait: TraitId | null, seed = 7, pace: 'normal' | 'crunch' = 'normal') {
  const g = newGame(seed);
  g.state.company.money = 50000;
  g.state.contracts.completed = 1; // unlock hiring without shipping
  if (trait) {
    buyDesk(g);
    const c = addCandidate(g.state, trait);
    expect(g.dispatch({ type: 'hire', candidateId: c.id }).ok).toBe(true);
  }
  // Per-person output and bugs, from the simulation's own events.
  const per: Record<string, { work: number; bugs: number }> = {};
  g.onUpdate((evs) => {
    for (const ev of evs) {
      if (ev.type === 'work' && (ev.kind === 'tech' || ev.kind === 'design')) (per[ev.empirianId] ??= { work: 0, bugs: 0 }).work += ev.amount;
      if (ev.type === 'bug_created') (per[ev.empirianId] ??= { work: 0, bugs: 0 }).bugs += ev.count;
    }
  });
  g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'medium', focus: 0.7, budget: 3000, days: 98, price: 14.99 });
  g.dispatch({ type: 'adjust_project', pace });
  const pid = g.state.activeProjectId!;
  // 25 working days of production.
  runUntil(g, () => g.state.day >= 26);
  const emp = employees(g.state)[0];
  return { g, p: getProject(g.state, pid)!, per, emp: emp ? per[emp.id] : undefined };
}

describe('team (GT.1)', () => {
  it('applicants only arrive once the studio can afford a team (D-062), deterministically', () => {
    const a = newGame(3);
    runUntil(a, () => a.state.day >= 40);
    expect(hiringUnlocked(a.state)).toBe(false);
    expect(a.state.hiring.candidates).toHaveLength(0);
    shipOne(a);
    // One launch is not enough on its own (unless there's money for salaries)…
    expect(hiringUnlocked(a.state)).toBe(a.state.company.money >= 15000);
    shipOne(a);
    // …two launches are.
    expect(hiringUnlocked(a.state)).toBe(true);
    runUntil(a, () => a.state.hiring.candidates.length > 0, 8 * 20);
    expect(a.state.hiring.candidates.length).toBe(SIM_CONFIG.team.candidatesPerRefresh);
    const b = newGame(3);
    runUntil(b, () => b.state.day >= 40);
    shipOne(b);
    shipOne(b);
    runUntil(b, () => b.state.hiring.candidates.length > 0, 8 * 20);
    expect(JSON.stringify(b.state.hiring)).toBe(JSON.stringify(a.state.hiring));
    for (const c of a.state.hiring.candidates) expect(c.salary).toBeGreaterThan(150);
  });

  it('hiring needs a free workstation and money; the new Empirian takes that desk and is paid weekly', () => {
    const g = newGame(5);
    g.state.contracts.completed = 1;
    g.state.company.money = 20000;
    const c = addCandidate(g.state, 'curious', 5, 600);
    expect(freeWorkstations(g.state)).toHaveLength(0);
    expect(g.dispatch({ type: 'hire', candidateId: c.id })).toEqual({ ok: false, error: 'no_free_desk' });
    expect(buyDesk(g)).toBe(true);
    g.state.company.money = 100;
    expect(g.dispatch({ type: 'hire', candidateId: c.id })).toEqual({ ok: false, error: 'not_enough_money' });
    g.state.company.money = 20000;
    expect(g.dispatch({ type: 'hire', candidateId: c.id }).ok).toBe(true);
    const e = employees(g.state)[0]!;
    expect(e.salary).toBe(600);
    expect(g.state.office.items.some((it) => it.assignedTo === e.id)).toBe(true);
    expect(g.state.hiring.candidates.find((x) => x.id === c.id)).toBeUndefined();
    // The desk in use can't be sold.
    const desk = g.state.office.items.find((it) => it.assignedTo === e.id)!;
    expect(g.dispatch({ type: 'sell_item', uid: desk.uid })).toEqual({ ok: false, error: 'desk_in_use' });
    // Payroll: four weeks of salary.
    const paidBefore = g.state.hiring.salariesPaid;
    runUntil(g, () => g.state.day >= 30);
    expect(g.state.hiring.salariesPaid - paidBefore).toBeGreaterThanOrEqual(600 * 4);
  });

  it('a second person builds more, but less than twice as much (coordination)', () => {
    const solo = projectWith(null);
    const duo = projectWith('curious');
    const work = (p: typeof solo.p) => p.workDone.tech + p.workDone.design + p.polishDone + p.testingDone;
    const ratio = work(duo.p) / work(solo.p);
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(2);
    expect(coordinationFactor(2) * 2).toBeLessThan(2);
  });

  it('traits trade one thing for another (no free lunch)', () => {
    const perf = projectWith('perfectionist');
    const curious = projectWith('curious');
    const social = projectWith('sociable');
    // Perfectionist: fewer bugs per point of work (averaged over seeds: bugs are random)…
    const seeds = [7, 8, 9, 10, 11, 12];
    const rate = (trait: TraitId) => {
      let bugs = 0, work = 0;
      for (const sd of seeds) { const r = projectWith(trait, sd); bugs += r.emp!.bugs; work += r.emp!.work; }
      return bugs / work;
    };
    expect(rate('perfectionist')).toBeLessThan(rate('sociable') * 0.85);
    // …curious: learns faster than the others…
    const xp = (r: typeof perf) => { const e = employees(r.g.state)[0]!; return e.xp.tech + e.xp.design; };
    expect(xp(curious)).toBeGreaterThan(xp(perf) * 1.3);
    // …sociable: the whole team is in a better mood.
    const founderMorale = (r: typeof perf) => r.g.state.empirians[0]!.morale;
    expect(founderMorale(social)).toBeGreaterThan(founderMorale(perf));
    // Night owl: faster in crunch, but more tired.
    const owl = projectWith('night_owl', 7, 'crunch');
    const perfCrunch = projectWith('perfectionist', 7, 'crunch');
    const emp = (r: typeof perf) => employees(r.g.state)[0]!;
    expect(emp(owl).energy).toBeLessThanOrEqual(emp(perfCrunch).energy);
  });

  it('firing pays severance, frees the desk and hurts morale and reputation', () => {
    const g = newGame(9);
    g.state.contracts.completed = 1;
    g.state.company.money = 20000;
    buyDesk(g);
    const c = addCandidate(g.state, 'sociable', 5, 500);
    g.dispatch({ type: 'hire', candidateId: c.id });
    const e = employees(g.state)[0]!;
    const money = g.state.company.money, rep = g.state.company.reputation, morale = g.state.empirians[0]!.morale;
    expect(g.dispatch({ type: 'fire', empirianId: g.state.founderId })).toEqual({ ok: false, error: 'cannot_fire_founder' });
    expect(g.dispatch({ type: 'fire', empirianId: e.id }).ok).toBe(true);
    expect(g.state.company.money).toBe(money - 500 * SIM_CONFIG.team.severanceWeeks);
    expect(g.state.company.reputation).toBeLessThan(rep);
    expect(g.state.empirians[0]!.morale).toBeLessThan(morale);
    expect(employees(g.state)).toHaveLength(0);
    expect(freeWorkstations(g.state)).toHaveLength(1);
  });

  it('the team survives save/load; v7 saves migrate to a solo studio', () => {
    const g = newGame(11);
    g.state.contracts.completed = 1;
    g.state.company.money = 20000;
    buyDesk(g);
    g.dispatch({ type: 'hire', candidateId: addCandidate(g.state, 'night_owl').id });
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(JSON.stringify(back)).toBe(JSON.stringify(g.state));
    for (const f of ['save-v1-released.empires', 'save-v1-pending-decision.empires']) {
      const s = deserialize(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8'));
      expect(s.schemaVersion).toBe(SCHEMA_VERSION);
      expect(s.hiring.candidates).toEqual([]);
      expect(s.rng.hiring).toHaveLength(4);
      expect(employees(s)).toHaveLength(0);
    }
  });
});
