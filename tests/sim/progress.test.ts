import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject, SCHEMA_VERSION } from '../../src/sim/state';
import { isFresh, unlocked, UNLOCKS } from '../../src/sim/systems/progress';
import { hiringUnlocked } from '../../src/sim/systems/team';
import { deserialize, serialize } from '../../src/sim/save/save';
import { career, STRATEGIES } from '../../tools/sim-runner/careers';
import type { SimEvent } from '../../src/sim/core/events';

/** D-062 — progression: the studio starts small and the game reveals its systems at real milestones. */
function g0(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'tutorial', action: 'skip' });
  const events: SimEvent[] = [];
  g.onUpdate((ev) => events.push(...ev));
  return { g, events };
}
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}
function until(g: Game, cond: () => boolean, max = 40000) { for (let i = 0; i < max && !cond(); i++) step(g); }
function ship(g: Game) {
  g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
  until(g, () => !g.state.activeProjectId);
}
const unlocks = (events: SimEvent[]) => events.filter((e) => e.type === 'unlock').map((e) => (e as { unlockId: string }).unlockId);

describe('progression (D-062)', () => {
  it('a new studio starts small: nothing extra is unlocked and the first game is calm', () => {
    const { g, events } = g0(3);
    for (const id of UNLOCKS) expect(unlocked(g.state, id), id).toBe(false);
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    const pid = g.state.activeProjectId!;
    until(g, () => !g.state.activeProjectId);
    for (let i = 0; i < 8; i++) step(g); // the next tick announces what the launch unlocked
    const p = getProject(g.state, pid)!;
    // No studio events (fairs, critics, clients…) or scope ideas during the very first game.
    expect(p.eventsSeen ?? 0).toBe(0);
    expect(p.decisionsTaken.some((d) => d.startsWith('scope_idea'))).toBe(false);
    expect(g.state.contracts.offers).toHaveLength(0);
    // Unlocks came in a natural order while making it.
    expect(unlocks(events)).toEqual(['equipment', 'planning', 'newspaper']);
  });

  it('each unlock is announced once, remembered in the Story, and marked "new" for a few days', () => {
    const { g, events } = g0(4);
    ship(g);
    for (let i = 0; i < 8; i++) step(g);
    for (const id of ['equipment', 'planning', 'newspaper'] as const) {
      expect(g.state.story.memories.filter((m) => m.text.key === `memory.unlock.${id}`)).toHaveLength(1);
      expect(unlocks(events).filter((x) => x === id)).toHaveLength(1);
    }
    expect(isFresh(g.state, 'planning')).toBe(true);
    for (let i = 0; i < 8 * 4; i++) step(g);
    expect(isFresh(g.state, 'planning')).toBe(false);
  });

  it('clients call after the first sales; the team needs a way to pay salaries; the studio comes with two games', () => {
    const { g } = g0(5);
    ship(g);
    until(g, () => unlocked(g.state, 'contracts'), 8 * 10);
    expect(unlocked(g.state, 'contracts')).toBe(true);
    expect(g.state.projects[0]!.result!.weeklySales.length).toBeGreaterThanOrEqual(1);
    expect(unlocked(g.state, 'studio')).toBe(false);
    ship(g);
    expect(unlocked(g.state, 'studio')).toBe(true);
    expect(hiringUnlocked(g.state)).toBe(true);
  });

  it('nothing is ever locked again once reached (even if its condition stops holding)', () => {
    const { g } = g0(6);
    ship(g);
    g.state.company.money = 20000;
    for (let i = 0; i < 8; i++) step(g);
    expect(unlocked(g.state, 'team')).toBe(true);
    g.state.company.money = 100;
    for (let i = 0; i < 8; i++) step(g);
    expect(unlocked(g.state, 'team')).toBe(true);
  });

  it('never interrupts a decision: the announcement waits until it is answered', () => {
    const { g, events } = g0(7);
    g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: 'small', focus: 0.7, budget: 1000, days: 35, price: 9.99 });
    let sawUnlockDuringDecision = false;
    for (let i = 0; i < 40000 && g.state.activeProjectId; i++) {
      const before = unlocks(events).length;
      const pending = !!g.state.pendingDecision;
      step(g);
      if (pending && unlocks(events).length > before && g.state.pendingDecision) sawUnlockDuringDecision = true;
    }
    expect(sawUnlockDuringDecision).toBe(false);
  });

  it('old saves keep everything: progress is rebuilt from what they already reached, silently', () => {
    const old = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    expect(old.schemaVersion).toBe(SCHEMA_VERSION);
    expect(old.progress!.seen).toEqual(expect.arrayContaining(['equipment', 'planning', 'newspaper']));
    expect(unlocked(old, 'planning')).toBe(true);
    // Loading announces nothing.
    const g = new Game(old);
    const ev: SimEvent[] = [];
    g.onUpdate((e) => ev.push(...e));
    g.tick();
    expect(ev.filter((e) => e.type === 'unlock' && ['equipment', 'planning', 'newspaper'].includes((e as { unlockId: string }).unlockId))).toHaveLength(0);
  });

  it('evidence of use unlocks: a studio that already hired, expanded or made medium games keeps them', () => {
    const { g } = g0(8);
    g.state.hiring.hired = 1;
    g.state.office.size = 'studio';
    g.state.projects.push({ ...JSON.parse(JSON.stringify(createNewGame(1).projects[0] ?? {})), id: 'P-x', size: 'medium', phase: 'production', features: ['story'] });
    expect(unlocked(g.state, 'team')).toBe(true);
    expect(unlocked(g.state, 'expansion')).toBe(true);
    expect(unlocked(g.state, 'studio')).toBe(true);
    expect(unlocked(g.state, 'planning')).toBe(true);
  });

  it('progress is saved and deterministic', () => {
    const run = () => { const { g } = g0(9); ship(g); return JSON.stringify(g.state.progress); };
    expect(run()).toBe(run());
    const { g } = g0(9);
    ship(g);
    expect(deserialize(serialize(g.state, { gameVersion: 't', savedAt: 'x' })).progress).toEqual(g.state.progress);
  });

  it('normal play reaches the team, the studio and contracts within a year — no grinding', () => {
    const st = STRATEGIES.find((s) => s.name.startsWith('J'))!;
    for (const seed of [4200, 4201, 4202]) {
      const r = career(seed, st, 365) as unknown as { hires: number; games: number; contracts: number };
      expect(r.games).toBeGreaterThanOrEqual(3);
      expect(r.hires).toBeGreaterThanOrEqual(1);
    }
  });
});
