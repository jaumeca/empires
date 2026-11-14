import { describe, expect, it } from 'vitest';
import { createRngState, nextFloat, sampleCount } from '../../src/sim/core/rng';

describe('seeded RNG', () => {
  it('same seed => same sequence', () => {
    const a = createRngState(42, 'x');
    const b = createRngState(42, 'x');
    for (let i = 0; i < 100; i++) expect(nextFloat(a)).toBe(nextFloat(b));
  });
  it('different seeds or streams differ', () => {
    expect(nextFloat(createRngState(1, 'x'))).not.toBe(nextFloat(createRngState(2, 'x')));
    expect(nextFloat(createRngState(1, 'x'))).not.toBe(nextFloat(createRngState(1, 'y')));
  });
  it('floats are in [0,1) and roughly uniform', () => {
    const s = createRngState(7);
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const f = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      sum += f;
    }
    expect(sum / 10000).toBeGreaterThan(0.48);
    expect(sum / 10000).toBeLessThan(0.52);
  });
  it('sampleCount has the requested mean', () => {
    const s = createRngState(9);
    let total = 0;
    for (let i = 0; i < 10000; i++) total += sampleCount(s, 0.3);
    expect(total / 10000).toBeCloseTo(0.3, 1);
  });
});
