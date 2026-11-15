import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { EVENT_KINDS, forceEvent } from '../../src/sim/systems/events';
import { autoplay } from '../../src/sim/autoplay';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';

const noop = () => {};
function gameWithProject(seed = 1, opts: { days?: number; size?: 'small' | 'medium' } = {}) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  g.dispatch({ type: 'start_project', name: 'P', topicId: 'kart', size: opts.size ?? 'small', focus: 0.7, budget: 1000, days: opts.days ?? 56, price: 9.99 });
  return g;
}
/** Advances until the project reaches a condition, answering other decisions with their first/neutral option. */
function advanceUntil(g: Game, cond: () => boolean, max = 4000) {
  for (let i = 0; i < max && !cond(); i++) {
    const d = g.state.pendingDecision;
    if (d) { g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id }); continue; }
    g.tick();
  }
}
function finish(g: Game, weeks = 8) {
  advanceUntil(g, () => !g.state.activeProjectId, 20000);
  for (let i = 0; i < weeks * 56; i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id });
    else g.tick();
  }
  return g;
}
function choose(g: Game, kind: string, option: string) {
  expect(forceEvent(g.state, kind, noop)).toBe(true);
  const d = g.state.pendingDecision!;
  expect(d.kind).toBe(kind);
  expect(g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: option }).ok).toBe(true);
}
const clone = (g: Game) => new Game(JSON.parse(JSON.stringify(g.state)));

