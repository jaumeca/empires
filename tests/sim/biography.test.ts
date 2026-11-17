import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { biography } from '../../src/sim/systems/biography';
import { APPEARANCE_LIMITS } from '../../src/content/appearance';
import { deserialize, serialize } from '../../src/sim/save/save';

/** AW.C — editing looks never touches identity; biographies are made of facts. */
function game(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'Ada', companyName: 'Nest', appearance: DEFAULT_APPEARANCE });
  return g;
}

describe('Empirian editor and biography (AW.C)', () => {
  it('editing name, nickname and looks keeps skills, experience, personality, salary and memories', () => {
    const g = game(2);
    const f = g.state.empirians[0]!;
    f.xp.tech = 900;
    const before = JSON.stringify({ skills: f.skills, xp: f.xp, topicXp: f.topicXp, trait: f.trait, salary: f.salary, memories: g.state.story.memories });
    const r = g.dispatch({ type: 'edit_empirian', empirianId: f.id, name: '  Ada   Lovelace ', nickname: 'Byte', appearance: { ...DEFAULT_APPEARANCE, hairStyle: 5, topColor: 7, accessory: 3 } });
    expect(r.ok).toBe(true);
    expect(f.name).toBe('Ada Lovelace');
    expect(f.nickname).toBe('Byte');
    expect(f.appearance.hairStyle).toBe(5);
    expect(JSON.stringify({ skills: f.skills, xp: f.xp, topicXp: f.topicXp, trait: f.trait, salary: f.salary, memories: g.state.story.memories })).toBe(before);
  });

  it('validates names and appearance values', () => {
    const g = game(3);
    const id = g.state.founderId;
    expect(g.dispatch({ type: 'edit_empirian', empirianId: id, name: '   ' })).toEqual({ ok: false, error: 'name_required' });
    expect(g.dispatch({ type: 'edit_empirian', empirianId: 'nobody', name: 'X' })).toEqual({ ok: false, error: 'unknown_empirian' });
    g.dispatch({ type: 'edit_empirian', empirianId: id, name: 'A'.repeat(60), nickname: 'tab\there\u0007!' + 'x'.repeat(40), appearance: { skin: 99, hairStyle: -1, hairColor: 2.5, top: 4, topColor: 9, pantsColor: 5, accessory: 5 } });
    const f = g.state.empirians[0]!;
    expect(f.name.length).toBe(24);
    expect(f.nickname!.length).toBeLessThanOrEqual(16);
    expect(f.nickname).not.toMatch(/[\u0000-\u001f]/);
    for (const [k, max] of Object.entries(APPEARANCE_LIMITS)) {
      const v = f.appearance[k as keyof typeof APPEARANCE_LIMITS];
      expect(Number.isInteger(v) && v >= 0 && v < max).toBe(true);
    }
    expect(f.appearance.top).toBe(4);
    // An empty nickname removes it.
    g.dispatch({ type: 'edit_empirian', empirianId: id, nickname: '' });
    expect(f.nickname).toBeUndefined();
    // Saved like everything else.
    expect(deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' })).empirians[0]!.name).toBe(f.name);
  });

  it('the biography only tells what really happened', () => {
    const g = game(4);
    const f = g.state.empirians[0]!;
    let bio = biography(g.state, f).map((x) => x.key);
    expect(bio[0]).toBe('bio.founder');
    expect(bio).not.toContain('bio.games');
    g.dispatch({ type: 'start_project', name: 'Primero', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    for (let i = 0; i < 30000 && g.state.activeProjectId; i++) {
      const d = g.state.pendingDecision;
      if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
      else g.tick();
    }
    const games = biography(g.state, f).find((x) => x.key === 'bio.games')!;
    expect(games.params).toMatchObject({ count: 1, best: 'Primero' });
    expect(games.params!.score).toBe(Math.round(g.state.projects[0]!.result!.averageScore * 10) / 10);
    // Someone hired later doesn't claim older games.
    g.state.empirians.push({ ...JSON.parse(JSON.stringify(f)), id: 'E-new', name: 'Teo', hiredDay: g.state.day + 1 });
    bio = biography(g.state, g.state.empirians[1]!).map((x) => x.key);
    expect(bio[0]).toBe('bio.joined');
    expect(bio).toContain('bio.no_games');
  });
});
