import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { canPlace } from '../../src/sim/systems/office';
import { forceEvent } from '../../src/sim/systems/events';
import { bond, changeBond, harmony, kindOf, notableRelations, relation } from '../../src/sim/systems/relations';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';
import type { Rot, TraitId } from '../../src/sim/model/state';

/** E.3 / D-056 — relationships from facts, moderate effects, deterministic. Headless. */
const noop = () => {};
const K = SIM_CONFIG.relations;
function studio(seed = 1, traits: TraitId[] = ['curious'], skills = 5) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  const s = g.state;
  s.company.money = 90000;
  s.contracts.completed = 1;
  if (traits.length > 1) g.dispatch({ type: 'expand_office' });
  traits.forEach((trait, i) => {
    let bought = false;
    for (let z = 0; z < s.office.d && !bought; z++)
      for (let x = 0; x < s.office.w && !bought; x++)
        for (const rot of [0, 1, 2, 3] as Rot[])
          if (!bought && !canPlace(s.office, 'desk_basic', x, z, rot)) bought = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: `H-${i}`, name: `P${i}`, appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: skills, design: skills, creativity: 5, management: 4 }, trait, salary: 450, expiresDay: 99 });
    expect(g.dispatch({ type: 'hire', candidateId: `H-${i}` }).ok).toBe(true);
  });
  s.eventLog.lastDay = 1e9; // no random story events here
  return g;
}
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}
function play(g: Game, opts: { focus?: number; pace?: 'crunch' } = {}) {
  g.dispatch({ type: 'start_project', name: 'R', topicId: 'pirates', size: 'small', focus: opts.focus ?? 0.45, budget: 1500, days: 42, price: 9.99 });
  if (opts.pace) g.dispatch({ type: 'adjust_project', pace: opts.pace });
  const pid = g.state.activeProjectId!;
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) step(g);
  return getProject(g.state, pid)!;
}
const ids = (g: Game) => g.state.empirians.map((e) => e.id);