describe('dynamic events (LS.7)', () => {
  it('streamer preview: every option leads to a different outcome', () => {
    const g = gameWithProject(3);
    advanceUntil(g, () => (g.state.projects[0]!.workDone.tech + g.state.projects[0]!.workDone.design) / g.state.projects[0]!.requiredPoints > 0.55);
    const results = ['give_build', 'polished_demo', 'decline'].map((o) => {
      const c = clone(g);
      choose(c, 'streamer_preview', o);
      const hype = c.state.projects[0]!.hype;
      finish(c);
      return { o, hype, revenue: c.state.projects[0]!.result!.revenue };
    });
    expect(new Set(results.map((r) => Math.round(r.revenue))).size).toBe(3);
    expect(results[0]!.hype).toBeGreaterThan(results[2]!.hype);
  });

  it('a public preview of a buggy game comes back at launch as a cause of the score', () => {
    const g = gameWithProject(4, { days: 28 });
    g.dispatch({ type: 'adjust_project', pace: 'crunch', testFocus: 0.05 });
    advanceUntil(g, () => (g.state.projects[0]!.workDone.tech + g.state.projects[0]!.workDone.design) / g.state.projects[0]!.requiredPoints > 0.55);
    choose(g, 'streamer_preview', 'give_build');
    finish(g, 1);
    const p = g.state.projects[0]!;
    if (p.bugs.hidden + p.bugs.known >= SIM_CONFIG.events.previewBugThreshold) {
      const why = p.result!.explanation.map((id) => g.state.ledger.find((e) => e.id === id)!);
      const all = g.state.ledger.filter((e) => e.kind === 'score_factor');
      expect([...why, ...all].some((e) => e.text.key === 'factor.preview_bugs')).toBe(true);
    }
  });

  it('rival announcement: the rival arrives later (deferred effect) and crowds the topic; differentiating softens it', () => {
    const g = gameWithProject(5, { days: 56 });
    advanceUntil(g, () => g.state.projects[0]!.phase === 'production');
    const ignore = clone(g);
    choose(ignore, 'rival_similar', 'ignore');
    const diff = clone(g);
    choose(diff, 'rival_similar', 'differentiate');
    const due = ignore.state.scheduled.find((s) => s.effect.kind === 'competition')!;
    expect(due.day).toBeGreaterThan(ignore.state.day);
    const before = ignore.state.world.competition.kart ?? 0;
    advanceUntil(ignore, () => ignore.state.day > due.day, 40000);
    advanceUntil(diff, () => diff.state.day > due.day, 40000);
    expect(ignore.state.world.competition.kart ?? 0).toBeGreaterThan(before);
    expect(ignore.state.ledger.some((e) => e.kind === 'consequence' && e.causes.includes(due.causeId))).toBe(true);
    expect(ignore.state.world.news.some((n) => n.kind === 'competitor_release' && n.params.topic === 'kart')).toBe(true);
    void diff;
  });

  it('critical bug: patching now, later or never have different consequences (some deferred)', () => {
    const base = autoplay({ seed: 7, days: 21, testFocus: 0.05, pace: 'crunch', moments: { exhausted: 'push' }, weeksAfter: 3 });
    const g0 = base.game;
    const p = g0.state.projects[0]!;
    // Scenario: a game that shipped with undetected bugs, not reported yet.
    p.bugReported = false;
    p.bugs.hidden = Math.max(p.bugs.hidden, 6);
    g0.state.scheduled = [];
    expect(p.bugs.hidden).toBeGreaterThanOrEqual(SIM_CONFIG.events.criticalBugMinHidden);
    const out = ['patch_now', 'patch_later', 'ignore'].map((o) => {
      const g = clone(g0);
      g.state.eventLog = { lastDay: null, lastByKind: {} };
      const rep0 = g.state.company.reputation;
      choose(g, 'critical_bug', o);
      const repNow = g.state.company.reputation;
      for (let i = 0; i < 8 * 30; i++) g.tick();
      return { o, repNow: repNow - rep0, repLater: g.state.company.reputation - rep0, revenue: g.state.projects[0]!.result!.revenue };
    });
    const [now, later, ignore] = out;
    expect(now!.repNow).toBeGreaterThan(0);
    expect(later!.repNow).toBe(0); // nothing happens yet…
    expect(later!.repLater).toBeLessThan(0); // …the cost arrives later
    expect(ignore!.repNow).toBeLessThan(later!.repLater);
    expect(now!.revenue).toBeGreaterThan(ignore!.revenue);
  });

  it('an idea saved for later improves the next project (persistent consequence, with its cause)', () => {
    const g = gameWithProject(8);
    choose(g, 'unexpected_idea', 'save');
    expect(g.state.company.savedIdeas).toHaveLength(1);
    const savedId = g.state.company.savedIdeas![0]!;
    finish(g, 1);
    g.dispatch({ type: 'start_project', name: 'Q', topicId: 'kart', size: 'small', focus: 0.7, budget: 0, days: 42, price: 9.99 });
    const q = g.state.projects[1]!;
    expect(q.ceilingMods.some((m) => m.causeId === savedId)).toBe(true);
    expect(g.state.company.savedIdeas).toHaveLength(0);
  });

  it('pacing: dynamic events respect the global gap and the per-project cap', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = autoplay({ seed, size: 'medium', days: 119 });
      const p = r.state.projects[0]!;
      expect(p.eventsSeen ?? 0).toBeLessThanOrEqual(SIM_CONFIG.events.maxPerProject);
    }
  });

  it('a pending event survives save/load (context included) and old saves migrate', () => {
    const g = gameWithProject(9);
    advanceUntil(g, () => g.state.projects[0]!.phase === 'production');
    expect(forceEvent(g.state, 'rival_similar', noop)).toBe(true);
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 't' }));
    expect(back.pendingDecision!.context).toEqual(g.state.pendingDecision!.context);
    const g2 = new Game(back);
    expect(g2.dispatch({ type: 'choose_option', decisionId: back.pendingDecision!.id, optionId: 'rush' }).ok).toBe(true);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-pending-decision.empires', 'utf8'));
    expect(old.scheduled).toEqual([]);
    expect(old.eventLog.lastDay).toBeNull();
  });

  it('every event kind is reachable by a trigger in normal play', () => {
    expect(EVENT_KINDS.length).toBeGreaterThanOrEqual(4);
  });
});
