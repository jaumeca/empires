import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { entriesFor, record } from '../core/ledger';
import { nextRange } from '../core/rng';
import type { Empirian, GameState, Project, Review, TextRef } from '../model/state';
import { getTopic, TOPICS } from '../../content/topics';
import { compactHistory } from './history';
import { demandFactor, worldWeek } from './world';
import { gainXp } from './progression';
import { fitModifier, investmentRatio, productionProgress, qualityCeiling, trueQuality } from './project';

const C = SIM_CONFIG;

/** Fictional review outlets (ids; display names in i18n `outlet.<id>`). */
export const OUTLETS = ['pixelpost', 'tecla', 'bitacora', 'arcade'] as const;

function quoteFor(score: number): TextRef {
  if (score >= 8.5) return { key: 'review.q5' };
  if (score >= 7) return { key: 'review.q4' };
  if (score >= 5.5) return { key: 'review.q3' };
  if (score >= 4) return { key: 'review.q2' };
  return { key: 'review.q1' };
}

interface Factor {
  amount: number; // effect on score, signed
  text: TextRef;
  causes: string[];
}

/** Scores the product, records explanatory ledger entries and starts sales. */
export function releaseProject(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (p.phase === 'released') return;
  const quality = trueQuality(p, founder);
  const prog = productionProgress(p);
  const shippedBugs = p.bugs.hidden + p.bugs.known;
  const bugPenalty = 2.4 * (1 - Math.exp(-shippedBugs / 12));
  const incompletePenalty = (1 - prog) * 6;
  const repMod = (state.company.reputation - 50) / 100;
  const base = quality - bugPenalty - incompletePenalty + repMod;

  const reviews: Review[] = OUTLETS.map((outlet) => {
    const s = Math.max(1, Math.min(10, base + nextRange(state.rng.market, -0.7, 0.7)));
    const score = Math.round(s * 10) / 10;
    return { outlet, score, quote: quoteFor(score) };
  });
  const averageScore = Math.round((reviews.reduce((a, r) => a + r.score, 0) / reviews.length) * 10) / 10;

  // --- Explanation: build factors with links to their causes ----------------
  const started = entriesFor(state, p.id, ['project_started']).map((e) => e.id);
  const timeCauses = entriesFor(state, p.id, ['delay', 'deadline_changed', 'budget_changed', 'decision']).map((e) => e.id);
  const bugCauses = entriesFor(state, p.id, ['pace_changed', 'testing_changed', 'decision']).map((e) => e.id);
  const factors: Factor[] = [];
  const fit = fitModifier(p);
  factors.push({
    amount: fit * 0.9,
    text: { key: fit >= 0.4 ? 'factor.fit_good' : fit >= -0.2 ? 'factor.fit_ok' : 'factor.fit_bad', params: { topic: p.topicId } },
    causes: started,
  });
  const ratio = investmentRatio(p);
  const timeEffect = quality - qualityCeiling(p, founder) * (1 - Math.exp(-C.quality.k * 1));
  factors.push({
    amount: timeEffect,
    text: { key: ratio >= 1.3 ? 'factor.time_lots' : ratio >= 1.05 ? 'factor.time_some' : 'factor.time_little' },
    causes: timeCauses,
  });
  if (shippedBugs > 0) {
    factors.push({
      amount: -bugPenalty,
      text: { key: p.testingDone < 20 ? 'factor.bugs_little_testing' : 'factor.bugs_more_testing', params: { total: shippedBugs, hidden: p.bugs.hidden } },
      causes: bugCauses,
    });
  }
  if (prog < 1) {
    factors.push({ amount: -incompletePenalty, text: { key: 'factor.incomplete', params: { pct: Math.round(prog * 100) / 100 } }, causes: entriesFor(state, p.id, ['delay']).map((e) => e.id) });
  }
  for (const m of p.ceilingMods) {
    factors.push({ amount: m.amount * 0.85, text: { key: 'factor.big_idea' }, causes: [m.causeId] });
  }
  const promise = entriesFor(state, p.id, ['promise'])[0];
  if (promise) factors.push({ amount: 0.05, text: { key: 'factor.promise' }, causes: [promise.id] });

  factors.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const explanation = factors.slice(0, 3).map((f) =>
    record(state, { kind: 'score_factor', text: f.text, causes: f.causes, tone: f.amount > 0.15 ? 1 : f.amount < -0.15 ? -1 : 0, projectId: p.id }),
  );

  p.phase = 'released';
  p.result = { releasedDay: state.day, price: p.price, reviews, averageScore, weeklySales: [], totalUnits: 0, revenue: 0, explanation };
  state.company.reputation = Math.max(0, Math.min(100, state.company.reputation + (averageScore - 5) * 4));
  founder.activity = 'celebrating';
  gainXp(state, founder, 'management', C.progression.managementPerRelease, emit);
  state.activeProjectId = null;
  record(state, { kind: 'released', text: { key: 'ledger.released', params: { project: p.name, score: averageScore } }, causes: explanation, tone: averageScore >= 6 ? 1 : -1, projectId: p.id });
  compactHistory(state);
  emit({ type: 'project_released', projectId: p.id, severity: 'decisive' });
}

