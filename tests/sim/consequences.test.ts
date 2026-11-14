import { describe, expect, it } from 'vitest';
import { autoplay, type AutoplayPlan } from '../../src/sim/autoplay';

const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function avg(plan: Omit<AutoplayPlan, 'seed'>) {
  const runs = SEEDS.map((seed) => autoplay({ ...plan, seed }));
  return {
    score: mean(runs.map((r) => r.score)),
    profit: mean(runs.map((r) => r.profit)),
    bugs: mean(runs.map((r) => r.shippedBugs)),
    revenue: mean(runs.map((r) => r.revenue)),
  };
}

describe('schedule consequences: more time has diminishing returns', () => {
  const durations = [28, 42, 56, 84, 112];
  const results = durations.map((days) => avg({ days, budget: 1200 }));

  it('more time does not reduce the score on average', () => {
    for (let i = 1; i < results.length; i++) expect(results[i]!.score).toBeGreaterThanOrEqual(results[i - 1]!.score - 0.15);
  });
  it('score gains shrink as time grows', () => {
    const gainEarly = results[1]!.score - results[0]!.score;
    const gainLate = results[4]!.score - results[3]!.score;
    expect(gainEarly).toBeGreaterThan(gainLate);
  });
  it('the most time is NOT the most profitable (interior optimum)', () => {
    const profits = results.map((r) => r.profit);
    const best = profits.indexOf(Math.max(...profits));
    expect(best).toBeLessThan(durations.length - 1);
  });
});

describe('budget consequences', () => {
  it('a budget improves the result, but with diminishing returns', () => {
    const none = avg({ budget: 0, days: 35 });
    const mid = avg({ budget: 2000, days: 35 });
    const huge = avg({ budget: 6000, days: 35 });
    expect(mid.score).toBeGreaterThan(none.score);
    expect(huge.score - mid.score).toBeLessThan(mid.score - none.score);
  });
  it('a bigger budget is not automatically more profitable', () => {
    const none = avg({ budget: 0, days: 42 });
    const big = avg({ budget: 4000, days: 42 });
    const huge = avg({ budget: 7500, days: 42 });
    // Marginal profit per euro shrinks, and past a point it stops paying off.
    expect((huge.profit - big.profit) / 3500).toBeLessThan((big.profit - none.profit) / 4000);
    expect(huge.profit).toBeLessThan(big.profit + 300);
  });
});

describe('testing and pace consequences', () => {
  it('less testing ships more bugs and scores worse', () => {
    const low = avg({ testFocus: 0.05, days: 49 });
    const high = avg({ testFocus: 0.85, days: 49 });
    expect(low.bugs).toBeGreaterThan(high.bugs);
    expect(low.score).toBeLessThan(high.score);
  });
  it('crunch ships more bugs than a normal pace', () => {
    const normal = avg({ pace: 'normal', days: 42 });
    const crunch = avg({ pace: 'crunch', days: 42 });
    expect(crunch.bugs).toBeGreaterThan(normal.bugs);
  });
});

describe('decisions have real consequences', () => {
  it('approving the big idea changes quality and timing', () => {
    const keep = avg({ bigIdea: 'keep', days: 42, atDeadline: 'extend7' });
    const approve = avg({ bigIdea: 'approve', days: 42, atDeadline: 'extend7' });
    expect(approve.score).not.toBeCloseTo(keep.score, 1);
  });
  it('releasing an unfinished game is punished', () => {
    const rushed = avg({ days: 14, atDeadline: 'release' });
    const normal = avg({ days: 42, atDeadline: 'release' });
    expect(rushed.score).toBeLessThan(normal.score - 1);
  });
  it('every release has an explanation linked to the causal ledger', () => {
    const r = autoplay({ seed: 5, bigIdea: 'approve', pace: 'crunch' });
    const p = r.state.projects[0]!;
    expect(p.result!.explanation.length).toBeGreaterThan(0);
    for (const id of p.result!.explanation) expect(r.state.ledger.some((e) => e.id === id)).toBe(true);
  });
});
