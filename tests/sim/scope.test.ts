import { describe, expect, it } from 'vitest';
import { unlockAll } from '../../src/sim/systems/progress';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { FEATURE_CFG, featureCeiling, scopeCandidate } from '../../src/sim/systems/features';
import { canPlace } from '../../src/sim/systems/office';
import type { Project, Rot } from '../../src/sim/model/state';

/** F3.2 / D-058 — changing the scope mid-production: add a feature, add it with more time, or keep the plan. */
function studio(seed: number, team = false) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  unlockAll(g.state); // these tests are about the mechanic, not about when it unlocks (D-062)
  const s = g.state; s.eventLog.lastDay = 1e9; s.company.money = 30000; s.contracts.completed = 1;
  if (team) {
    let b = false;
    for (let z = 0; z < s.office.d && !b; z++) for (let x = 0; x < s.office.w && !b; x++) for (const rot of [0, 1, 2, 3] as Rot[]) if (!b && !canPlace(s.office, 'desk_basic', x, z, rot)) b = g.dispatch({ type: 'buy_item', defId: 'desk_basic', x, z, rot }).ok;
    s.hiring.candidates.push({ id: 'H', name: 'Mo', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 4, design: 5, creativity: 9, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
    g.dispatch({ type: 'hire', candidateId: 'H' });
  }
  return g;
}
function run(g: Game, o: string, opts: { days?: number; topic?: string; features?: string[] } = {}) {
  const m0 = g.state.company.money; const d0 = g.state.day;
  g.dispatch({ type: 'start_project', name: 'X', topicId: opts.topic ?? 'pirates', size: 'small', focus: 0.45, budget: 1500, days: opts.days ?? 42, price: 9.99, features: opts.features });
  const pid = g.state.activeProjectId!; let asked: { speakerId: string } | null = null; let before: Project | null = null;
  for (let i = 0; i < 60000 && g.state.activeProjectId; i++) {
    const d = g.state.pendingDecision;
    if (d) {
      if (d.kind === 'scope_idea') { asked = { speakerId: d.speakerId }; before = JSON.parse(JSON.stringify(getProject(g.state, pid))); }
      const pref = d.kind === 'scope_idea' ? o : d.kind === 'deadline' ? 'release' : d.kind === 'polish_plan' ? 'balanced' : d.kind === 'big_idea' ? 'keep' : d.kind === 'tech_shortcut' ? 'proper' : d.kind === 'exhausted' ? 'rest' : d.options[d.options.length - 1]!.id;
      g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options.some((x) => x.id === pref) ? pref : d.options[0]!.id });
    } else g.tick();
  }
  for (let i = 0; i < 8 * 56; i++) { const d = g.state.pendingDecision; if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id }); else g.tick(); }
  return { p: getProject(g.state, pid)!, asked, before, perDay: (g.state.company.money - m0) / (g.state.day - d0) };
}
const SEEDS = [31, 32, 33, 34, 35, 36];
const avg = (o: string, days: number) => SEEDS.reduce((a, s) => a + run(studio(s), o, { days }).perDay, 0) / SEEDS.length;

describe('scope changes mid-production (F3.2 / D-058)', () => {
  it('the idea needs a free slot and a feature that fits; a full plan is never asked', () => {
    expect(run(studio(31), 'keep').asked).not.toBeNull();
    const full = run(studio(31), 'keep', { features: ['story', 'customization'] });
    expect(full.asked).toBeNull();
    const p = { size: 'small', topicId: 'pirates', features: [] } as unknown as Project;
    expect(scopeCandidate(studio(1).state, p, false)!.id).toBe('story');
  });

  it('adding costs more work than planning it, raises the ceiling and is remembered; more time moves the date', () => {
    const add = run(studio(32), 'add');
    const keep = run(studio(32), 'keep');
    const time = run(studio(32), 'add_time');
    expect(add.p.features).toEqual(['story']);
    expect(keep.p.features ?? []).toEqual([]);
    expect(add.p.requiredPoints).toBeGreaterThan(keep.p.requiredPoints);
    expect(featureCeiling(add.p)).toBeGreaterThan(featureCeiling(keep.p));
    expect(time.p.deadlineDay).toBe(add.before!.deadlineDay + FEATURE_CFG.lateDelayDays);
    expect(add.p.deadlineDay).toBe(add.before!.deadlineDay);
    expect(time.before!.hype).toBeGreaterThan(0);
  });

  it('the most creative person proposes it, and is pleased or a little disappointed', () => {
    const g = studio(33, true);
    const r = run(g, 'add');
    if (r.asked) {
      const mo = g.state.empirians.find((e) => e.name === 'Mo')!;
      expect(r.asked.speakerId).toBe(mo.id);
      expect(g.state.story.memories.some((m) => m.text.key === 'ledger.moment.scope_idea.add' && (m.empirianIds ?? []).includes(mo.id))).toBe(true);
    } else {
      // This project got the other team proposal (one per project): the code shortcut.
      expect(r.p.decisionsTaken.some((d) => d.startsWith('tech_shortcut'))).toBe(true);
    }
  });

  it('no dominant answer: adding pays with time to spare, but not when the plan is already tight', () => {
    expect(avg('add', 42)).toBeGreaterThan(avg('keep', 42));
    expect(avg('add', 30)).toBeLessThan(avg('keep', 30));
    expect(avg('add_time', 30)).toBeGreaterThan(avg('add', 30));
    expect(avg('add_time', 42)).toBeLessThan(avg('add', 42));
  });
});
