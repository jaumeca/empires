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
    const crunch = avg({ pace: 'crunch', days: 42, moments: { exhausted: 'push' } });
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

describe('no dominant strategy (gameplay review, D-030)', () => {
  const perDay = (plan: Omit<AutoplayPlan, 'seed'>) => {
    const runs = SEEDS.map((seed) => autoplay({ ...plan, seed }));
    return mean(runs.map((r) => r.profit)) / mean(runs.map((r) => r.releaseDay));
  };
  it('no answer to the big idea beats every other by a wide margin (profit per day)', () => {
    const v = (['approve', 'simple', 'keep'] as const).map((bigIdea) => perDay({ bigIdea, days: 42 }));
    expect(Math.max(...v) / Math.min(...v)).toBeLessThan(1.3);
  });
  it('approving the big idea is a gamble: outcomes vary more than keeping the plan', () => {
    const spread = (bigIdea: 'approve' | 'keep') => {
      const sc = SEEDS.map((seed) => autoplay({ seed, bigIdea }).score);
      return Math.max(...sc) - Math.min(...sc);
    };
    expect(spread('approve')).toBeGreaterThan(spread('keep'));
  });
  it('crunch works as a sprint on a tight deadline, not as a permanent pace', () => {
    expect(avg({ days: 28, crunchLastDays: 7 }).profit).toBeGreaterThan(avg({ days: 28 }).profit);
    // Permanent crunch while ignoring exhaustion is worse than a normal pace...
    expect(avg({ days: 28, pace: 'crunch', moments: { exhausted: 'push' } }).profit).toBeLessThan(avg({ days: 28 }).profit);
    // ...and on a comfortable deadline crunching brings (almost) nothing.
    expect(avg({ days: 84, pace: 'crunch' }).profit).toBeLessThan(avg({ days: 84 }).profit * 1.05);
  });
  it('resting pays off on long projects', () => {
    expect(avg({ size: 'medium', days: 119, restBelowEnergy: 45 }).profit).toBeGreaterThan(avg({ size: 'medium', days: 119 }).profit);
  });
  it('small and medium games are both viable (profit per day within 35 %)', () => {
    const small = perDay({ size: 'small', days: 42 });
    const medium = perDay({ size: 'medium', days: 119 });
    expect(Math.max(small, medium) / Math.min(small, medium)).toBeLessThan(1.35);
  });
  it('a medium game needs its time: rushing it is punished', () => {
    expect(avg({ size: 'medium', days: 70 }).score).toBeLessThan(avg({ size: 'medium', days: 119 }).score - 0.4);
  });
});

describe('contextual Decisive Moments (F3.1)', () => {
  it('the best polish plan depends on the time left', () => {
    const best = (days: number) => {
      const r = (['test', 'balanced', 'improve'] as const).map((o) => [o, avg({ days, moments: { polish_plan: o } }).profit] as const);
      return r.sort((a, b) => b[1] - a[1])[0]![0];
    };
    expect(best(28)).toBe('test');
    expect(best(84)).toBe('improve');
  });
  it('when exhausted, pushing on ships more bugs than resting', () => {
    const push = avg({ days: 28, pace: 'crunch', moments: { exhausted: 'push' } });
    const rest = avg({ days: 28, pace: 'crunch', moments: { exhausted: 'rest' } });
    expect(push.bugs).toBeGreaterThan(rest.bugs);
    expect(push.score).toBeLessThan(rest.score);
  });
  it('when running late, cutting scope and delaying lead to different outcomes', () => {
    const base = { days: 21, budget: 0, atDeadline: 'release' as const };
    const carry = avg({ ...base, moments: { running_late: 'carry_on' } });
    const cut = avg({ ...base, moments: { running_late: 'cut' } });
    const delay = avg({ ...base, moments: { running_late: 'delay' } });
    expect(cut.score).toBeGreaterThan(carry.score); // a finished smaller game beats an unfinished one
    expect(delay.score).toBeGreaterThan(carry.score);
    expect(cut.score).not.toBeCloseTo(delay.score, 1);
  });
  it('moments respect the pacing rules and are recorded in the ledger', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const r = autoplay({ seed, days: 21, pace: 'crunch', focus: 1, topicId: 'kart', moments: { exhausted: 'push' } });
      const p = r.state.projects[0]!;
      expect((p.momentsOffered ?? []).length).toBeLessThanOrEqual(3);
      expect(new Set(p.momentsOffered).size).toBe((p.momentsOffered ?? []).length);
      expect(r.state.ledger.filter((e) => e.projectId === p.id && ['decision', 'pace_changed', 'testing_changed', 'delay'].includes(e.kind)).length).toBeGreaterThanOrEqual((p.momentsOffered ?? []).length);
    }
  });
});
