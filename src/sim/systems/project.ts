import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { nextFloat, sampleCount } from '../core/rng';
import type { Empirian, GameState, Project } from '../model/state';
import { getTopic } from '../../content/topics';
import { record } from '../core/ledger';
import { maybeOfferBigIdea } from './decisions';
import { maybeOfferMoment } from './moments';
import { gainTopicXp, gainXp, topicBonus } from './progression';

const C = SIM_CONFIG;

// ---------------------------------------------------------------------------
// Derived values (pure functions, also used by UI for estimates)
// ---------------------------------------------------------------------------

export function productionProgress(p: Project): number {
  return Math.min(1, (p.workDone.design + p.workDone.tech) / p.requiredPoints);
}

export function plannedDays(p: Project): number {
  return Math.max(1, p.originalDeadlineDay - p.startDay);
}

/** Fit between the chosen focus and the topic's ideal focus: about -1.3 .. +1.0. */
export function fitModifier(p: Project): number {
  const topic = getTopic(p.topicId);
  return 1.0 - 2.5 * Math.abs(p.focus - topic.idealFocus);
}

export function skillFor(e: Empirian, focus: number): number {
  return e.skills.design * (1 - focus) + e.skills.tech * focus;
}

export function qualityCeiling(p: Project, founder: Empirian): number {
  const skill = skillFor(founder, p.focus);
  const mods = p.ceilingMods.reduce((a, m) => a + m.amount, 0);
  const creativity = (founder.skills.creativity - 5) * C.progression.creativityCeiling;
  return Math.max(1, C.quality.baseCeiling + (skill - 5) * 0.35 + creativity + topicBonus(founder, p.topicId) + fitModifier(p) + mods);
}

/** Ratio of quality-earning investment to required work (> 1 means extra polish). */
export function investmentRatio(p: Project): number {
  return (p.workDone.design + p.workDone.tech + C.quality.polishWeight * p.polishDone) / p.requiredPoints;
}

/** True quality 0-10 with diminishing returns: ceiling * (1 - e^(-k * ratio)). */
export function trueQuality(p: Project, founder: Empirian): number {
  const q = qualityCeiling(p, founder) * (1 - Math.exp(-C.quality.k * investmentRatio(p)));
  return Math.min(10, q);
}

export function budgetMultiplier(p: Project): number {
  const daily = p.budget / plannedDays(p);
  const devDaily = daily * (1 - C.work.marketingShare);
  const funded = p.spent < p.budget;
  if (!funded) return 1;
  return 1 + C.work.budgetMaxBoost * (1 - Math.exp(-devDaily / C.work.budgetSpendScale));
}

/**
 * Work speed from skill. Softer than linear so experience does not compound
 * into runaway quality (LS.1): level 5 → ×1.0, level 8 → ×1.3, level 2 → ×0.7.
 */
export function skillSpeed(skill: number): number {
  return 1 + C.progression.speedPerLevel * (skill - 5);
}

export function efficiency(e: Empirian): number {
  const t = C.energy.tiredThreshold;
  const energyEff = e.energy >= t ? 1 : 0.55 + (0.45 * e.energy) / t;
  const moraleEff = 0.85 + (0.3 * e.morale) / 100;
  return energyEff * moraleEff;
}

export function pointsPerTick(p: Project, e: Empirian): number {
  return (
    C.work.basePointsPerTick *
    skillSpeed(skillFor(e, p.focus)) *
    (C.pace.workMultiplier[p.pace] ?? 1) *
    budgetMultiplier(p) *
    efficiency(e)
  );
}

function bugRate(p: Project, e: Empirian): number {
  const t = C.energy.tiredThreshold;
  const fatigue = e.energy >= t ? 0 : (t - e.energy) / t;
  const mods = p.bugRateMods.reduce((a, m) => a * m.factor, 1);
  const skillMod = 1.25 - e.skills.tech * 0.05; // tech skill 5 => 1.0
  return C.bugs.ratePerTechPoint * (C.pace.bugMultiplier[p.pace] ?? 1) * (1 + fatigue) * mods * skillMod;
}

// ---------------------------------------------------------------------------
// Per-tick work
// ---------------------------------------------------------------------------

export function isResting(state: GameState, p: Project): boolean {
  return p.restUntilDay !== undefined && state.day < p.restUntilDay;
}

