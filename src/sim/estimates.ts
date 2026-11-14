import { SIM_CONFIG } from './config';
import type { Empirian, Project, ProjectSize } from './model/state';
import { pointsPerTick, trueQuality } from './systems/project';

/**
 * Player-facing estimates (GDD §8.2): derived from the true values but with
 * uncertainty, so the UI shows ranges instead of exact future outcomes.
 * Pure and deterministic.
 */

export interface PlanEstimate {
  productionDays: [number, number];
  /** Days left for polish/testing inside the chosen deadline (can be negative). */
  polishDays: number;
  verdict: 'too_short' | 'tight' | 'ok' | 'generous';
}

export function estimatePlan(founder: Empirian, size: ProjectSize, focus: number, budget: number, days: number): PlanEstimate {
  const required = SIM_CONFIG.work.requiredPoints[size] ?? 220;
  const fake = {
    focus, pace: 'normal', budget, spent: 0, startDay: 0, originalDeadlineDay: days,
  } as unknown as Project;
  const perDay = pointsPerTick(fake, { ...founder, energy: 80 }) * SIM_CONFIG.ticksPerDay;
  const mid = required / Math.max(0.1, perDay);
  const productionDays: [number, number] = [Math.round(mid * 0.85), Math.round(mid * 1.25)];
  const polishDays = Math.round(days - mid);
  const verdict = days < mid ? 'too_short' : days < mid * 1.3 ? 'tight' : days < mid * 2.2 ? 'ok' : 'generous';
  return { productionDays, polishDays, verdict };
}

export interface ProgressEstimate {
  quality: [number, number];
  hiddenBugs: [number, number];
}

/** Uncertainty shrinks as the team tests more. */
export function estimateProgress(p: Project, founder: Empirian): ProgressEstimate {
  const q = trueQuality(p, founder);
  const confidence = p.testingDone / (p.testingDone + 25);
  const spread = 1.6 * (1 - confidence) + 0.4;
  const lo = Math.max(0, Math.round((q - spread) * 2) / 2);
  const hi = Math.min(10, Math.round((q + spread) * 2) / 2);
  const h = p.bugs.hidden;
  const bugLo = Math.max(0, Math.floor(h * (0.4 + 0.5 * confidence)));
  const bugHi = Math.ceil(h * (1.8 - 0.7 * confidence)) + (confidence < 0.5 ? 2 : 0);
  return { quality: [lo, hi], hiddenBugs: [bugLo, bugHi] };
}
