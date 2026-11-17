import { describe, expect, it } from 'vitest';
import { career, mean, STRATEGIES } from '../../tools/sim-runner/careers';

/**
 * Economy invariants after LS.9 (D-042). Whole-year careers, headless.
 * Guards the measured shape of the economy, not exact numbers.
 */
// 12 seeds: with 6, adding a random event reshuffles luck enough to flip a 5 % margin (measured, D-055).
const seeds = Array.from({ length: 12 }, (_, i) => 4200 + i);
const byPrefix = (p: string) => STRATEGIES.find((s) => s.name.startsWith(p))!;
const year = (p: string) => seeds.map((s) => career(s, byPrefix(p), 365));
const money = (rs: ReturnType<typeof year>) => mean(rs.map((r) => r.money));

describe('economy review (LS.9)', () => {
  const A = year('A');
  const C = year('C');
  const D = year('D');
  const E = year('E');
  const F = year('F');
  const B = year('B');
  const I = year('I');

  it('a small studio is viable: money never goes negative in the first year', () => {
    for (const r of [...A, ...C, ...D, ...E]) expect(r.minMoney).toBeGreaterThan(0);
  });

  it('contracts are a safe, lower-yield alternative', () => {
    expect(money(C)).toBeLessThan(money(A) * 0.75);
    const spread = (rs: typeof A) => Math.max(...rs.map((r) => r.money)) - Math.min(...rs.map((r) => r.money));
    expect(spread(C)).toBeLessThan(spread(A));
    // Mixing in contracts after flops does not hurt much. Since the story events (fairs and
    // critics reward games) it is 0.94–1.0× pure games over 52 seeds (D-055).
    expect(money(D)).toBeGreaterThan(money(A) * 0.92);
  });

  it('office investment pays back, with diminishing returns (the expensive office is not much better)', () => {
    const gainE = money(E) - money(A);
    const gainF = money(F) - money(A);
    expect(gainE).toBeGreaterThan(0);
    // F spends ~2.7x more than E but earns far less than 2.7x the extra.
    expect(gainF).toBeLessThan(gainE * 1.6);
  });

  it('growing to medium games pays more when the office keeps the founder rested', () => {
    expect(money(I)).toBeGreaterThan(money(B));
  });
});
