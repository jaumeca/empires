import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoplay, autoplayCareer } from '../../src/sim/autoplay';
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { demandFactor, topicMood, trendMultiplier, trendShape } from '../../src/sim/systems/world';
import { getTopic, TOPICS } from '../../src/content/topics';
import { deserialize } from '../../src/sim/save/save';
import type { GameState } from '../../src/sim/model/state';
import type { SimEvent } from '../../src/sim/core/events';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ideal = (id: string) => ({ topicId: id, focus: getTopic(id).idealFocus });

/** Runs a quiet world (no project) for `days`, recording each news with the state change it reports. */
function runWorld(seed: number, days: number) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'A', companyName: 'A', appearance: DEFAULT_APPEARANCE });
  const checks: { kind: string; ok: boolean }[] = [];
  let lastEconomy = g.state.world.economy;
  g.onUpdate((events: SimEvent[], s: GameState) => {
    for (const e of events) {
      if (e.type !== 'news') continue;
      const n = s.world.news.find((x) => x.id === e.newsId)!;
      const topic = n.params.topic as string;
      let ok = false;
      switch (n.kind) {
        case 'trend_rising': ok = s.world.trends.some((t) => t.topicId === topic && t.startDay === s.day && trendMultiplier(s.world, topic, s.day + 14) > 1); break;
        case 'trend_peak': ok = s.world.trends.some((t) => t.topicId === topic && s.day >= t.peakDay); break;
        case 'trend_over': ok = trendMultiplier(s.world, topic, s.day) === 1 || s.world.trends.some((t) => t.topicId === topic && t.startDay === s.day); break;
        case 'competitor_release': ok = (s.world.competition[topic] ?? 0) > 0; break;
        case 'economy_up': ok = s.world.economy > lastEconomy; break;
        case 'economy_down': ok = s.world.economy < lastEconomy; break;
        case 'tool_tech': case 'tool_design': ok = !!s.world.toolBoost && s.world.toolBoost.untilDay > s.day; break;
        case 'revival': ok = Object.values(s.world.revivals).some((d) => d > s.day); break;
      }
      checks.push({ kind: n.kind, ok });
    }
    lastEconomy = s.world.economy;
  });
  for (let i = 0; i < days * 8; i++) g.tick();
  return { g, checks };
}

describe('Empires Daily world (LS.5)', () => {
  it('is deterministic for a seed', () => {
    expect(JSON.stringify(runWorld(5, 300).g.state.world)).toBe(JSON.stringify(runWorld(5, 300).g.state.world));
    expect(JSON.stringify(runWorld(5, 300).g.state.world)).not.toBe(JSON.stringify(runWorld(6, 300).g.state.world));
  });

  it('every headline corresponds to a real change in the simulated state', () => {
    const all = [1, 2, 3].flatMap((seed) => runWorld(seed, 500).checks);
    expect(all.length).toBeGreaterThan(30);
    const bad = all.filter((c) => !c.ok);
    expect(bad.map((b) => b.kind)).toEqual([]);
    const kinds = new Set(all.map((c) => c.kind));
    for (const k of ['trend_rising', 'trend_peak', 'trend_over', 'competitor_release']) expect(kinds).toContain(k);
  });

  it('trends rise, peak and fade; demand follows', () => {
    const t = { id: 'T', topicId: 'kart', startDay: 10, peakDay: 50, endDay: 100, strength: 1, peakAnnounced: false, endAnnounced: false };
    expect(trendShape(t, 5)).toBe(0);
    expect(trendShape(t, 30)).toBeCloseTo(0.5);
    expect(trendShape(t, 50)).toBe(1);
    expect(trendShape(t, 75)).toBeCloseTo(0.5);
    expect(trendShape(t, 100)).toBe(0);
    const s = createNewGame(1);
    const calm = demandFactor(s, 'kart', 50);
    s.world.trends.push(t);
    expect(demandFactor(s, 'kart', 50)).toBeCloseTo(calm * 2);
    s.world.competition.kart = 1;
    expect(demandFactor(s, 'kart', 50)).toBeCloseTo(calm);
    expect(topicMood(s, 'kart')).toBe('crowded');
  });

  it('a trend at release time multiplies demand for that topic only', () => {
    const calm = createNewGame(9);
    const s = createNewGame(9);
    s.world.trends.push({ id: 'T', topicId: 'kart', startDay: 1, peakDay: 45, endDay: 120, strength: 1, peakAnnounced: false, endAnnounced: false });
    expect(demandFactor(s, 'kart', 45)).toBeCloseTo(demandFactor(calm, 'kart', 45) * 2);
    expect(demandFactor(s, 'robots', 45)).toBeCloseTo(demandFactor(calm, 'robots', 45));
  });

  it('no dominant strategy: chasing any trend loses; anticipating is viable but not automatically best', () => {
    const seeds = Array.from({ length: 10 }, (_, i) => 700 + i);
    const money = (pol: (i: number, s: GameState) => object) => mean(seeds.map((sd) => autoplayCareer(sd, 8, pol as never).moneyAfter[7]!));
    const chase = money((_i, s) => { const t = s.world.trends.filter((x) => s.day >= x.startDay && s.day < x.endDay).sort((a, b) => b.strength - a.strength)[0]; return ideal(t ? t.topicId : 'pirates'); });
    const stay = money(() => ideal('pirates'));
    const early = money((_i, s) => { const t = s.world.trends.find((x) => s.day - x.startDay <= 14 && s.day < x.peakDay); return ideal(t ? t.topicId : 'pirates'); });
    expect(chase).toBeLessThan(stay * 0.85);
    expect(chase).toBeLessThan(early * 0.85);
    expect(Math.abs(early / stay - 1)).toBeLessThan(0.12);
  });
});

describe('products with a life of their own (LS.6)', () => {
  it('keep selling a little after the launch weeks, then stop', () => {
    const r = autoplay({ seed: 3, weeksAfter: 60 });
    const res = r.state.projects[0]!.result!;
    expect(res.tailWeeks ?? 0).toBeGreaterThan(3);
    expect(res.salesEnded).toBe(true);
    const launch = res.weeklySales.reduce((a, b) => a + b, 0);
    expect(res.tailUnits ?? 0).toBeGreaterThan(0);
    expect(res.tailUnits ?? 0).toBeLessThan(launch * 0.35);
  });
  it('a revival of the topic brings an old game back to life', () => {
    const base = autoplay({ seed: 3, weeksAfter: 12 });
    const s = base.state;
    const p = s.projects[0]!;
    const g = new Game(JSON.parse(JSON.stringify(s)));
    const g2 = new Game(JSON.parse(JSON.stringify(s)));
    g2.state.world.revivals[p.id] = g2.state.day + 60;
    for (let i = 0; i < 8 * 7 * 6; i++) { g.tick(); g2.tick(); }
    expect(g2.state.projects[0]!.result!.totalUnits).toBeGreaterThan(g.state.projects[0]!.result!.totalUnits);
  });
  it('old saves get a calm world and keep loading', () => {
    const st = deserialize(readFileSync('tests/fixtures/save-v1-released.empires', 'utf8'));
    expect(st.world.trends).toEqual([]);
    expect(st.rng.world).toHaveLength(4);
    const g = new Game(st);
    for (let i = 0; i < 8 * 60; i++) g.tick();
    expect(g.state.world.news.length).toBeGreaterThan(0);
  });
  it('topics are all represented in the world model', () => {
    for (const t of TOPICS) expect(typeof demandFactor(createNewGame(1), t.id)).toBe('number');
  });
});
