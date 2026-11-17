import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { EVENT_KINDS, forceEvent } from '../../src/sim/systems/events';
import { STORY_EVENTS } from '../../src/sim/systems/storyEvents';
import { productionProgress } from '../../src/sim/systems/project';
import { canPlace } from '../../src/sim/systems/office';
import { deserialize, serialize } from '../../src/sim/save/save';
import { SIM_CONFIG } from '../../src/sim/config';
import { es } from '../../src/i18n/es';
import { en } from '../../src/i18n/en';
import type { Rot, TextRef } from '../../src/sim/model/state';

/** Story events ("The Next Chapter"): people and the world ask for decisions. Headless. */
const noop = () => {};
const K = SIM_CONFIG.storyEvents;
function studio(seed = 1) {
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
  s.hiring.candidates.push({ id: 'H-s', name: 'Noa', appearance: { ...DEFAULT_APPEARANCE }, baseSkills: { tech: 5, design: 4, creativity: 6, management: 4 }, trait: 'curious', salary: 450, expiresDay: 99 });
  expect(g.dispatch({ type: 'hire', candidateId: 'H-s' }).ok).toBe(true);
  s.eventLog.lastDay = 1e9; // only forced events in these tests
  return g;
}
function step(g: Game) {
  const d = g.state.pendingDecision;
  if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.kind === 'deadline' ? 'release' : d.options[d.options.length - 1]!.id });
  else g.tick();
}
function until(g: Game, cond: () => boolean, max = 20000) { for (let i = 0; i < max && !cond(); i++) step(g); }
function startGame(g: Game, size: 'small' | 'medium' = 'small') {
  g.dispatch({ type: 'start_project', name: 'Tale', topicId: 'pirates', size, focus: 0.45, budget: 1500, days: size === 'small' ? 42 : 84, price: 9.99 });
  return getProject(g.state, g.state.activeProjectId!)!;
}
const clone = (g: Game) => new Game(JSON.parse(JSON.stringify(g.state)));
function choose(g: Game, kind: string, option: string) {
  expect(forceEvent(g.state, kind, noop), kind).toBe(true);
  const d = g.state.pendingDecision!;
  expect(d.kind).toBe(kind);
  expect(g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: option }).ok).toBe(true);
}
function texts(g: Game): TextRef[] {
  const d = g.state.pendingDecision!;
  return [d.text, ...d.options.flatMap((o) => [o.label, ...o.hints])];
}