/** Called at the start of each new week. */
export function marketWeek(state: GameState, emit: EventSink): void {
  worldWeek(state, emit);
  // Topic trends drift a little each week (contemporary market, D-021).
  for (const t of TOPICS) {
    const cur = state.topicTrends[t.id] ?? 1;
    const next = cur * nextRange(state.rng.market, 0.94, 1.06);
    state.topicTrends[t.id] = Math.max(0.6, Math.min(1.5, next * 0.9 + 0.1));
  }
  // Released products keep selling for a few weeks.
  for (const p of state.projects) {
    const r = p.result;
    if (!r || r.salesEnded) continue;
    if (r.weeklySales.length >= C.market.salesWeeks) {
      tailWeek(state, p, emit);
      continue;
    }
    const w = r.weeklySales.length;
    const topic = getTopic(p.topicId);
    const appeal = Math.pow(r.averageScore / 10, 2.2) * 1.6;
    const visibility = 0.8 + 0.6 * (1 - Math.exp(-p.hype / 1.6)) + (state.company.reputation / 100) * 0.5;
    // Players accept higher prices for better games: optimum price ~ expected / 1.1.
    const expectedPrice = 4 + r.averageScore * 1.2 + (C.market.sizePriceBonus[p.size] ?? 0);
    const priceFactor = Math.min(2.2, Math.exp(-1.1 * (r.price / expectedPrice - 1)));
    const noise = nextRange(state.rng.market, 0.9, 1.1);
    const units = Math.round(
      C.market.baseAudience * (C.market.sizeAudience[p.size] ?? 1) * topic.interest * demandFactor(state, topic.id) * appeal * visibility * priceFactor * Math.pow(C.market.weeklySalesDecay, w) * noise,
    );
    const revenue = Math.round(units * r.price * 0.7 * 100) / 100; // 30 % store fee
    r.weeklySales.push(units);
    r.totalUnits += units;
    r.revenue += revenue;
    state.company.money += revenue;
    emit({ type: 'sales_week', projectId: p.id, units, revenue, severity: 'info' });
  }
}

/**
 * Long tail (LS.6): after the launch weeks a product keeps selling a little,
 * following demand for its topic; a revival of its topic gives it a new push.
 */
function tailWeek(state: GameState, p: Project, emit: EventSink): void {
  const r = p.result!;
  const week1 = r.weeklySales[0] ?? 0;
  const k = r.tailWeeks ?? 0;
  const revival = (state.world.revivals[p.id] ?? 0) > state.day ? 1 + C.world.revivalStrength * 4 : 1;
  const units = Math.round(week1 * C.market.tailShare * Math.pow(C.market.tailDecay, k) * demandFactor(state, p.topicId) * revival * nextRange(state.rng.market, 0.85, 1.15));
  if (units < C.market.tailStopUnits && revival === 1) {
    r.salesEnded = true;
    return;
  }
  const revenue = Math.round(units * r.price * 0.7 * 100) / 100;
  r.tailWeeks = k + 1;
  r.tailUnits = (r.tailUnits ?? 0) + units;
  r.totalUnits += units;
  r.revenue += revenue;
  state.company.money += revenue;
  emit({ type: 'sales_week', projectId: p.id, units, revenue, severity: 'info' });
}