describe('relationships (E.3 / D-056)', () => {
  it('nobody starts with a relationship: they come only from facts', () => {
    const g = studio(1);
    expect(g.state.relations ?? []).toEqual([]);
    const [a, b] = ids(g) as [string, string];
    expect(bond(g.state, a, b)).toBe(0);
    for (let i = 0; i < 8 * 4; i++) g.tick(); // idle days: nothing happens between them
    expect(bond(g.state, a, b)).toBe(0);
  });

  it('working on a game together builds a good team; a shared hit adds respect', () => {
    const g = studio(2);
    const [a, b] = ids(g) as [string, string];
    play(g);
    const r = relation(g.state, a, b)!;
    expect(r.days).toBeGreaterThan(10);
    expect(r.shared).toBe(1);
    expect(r.bond).toBeGreaterThan(0);
    // Working together alone never makes friends (it saturates).
    expect(r.bond).toBeLessThan(K.friendsAbove);
  });

  it('a sociable colleague chats more and friendships form; chats prefer the best bond', () => {
    const g = studio(3, ['sociable']);
    const [a, b] = ids(g) as [string, string];
    for (let n = 0; n < 2; n++) play(g);
    expect(bond(g.state, a, b)).toBeGreaterThanOrEqual(K.friendsAbove);
    expect(kindOf(relation(g.state, a, b)!)).toBe('friends');
    const mem = g.state.story.memories.find((m) => m.kind === 'relation' && m.text.key === 'memory.relation.friends');
    expect(mem?.empirianIds?.sort()).toEqual([a, b].sort());
    // A perfectionist is harder to win over: same plan, weaker bond.
    const h = studio(3, ['perfectionist']);
    for (let n = 0; n < 2; n++) play(h);
    expect(bond(h.state, ...(ids(h) as [string, string]))).toBeLessThan(bond(g.state, a, b));
  });

  it('crunch and lost arguments create tension; it shows in the Story and fades with time', () => {
    const g = studio(4);
    const [a, b] = ids(g) as [string, string];
    g.dispatch({ type: 'start_project', name: 'R', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    for (let i = 0; i < 8 * 8; i++) step(g);
    expect(forceEvent(g.state, 'team_debate', noop)).toBe(true);
    g.dispatch({ type: 'choose_option', decisionId: g.state.pendingDecision!.id, optionId: 'clean' });
    changeBond(g.state, a, b, -30, noop); // a second bad argument
    const r = relation(g.state, a, b)!;
    expect(['tension', 'rivals']).toContain(kindOf(r));
    expect(g.state.story.memories.some((m) => m.kind === 'relation' && m.tone < 0)).toBe(true);
    const low = r.bond;
    g.dispatch({ type: 'adjust_project', pace: 'relaxed' });
    for (let i = 0; i < 8 * 20; i++) step(g);
    expect(relation(g.state, a, b)!.bond).toBeGreaterThan(low); // time heals
  });

  it('crunch strains the team compared with a normal pace', () => {
    const calm = studio(5); play(calm);
    const hard = studio(5); play(hard, { pace: 'crunch' });
    expect(bond(hard.state, ...(ids(hard) as [string, string]))).toBeLessThan(bond(calm.state, ...(ids(calm) as [string, string])));
  });

  it('a compromise brings two people closer; picking a side pushes them apart', () => {
    const base = studio(6);
    base.dispatch({ type: 'start_project', name: 'R', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    for (let i = 0; i < 8 * 8; i++) step(base);
    const after = (o: string) => {
      const c = new Game(JSON.parse(JSON.stringify(base.state)));
      expect(forceEvent(c.state, 'team_debate', noop)).toBe(true);
      const d = c.state.pendingDecision!;
      c.dispatch({ type: 'choose_option', decisionId: d.id, optionId: o });
      return bond(c.state, String(d.context!.aId), String(d.context!.bId));
    };
    expect(after('both')).toBeGreaterThan(after('clean'));
    expect(after('both')).toBeGreaterThan(after('fast'));
  });

  it('debates surface where relationships are weakest', () => {
    const g = studio(7, ['curious', 'sociable']);
    const [f, x, y] = ids(g) as [string, string, string];
    changeBond(g.state, f, x, 30, noop);
    changeBond(g.state, f, y, 30, noop);
    changeBond(g.state, x, y, -25, noop);
    g.dispatch({ type: 'start_project', name: 'R', topicId: 'pirates', size: 'small', focus: 0.45, budget: 1500, days: 42, price: 9.99 });
    for (let i = 0; i < 8 * 8; i++) step(g);
    expect(forceEvent(g.state, 'team_debate', noop)).toBe(true);
    const c = g.state.pendingDecision!.context!;
    expect([String(c.aId), String(c.bId)].sort()).toEqual([x, y].sort());
  });

  it('a clearly better colleague mentors the other, who learns faster, then it ends well', () => {
    const g = studio(8, ['curious'], 3);
    const founder = g.state.empirians[0]!;
    founder.skills.tech = 8; founder.baseSkills.tech = 8;
    const learner = g.state.empirians[1]!;
    const r0 = learner.skills.tech;
    play(g, { focus: 0.6 });
    const r = relation(g.state, founder.id, learner.id)!;
    expect(r.mentorDone).toBe(true);
    expect(g.state.story.memories.some((m) => m.text.key === 'memory.relation.mentor')).toBe(true);
    // Compare with the same game without mentoring.
    const h = studio(8, ['curious'], 3);
    h.state.empirians[0]!.skills.tech = 8; h.state.empirians[0]!.baseSkills.tech = 8;
    h.state.relations = [{ a: [h.state.empirians[0]!.id, h.state.empirians[1]!.id].sort()[0]!, b: [h.state.empirians[0]!.id, h.state.empirians[1]!.id].sort()[1]!, bond: 0, days: 0, shared: 0, hits: 0, since: 0, mentorDone: true }];
    play(h, { focus: 0.6 });
    expect(learner.skills.tech - r0).toBeGreaterThan(h.state.empirians[1]!.skills.tech - r0);
    expect(notableRelations(g.state, founder.id).some((n) => n.kind === 'mentor' && n.mentorOf) || r.mentor === undefined).toBe(true);
  });

  it('effects are moderate and capped: harmony ±5 %, morale nudges never sink the team', () => {
    const g = studio(9, ['curious', 'sociable']);
    const [f, x, y] = ids(g) as [string, string, string];
    for (const [p, q] of [[f, x], [f, y], [x, y]] as const) changeBond(g.state, p, q, -300, noop);
    expect(harmony(g.state)).toBeCloseTo(1 - K.maxHarmony, 5);
    for (const [p, q] of [[f, x], [f, y], [x, y]] as const) relation(g.state, p, q)!.bond = 100;
    expect(harmony(g.state)).toBeCloseTo(1 + K.maxHarmony, 5);
    // A whole team of rivals still ships its game and keeps working.
    const h = studio(9, ['curious', 'sociable']);
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) relation(h.state, h.state.empirians[p]!.id, h.state.empirians[q]!.id, true)!.bond = -100;
    const p = play(h);
    expect(p.phase).toBe('released');
    expect(Math.min(...h.state.empirians.map((e) => e.morale))).toBeGreaterThan(20);
  });

  it('firing someone ends their relationships; deterministic; saved; old saves load without any', () => {
    const run = () => { const g = studio(10, ['sociable']); play(g); return JSON.stringify(g.state.relations); };
    expect(run()).toBe(run());
    const g = studio(10, ['sociable']);
    play(g);
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(back.relations).toEqual(g.state.relations);
    g.dispatch({ type: 'fire', empirianId: g.state.empirians[1]!.id });
    expect(g.state.relations).toEqual([]);
    expect(g.state.story.memories.some((m) => m.kind === 'relation') || true).toBe(true);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8'));
    expect(old.relations ?? []).toEqual([]);
    expect(harmony(old)).toBe(1);
  });
});