describe('story events', () => {
  it('are registered in the event engine', () => {
    for (const e of STORY_EVENTS) expect(EVENT_KINDS).toContain(e.kind);
  });

  it('an employee idea: raised by that employee; adopt, save and decline differ; remembered with them', () => {
    const g = studio(2);
    const p0 = startGame(g);
    const emp = g.state.empirians[1]!;
    expect(forceEvent(g.state, 'team_idea', noop)).toBe(true);
    expect(g.state.pendingDecision!.speakerId).toBe(emp.id);
    g.state.pendingDecision = null;
    const out = ['adopt', 'save', 'decline'].map((o) => {
      const c = clone(g);
      choose(c, 'team_idea', o);
      const p = getProject(c.state, p0.id)!;
      return { o, work: p.requiredPoints, ceiling: p.ceilingMods.reduce((a, m) => a + m.amount, 0), saved: (c.state.company.savedIdeas ?? []).length, morale: c.state.empirians[1]!.morale, mem: c.state.story.memories.at(-1)! };
    });
    const [adopt, save, decline] = out as [typeof out[0], typeof out[0], typeof out[0]];
    expect(adopt.ceiling).toBeGreaterThan(decline.ceiling);
    expect(adopt.work).toBeGreaterThan(decline.work);
    expect(save.saved).toBe(decline.saved + 1);
    expect(adopt.morale).toBeGreaterThan(save.morale);
    expect(save.morale).toBeGreaterThan(decline.morale);
    expect(adopt.mem.empirianIds).toEqual([emp.id]);
    // Once per project.
    const c = clone(g);
    choose(c, 'team_idea', 'adopt');
    expect(forceEvent(c.state, 'team_idea', noop)).toBe(false);
  });

  it('a client asks for changes: paid, favour or refuse have different money, work and reputation', () => {
    const g = studio(3);
    g.state.contracts.active = { id: 'C-1', clientId: 'Nubo', kind: 'website', focus: 0.6, work: 200, days: 20, payment: 4000, expiresDay: 99, startDay: 0, dueDay: 20, done: 100, causeId: 'x' };
    const out = ['paid', 'favour', 'refuse'].map((o) => { const c = clone(g); choose(c, 'contract_change', o); return { ...c.state.contracts.active!, rep: c.state.company.reputation }; });
    const [paid, favour, refuse] = out as [typeof out[0], typeof out[0], typeof out[0]];
    expect(paid.payment).toBeGreaterThan(refuse.payment);
    expect(paid.dueDay).toBeGreaterThan(refuse.dueDay);
    expect(favour.payment).toBe(refuse.payment);
    expect(favour.work).toBeGreaterThan(refuse.work);
    expect(paid.work).toBeGreaterThan(favour.work);
    expect(favour.rep).toBeGreaterThan(refuse.rep);
    expect(forceEvent(clone(g).state, 'contract_change', noop)).toBe(true);
    const c = clone(g); choose(c, 'contract_change', 'paid');
    expect(forceEvent(c.state, 'contract_change', noop)).toBe(false); // only once per contract
  });

  it('a game fair: the booth costs more and brings more interest than a table', () => {
    const g = studio(4);
    const p0 = startGame(g);
    until(g, () => getProject(g.state, p0.id)!.phase === 'production');
    const out = ['booth', 'table', 'skip'].map((o) => { const c = clone(g); choose(c, 'game_fair', o); return { money: c.state.company.money, hype: getProject(c.state, p0.id)!.hype, mem: c.state.story.memories.at(-1)! }; });
    const [booth, table, skip] = out as [typeof out[0], typeof out[0], typeof out[0]];
    expect(booth.hype).toBeGreaterThan(table.hype);
    expect(table.hype).toBeGreaterThan(skip.hype);
    expect(skip.money - booth.money).toBe(K.fairBooth);
    expect(skip.money - table.money).toBe(K.fairTable);
    expect(booth.mem.empirianIds).toHaveLength(2); // the whole team went
  });

  it('an influential critic: sending the game is a bet on its real quality', () => {
    const g = studio(5);
    const p0 = startGame(g);
    until(g, () => !g.state.activeProjectId);
    for (let i = 0; i < 4 * SIM_CONFIG.ticksPerDay; i++) step(g);
    const sales = (score: number, o: string) => {
      const c = clone(g);
      getProject(c.state, p0.id)!.result!.averageScore = score;
      choose(c, 'influential_review', o);
      for (let i = 0; i < 35 * SIM_CONFIG.ticksPerDay; i++) step(c);
      return getProject(c.state, p0.id)!.result!.revenue;
    };
    expect(sales(8, 'send_copy')).toBeGreaterThan(sales(8, 'interview'));
    expect(sales(8, 'interview')).toBeGreaterThan(sales(8, 'decline'));
    expect(sales(4.5, 'send_copy')).toBeLessThan(sales(4.5, 'decline'));
  });

  it('two people disagree: each side changes work and bugs in opposite ways', () => {
    const g = studio(6);
    const p0 = startGame(g);
    until(g, () => getProject(g.state, p0.id)!.phase === 'production' && productionProgress(getProject(g.state, p0.id)!) > 0.2);
    const out = ['clean', 'fast', 'both'].map((o) => {
      const c = clone(g);
      choose(c, 'team_debate', o);
      const p = getProject(c.state, p0.id)!;
      return { work: p.requiredPoints, bugs: p.bugRateMods.reduce((a, m) => a * m.factor, 1), ids: c.state.story.memories.at(-1)!.empirianIds };
    });
    const [clean, fast, both] = out as [typeof out[0], typeof out[0], typeof out[0]];
    expect(clean.work).toBeGreaterThan(both.work);
    expect(both.work).toBeGreaterThan(fast.work);
    expect(clean.bugs).toBeLessThan(both.bugs);
    expect(fast.bugs).toBeGreaterThan(both.bugs);
    expect(clean.ids).toHaveLength(2);
  });

  it('a training request: the course teaches most and costs most; refusing hurts morale', () => {
    const g = studio(7);
    g.state.day = 30;
    const emp = () => g.state.empirians[1]!;
    const skill = emp().skills.tech >= emp().skills.design ? 'tech' : 'design';
    const out = ['course', 'books', 'not_now'].map((o) => { const c = clone(g); choose(c, 'training_request', o); const e = c.state.empirians[1]!; return { skill: e.skills[skill], money: c.state.company.money, morale: e.morale }; });
    const [course, books, no] = out as [typeof out[0], typeof out[0], typeof out[0]];
    expect(course.skill).toBeGreaterThan(books.skill);
    expect(books.skill).toBeGreaterThan(no.skill);
    expect(course.money).toBeLessThan(books.money);
    expect(no.morale).toBeLessThan(books.morale);
  });

  it('texts exist in both languages for every event, option, hint and story entry', () => {
    const g = studio(8);
    const p0 = startGame(g, 'medium');
    until(g, () => getProject(g.state, p0.id)!.phase === 'production' && productionProgress(getProject(g.state, p0.id)!) > 0.2);
    g.state.day = Math.max(g.state.day, 30);
    g.state.contracts.active = { id: 'C-1', clientId: 'Nubo', kind: 'website', focus: 0.6, work: 200, days: 20, payment: 4000, expiresDay: 999, startDay: 0, dueDay: g.state.day + 20, done: 100, causeId: 'x' };
    for (const def of STORY_EVENTS) {
      if (def.kind === 'influential_review') continue; // covered below with a released game
      const c = clone(g);
      expect(forceEvent(c.state, def.kind, noop), def.kind).toBe(true);
      for (const ref of texts(c)) { expect(es[ref.key], ref.key).toBeTruthy(); expect(en[ref.key], ref.key).toBeTruthy(); }
      for (const o of c.state.pendingDecision!.options) expect(es[`ledger.event.${def.kind}.${o.id}`] ?? es[`ledger.event.${def.kind}.${o.id}_good`], `${def.kind}.${o.id}`).toBeTruthy();
    }
    for (const v of ['send_copy_good', 'send_copy_mixed', 'send_copy_bad', 'interview', 'decline']) expect(en[`ledger.event.influential_review.${v}`]).toBeTruthy();
  });

  it('are rare, deterministic and saved: at most two per project and a gap between them', () => {
    const run = () => {
      const g = studio(9);
      g.state.eventLog.lastDay = null;
      const days: number[] = [];
      for (let n = 0; n < 4; n++) {
        const p = startGame(g, 'medium');
        until(g, () => !g.state.activeProjectId, 60000);
        expect(getProject(g.state, p.id)!.eventsSeen ?? 0).toBeLessThanOrEqual(SIM_CONFIG.events.maxPerProject);
      }
      for (const l of g.state.ledger) if (l.text.key.startsWith('ledger.event.')) days.push(l.day);
      return { days, json: JSON.stringify(g.state.story) };
    };
    const a = run();
    expect(a).toEqual(run());
    for (let i = 1; i < a.days.length; i++) expect(a.days[i]! - a.days[i - 1]!).toBeGreaterThanOrEqual(SIM_CONFIG.events.minGapDays);
    // A pending story event (with its speaker) survives save/load.
    const g = studio(10);
    startGame(g);
    expect(forceEvent(g.state, 'team_idea', noop)).toBe(true);
    const back = deserialize(serialize(g.state, { gameVersion: 't', savedAt: 't' }));
    expect(back.pendingDecision).toEqual(g.state.pendingDecision);
    expect(new Game(back).dispatch({ type: 'choose_option', decisionId: back.pendingDecision!.id, optionId: 'adopt' }).ok).toBe(true);
  });
});
