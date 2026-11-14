import { describe, expect, it } from 'vitest';
import { estimatePlan, estimateProgress } from '../../src/sim/estimates';
import { autoplay } from '../../src/sim/autoplay';
import { createNewGame, getFounder } from '../../src/sim/state';

describe('player estimates', () => {
  it('plan verdict reacts to the chosen duration', () => {
    const f = getFounder(createNewGame(1));
    expect(estimatePlan(f, 'small', 0.5, 1000, 14).verdict).toBe('too_short');
    expect(estimatePlan(f, 'small', 0.5, 1000, 120).verdict).toBe('generous');
    const e = estimatePlan(f, 'medium', 0.5, 1000, 42);
    expect(e.productionDays[0]).toBeLessThan(e.productionDays[1]);
  });
  it('progress estimates bracket the truth loosely and are deterministic', () => {
    const { state } = autoplay({ seed: 3, weeksAfter: 0 });
    const p = state.projects[0]!;
    const f = getFounder(state);
    const a = estimateProgress(p, f);
    expect(a).toEqual(estimateProgress(p, f));
    expect(a.quality[0]).toBeLessThanOrEqual(a.quality[1]);
  });
});
