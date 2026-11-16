import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { autoplayCareer } from '../../src/sim/autoplay';
import { estimateDays, settlement } from '../../src/sim/systems/contracts';
import { deserialize, serialize } from '../../src/sim/save/save';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function newGame(seed = 1) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  return g;
}
function tickUntil(g: Game, cond: () => boolean, max = 20000) {
  for (let i = 0; i < max && !cond(); i++) {
    const d = g.state.pendingDecision;
    if (d) g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id });
    else g.tick();
  }
}
function contractsCareer(seed: number, days: number) {
  const g = newGame(seed);
  let late = 0, done = 0;
  g.onUpdate((ev) => { for (const e of ev) if (e.type === 'contract_done') { done++; if (e.lateDays > 0) late++; } });
  while (g.state.day < days) {
    const d = g.state.pendingDecision;
    if (d) { g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: d.options[d.options.length - 1]!.id }); continue; }
    if (!g.state.contracts.active && g.state.contracts.offers.length) {
      const best = [...g.state.contracts.offers].sort((a, b) => b.payment / estimateDays(g.state, b.work, b.focus) - a.payment / estimateDays(g.state, a.work, a.focus))[0]!;
      g.dispatch({ type: 'accept_contract', offerId: best.id });
    }
    g.tick();
  }
  return { g, done, late };
}

describe('external contracts (LS.8)', () => {
  it('offers arrive weekly, expire, and are deterministic', () => {
    const a = newGame(4), b = newGame(4);
    tickUntil(a, () => a.state.day >= 30);
    tickUntil(b, () => b.state.day >= 30);
    expect(a.state.contracts.offers.length).toBeGreaterThan(0);
    expect(JSON.stringify(a.state.contracts)).toBe(JSON.stringify(b.state.contracts));
    for (const o of a.state.contracts.offers) expect(o.expiresDay).toBeGreaterThan(a.state.day);
  });

  it('accepting, working and delivering pays the promised amount and gives experience', () => {
    const g = newGame(5);
    tickUntil(g, () => g.state.contracts.offers.length > 0);
    const o = g.state.contracts.offers[0]!;
    const money0 = g.state.company.money;
    const xp0 = g.state.empirians[0]!.xp.tech + g.state.empirians[0]!.xp.design;
    expect(g.dispatch({ type: 'accept_contract', offerId: o.id }).ok).toBe(true);
    expect(g.dispatch({ type: 'start_project', name: 'X', topicId: 'kart', size: 'small', focus: 0.5, budget: 0, days: 30, price: 9.99 })).toEqual({ ok: false, error: 'contract_in_progress' });
    let paid = 0;
    g.onUpdate((ev) => { for (const e of ev) if (e.type === 'contract_done') paid = e.pay; });
    tickUntil(g, () => !g.state.contracts.active);
    expect(paid).toBeGreaterThan(0);
    expect(paid).toBeGreaterThanOrEqual(Math.round(o.payment * 0.4));
    expect(g.state.company.money).toBeGreaterThan(money0 + paid - (g.state.day - 1) * 50);
    expect(g.state.empirians[0]!.xp.tech + g.state.empirians[0]!.xp.design).toBeGreaterThan(xp0);
    expect(g.state.contracts.completed).toBe(1);
  });

  it('lateness reduces the payment (capped); early delivery earns a bonus', () => {
    const a = { id: 'C', clientId: 'gym', kind: 'app', focus: 0.5, work: 100, days: 20, payment: 1000, expiresDay: 99, startDay: 0, dueDay: 20, done: 0, causeId: 'L' };
    expect(settlement(a, 20).pay).toBe(1000);
    expect(settlement(a, 25).pay).toBe(800);
    expect(settlement(a, 200).pay).toBe(400);
    expect(settlement(a, 10).pay).toBe(1100);
  });

  it('cancelling costs reputation and pays nothing', () => {
    const g = newGame(6);
    tickUntil(g, () => g.state.contracts.offers.length > 0);
    g.dispatch({ type: 'accept_contract', offerId: g.state.contracts.offers[0]!.id });
    const rep = g.state.company.reputation;
    const money = g.state.company.money;
    expect(g.dispatch({ type: 'cancel_contract' }).ok).toBe(true);
    expect(g.state.company.reputation).toBeLessThan(rep);
    expect(g.state.company.money).toBe(money);
  });

  it('contracts are a safe alternative, not a dominant strategy (and are rarely late with honest estimates)', () => {
    const seeds = [300, 301, 302, 303, 304, 305];
    const games = seeds.map((s) => autoplayCareer(s, 8));
    const days = Math.round(mean(games.map((c) => c.game.state.day)));
    const gamesPerDay = (mean(games.map((c) => c.game.state.company.money)) - 8000) / days;
    const cs = seeds.map((s) => contractsCareer(s, days));
    const contractsPerDay = (mean(cs.map((c) => c.g.state.company.money)) - 8000) / days;
    expect(contractsPerDay).toBeGreaterThan(gamesPerDay * 0.3);
    expect(contractsPerDay).toBeLessThan(gamesPerDay * 0.7);
    const late = cs.reduce((a, c) => a + c.late, 0) / cs.reduce((a, c) => a + c.done, 0);
    expect(late).toBeLessThan(0.2);
  });

  it('an active contract survives save/load; old saves migrate', () => {
    const g = newGame(7);
    tickUntil(g, () => g.state.contracts.offers.length > 0);
    g.dispatch({ type: 'accept_contract', offerId: g.state.contracts.offers[0]!.id });
    for (let i = 0; i < 40; i++) g.tick();
    expect(deserialize(serialize(g.state, { gameVersion: 't', savedAt: 't' }))).toEqual(g.state);
    const old = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    expect(old.contracts.active).toBeNull();
    expect(old.contracts.offers).toEqual([]);
  });
});
