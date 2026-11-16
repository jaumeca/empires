import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { storyDay, isUnlocked, memoriesOf } from '../../src/sim/systems/story';
import { canPlace } from '../../src/sim/systems/office';
import { deserialize, serialize } from '../../src/sim/save/save';
import type { GameState, Project, Rot } from '../../src/sim/model/state';

/** ML.2 / ML.3 — memories from real facts; achievements unlock decorations. */
function newGame(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'Ada', companyName: 'Pixel Nest', appearance: DEFAULT_APPEARANCE });
  return g;
}
function runUntil(g: Game, cond: () => boolean, max = 30000) {
  for (let i = 0; i < max && !cond(); i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
    else g.tick();
  }
}
/** A released copy of a real project with a chosen score (to test memory rules). */
function fakeRelease(s: GameState, template: Project, score: number, day: number): Project {
  const p: Project = JSON.parse(JSON.stringify(template));
  p.id = `P-fake-${s.nextId++}`;
  p.name = `Game ${score}`;
  p.result!.averageScore = score;
  p.result!.releasedDay = day;
  s.projects.push(p);
  return p;
}
function shipOne(g: Game) {
  g.dispatch({ type: 'start_project', name: 'Primero', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
  runUntil(g, () => !g.state.activeProjectId);
  runUntil(g, () => g.state.story.memories.some((m) => m.kind === 'first_release'), 8 * 3);
}
const kinds = (s: GameState) => s.story.memories.map((m) => m.kind);

describe('studio story (ML.2, ML.3)', () => {
  it('founding and first release become memories, linked to people and products', () => {
    const g = newGame(2);
    expect(kinds(g.state)).toEqual(['founded']);
    expect(g.state.story.memories[0]!.empirianIds).toEqual([g.state.founderId]);
    shipOne(g);
    const first = g.state.story.memories.find((m) => m.kind === 'first_release')!;
    expect(first.projectId).toBe(g.state.projects[0]!.id);
    expect(first.text.params?.project).toBe('Primero');
    expect(memoriesOf(g.state, { projectId: g.state.projects[0]!.id })).toContain(first);
  });

  it('only memorable releases are remembered: first hit, first flop, comebacks and records', () => {
    const g = newGame(3);
    shipOne(g);
    const s = g.state;
    const tpl = s.projects[0]!;
    const base = tpl.result!.averageScore;
    fakeRelease(s, tpl, Math.min(base, 4.2), s.day);       // first flop
    fakeRelease(s, tpl, 4.0, s.day + 1);                    // second flop: not memorable
    fakeRelease(s, tpl, 7.4, s.day + 2);                    // comeback
    fakeRelease(s, tpl, 8.6, s.day + 3);                    // first hit
    fakeRelease(s, tpl, 8.1, s.day + 4);                    // hit
    storyDay(s, () => {});
    const k = kinds(s);
    expect(k.filter((x) => x === 'first_flop')).toHaveLength(1);
    expect(k).toContain('comeback');
    expect(k).toContain('first_hit');
    expect(k).toContain('hit');
    // Re-scanning never duplicates.
    const n = s.story.memories.length;
    storyDay(s, () => {});
    expect(s.story.memories.length).toBe(n);
    // Achievements: golden game and comeback unlock their decorations.
    expect(s.story.achievements.first_hit).toBeDefined();
    expect(s.story.achievements.comeback).toBeDefined();
    expect(isUnlocked(s, 'trophy_gold')).toBe(true);
    expect(isUnlocked(s, 'neon_sign')).toBe(false);
  });

  it('special decorations can only be bought once earned; basic items are never locked', () => {
    const g = newGame(4);
    g.state.company.money = 50000;
    const spot = (id: string) => { for (let z = 0; z < 8; z++) for (let x = 0; x < 10; x++) if (!canPlace(g.state.office, id, x, z, 0 as Rot)) return [x, z] as const; return [0, 0] as const; };
    const [x, z] = spot('trophy_gold');
    expect(g.dispatch({ type: 'buy_item', defId: 'trophy_gold', x, z, rot: 0 })).toEqual({ ok: false, error: 'item_not_unlocked' });
    const [px, pz] = spot('plant_tall');
    expect(g.dispatch({ type: 'buy_item', defId: 'plant_tall', x: px, z: pz, rot: 0 }).ok).toBe(true);
    g.state.story.achievements.first_hit = g.state.day;
    const [x2, z2] = spot('trophy_gold');
    expect(g.dispatch({ type: 'buy_item', defId: 'trophy_gold', x: x2, z: z2, rot: 0 }).ok).toBe(true);
  });

  it('hires, farewells, skills, money and the first office purchase are remembered with their people', () => {
    const g = newGame(5);
    const s = g.state;
    s.contracts.completed = 1;
    s.company.money = 120000;
    s.hiring.candidates.push({ id: 'H-x', name: 'Teo', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 5, creativity: 5, management: 5 }, trait: 'curious', salary: 500, expiresDay: 99 });
    for (let zz = 0; zz < 8; zz++) for (let xx = 0; xx < 10; xx++) if (!canPlace(s.office, 'desk_basic', xx, zz, 0 as Rot) && s.office.items.filter((i) => i.defId.startsWith('desk')).length < 2) g.dispatch({ type: 'buy_item', defId: 'desk_basic', x: xx, z: zz, rot: 0 });
    g.dispatch({ type: 'hire', candidateId: 'H-x' });
    const teo = s.empirians.find((e) => e.name === 'Teo')!;
    s.empirians[0]!.skills.tech = 8.2;
    runUntil(g, () => s.day >= 3);
    const k = kinds(s);
    expect(k).toContain('first_hire');
    expect(k).toContain('skill_master');
    expect(k).toContain('money');
    expect(k).toContain('first_contract');
    expect(k).toContain('first_decor');
    expect(memoriesOf(s, { empirianId: teo.id }).map((m) => m.kind)).toContain('first_hire');
    g.dispatch({ type: 'fire', empirianId: teo.id });
    expect(kinds(s)).toContain('farewell');
    expect(s.story.achievements.first_hire).toBeDefined();
    expect(s.story.achievements.rich).toBeDefined();
  });

  it('big decisions from the causal ledger become memories (once)', () => {
    const g = newGame(6);
    g.dispatch({ type: 'start_project', name: 'Idea', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 42, price: 9.99 });
    runUntil(g, () => g.state.projects[0]!.decisionsTaken.some((d) => d.startsWith('big_idea')) || g.state.projects[0]!.phase === 'released');
    runUntil(g, () => g.state.day >= g.state.day + 1, 8);
    for (let i = 0; i < 8; i++) g.tick();
    const big = g.state.ledger.filter((l) => l.kind === 'big_idea');
    const decisions = g.state.story.memories.filter((m) => m.kind === 'decision');
    expect(decisions.length).toBe(big.length);
  });

  it('survives save/load; older saves start remembering from their real history', () => {
    const g = newGame(7);
    shipOne(g);
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' }));
    expect(JSON.stringify(back)).toBe(JSON.stringify(g.state));
    const old = deserialize(readFileSync(new URL('../fixtures/save-v1-released.empires', import.meta.url), 'utf8'));
    expect(kinds(old)).toEqual(['founded']);
    const g2 = new Game(old);
    for (let i = 0; i < 8; i++) g2.tick();
    expect(kinds(g2.state)).toContain('first_release');
  });
});