export function workTick(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (p.phase === 'released' || state.pendingDecision) return;
  if (isResting(state, p)) {
    founder.activity = 'resting';
    return;
  }
  maybeOfferMoment(state, p, founder, emit);
  if (state.pendingDecision) return;
  const pts = pointsPerTick(p, founder);
  const rngW = state.rng.work;

  if (p.phase === 'concept' || p.phase === 'production') {
    const isTech = nextFloat(rngW) < p.focus;
    if (isTech) p.workDone.tech += pts;
    else p.workDone.design += pts;
    founder.activity = p.phase === 'concept' && nextFloat(rngW) < 0.4 ? 'thinking' : isTech ? 'coding' : 'designing';
    emit({ type: 'work', empirianId: founder.id, kind: isTech ? 'tech' : 'design', amount: pts, severity: 'info' });
    // Learning by doing (LS.1).
    // Experience comes from hours of practice (1 tick = 1 hour), not from boosted output.
    const hours = 1;
    gainXp(state, founder, isTech ? 'tech' : 'design', hours, emit);
    if (p.phase === 'concept') gainXp(state, founder, 'creativity', hours * C.progression.conceptCreativity, emit);
    gainTopicXp(founder, p.topicId, hours);

    // Bugs come from building things (less while prototyping).
    const techPts = isTech ? pts : pts * 0.3;
    const conceptMod = p.phase === 'concept' ? 0.3 : 1;
    const newBugs = sampleCount(state.rng.bugs, techPts * bugRate(p, founder) * conceptMod);
    if (newBugs > 0) {
      let hidden = 0;
      for (let i = 0; i < newBugs; i++) if (nextFloat(state.rng.bugs) < C.bugs.hiddenShare) hidden++;
      p.bugs.hidden += hidden;
      p.bugs.known += newBugs - hidden;
      emit({ type: 'bug_created', empirianId: founder.id, count: newBugs, severity: 'info' });
    }
    if (p.phase === 'concept' && nextFloat(rngW) < 0.08) {
      emit({ type: 'idea', empirianId: founder.id, severity: 'info' });
    }

    const prog = productionProgress(p);
    if (p.phase === 'concept' && prog >= C.work.conceptFraction) {
      p.phase = 'production';
      emit({ type: 'phase_changed', projectId: p.id, phase: p.phase, severity: 'important' });
    } else if (p.phase === 'production' && prog >= 1) {
      p.phase = 'polish';
      record(state, {
        kind: 'production_done',
        text: { key: 'ledger.production_done', params: { project: p.name, day: state.day } },
        causes: [],
        tone: 0,
        projectId: p.id,
      });
      emit({ type: 'phase_changed', projectId: p.id, phase: p.phase, severity: 'important' });
    }
    maybeOfferBigIdea(state, p, founder, emit);
    return;
  }

  // Polish phase: split between testing/fixing and polishing.
  let testPts = pts * p.testFocus;
  const polishPts = pts - testPts;
  if (p.bugs.known > 0 && testPts > 0) {
    const fixed = Math.min(p.bugs.known, sampleCount(state.rng.bugs, testPts / C.bugs.fixCost));
    if (fixed > 0) {
      p.bugs.known -= fixed;
      p.bugs.fixed += fixed;
      emit({ type: 'bug_fixed', empirianId: founder.id, count: fixed, severity: 'info' });
    }
    testPts *= 0.5; // half of the effort went into fixing
  }
  if (testPts > 0) {
    p.testingDone += testPts;
    const pFind = 1 - Math.pow(1 - C.bugs.discoverPerTestPoint, testPts);
    const found = Math.min(p.bugs.hidden, sampleCount(state.rng.bugs, p.bugs.hidden * pFind));
    if (found > 0) {
      p.bugs.hidden -= found;
      p.bugs.known += found;
      emit({ type: 'bug_found', empirianId: founder.id, count: found, severity: 'info' });
    }
  }
  const qBefore = trueQuality(p, founder);
  p.polishDone += polishPts;
  const hours = 1;
  const testShare = pts > 0 ? testPts / pts : 0;
  gainXp(state, founder, 'tech', hours * testShare * C.progression.testingTech, emit);
  gainXp(state, founder, 'creativity', hours * (1 - testShare) * C.progression.polishCreativity, emit);
  gainXp(state, founder, p.focus >= 0.5 ? 'tech' : 'design', hours * (1 - testShare) * 0.5, emit);
  gainTopicXp(founder, p.topicId, hours * 0.5);
  if (Math.floor(trueQuality(p, founder) * 2) > Math.floor(qBefore * 2)) {
    emit({ type: 'quality_up', empirianId: founder.id, severity: 'info' });
  }
  founder.activity = testPts >= polishPts ? 'testing' : nextFloat(rngW) < p.focus ? 'coding' : 'designing';
  emit({ type: 'work', empirianId: founder.id, kind: testPts >= polishPts ? 'test' : 'polish', amount: pts, severity: 'info' });
}

// ---------------------------------------------------------------------------
// Daily step for the active project
// ---------------------------------------------------------------------------

export function projectDay(state: GameState, p: Project): void {
  if (p.phase === 'released') return;
  // Budget spend (development + marketing), spread evenly over the planned days.
  const daily = p.budget / plannedDays(p);
  const spend = Math.max(0, Math.min(daily, p.budget - p.spent));
  if (spend > 0) {
    p.spent += spend;
    state.company.money -= spend;
    // Marketing saturates: each euro buys less attention the more attention there already is.
    p.hype += (spend * C.work.marketingShare * C.market.hypePerMarketingMoney) / (1 + p.hype / C.market.hypeSaturation);
  }
  // Attention fades over time, faster once the announced date has passed.
  const late = state.day > p.originalDeadlineDay;
  p.hype *= late ? C.market.lateHypeDecayPerDay : C.market.hypeDecayPerDay;
}
