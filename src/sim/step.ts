import { SIM_CONFIG } from './config';
import type { EventSink } from './core/events';
import type { GameState } from './model/state';
import { getActiveProject, getFounder } from './state';
import { isResting, projectDay, workTick } from './systems/project';
import { maybeDeadlineDecision } from './systems/decisions';
import { marketWeek } from './systems/market';
import { applyScheduled, maybeTriggerEvent } from './systems/events';
import { gainXp } from './systems/progression';
import { ambianceLevel, officeEffects } from './systems/office';

const C = SIM_CONFIG;

/** Advances the simulation by exactly one tick (one working hour). Pure w.r.t. inputs. */
export function step(state: GameState, emit: EventSink): void {
  const founder = getFounder(state);
  const project = getActiveProject(state);

  if (project) {
    workTick(state, project, founder, emit);
  } else if (founder.activity !== 'celebrating' || state.tick % (C.ticksPerDay * 2) === 0) {
    if (!state.pendingDecision) founder.activity = 'idle';
  }

  // Energy drains while working (not while waiting for a decision).
  if (project && !state.pendingDecision && !isResting(state, project)) {
    const before = founder.energy;
    const mgmt = 1 - Math.max(0, founder.skills.management - 5) * C.progression.managementFatigue;
    const chair = officeEffects(state.office).fatigue;
    founder.energy = Math.max(0, founder.energy - (C.energy.drainPerTick[project.pace] ?? 0.7) * mgmt * chair);
    if (before >= 25 && founder.energy < 25) emit({ type: 'energy_low', empirianId: founder.id, severity: 'important' });
  }

  state.tick += 1;

  if (state.tick % C.ticksPerDay === 0) dayBoundary(state, emit);
}

function dayBoundary(state: GameState, emit: EventSink): void {
  const founder = getFounder(state);
  const project = getActiveProject(state);

  state.day += 1;
  state.company.money -= C.economy.dailyLivingCost;
  const fx = officeEffects(state.office);
  const resting = !!project && isResting(state, project);
  const relaxedBonus = resting ? 8 : project?.pace === 'relaxed' ? 2 : project ? 0 : 6;
  // A good place to rest helps every night, and much more on days off (LS.4).
  const restBonus = fx.rest * (resting || !project ? 1.5 : 0.5);
  founder.energy = Math.min(C.energy.max, founder.energy + C.energy.overnightRecovery + relaxedBonus + restBonus);
  if (!project) founder.morale = Math.min(100, founder.morale + 0.5);
  // Coffee on working mornings (paid every day through upkeep).
  if (project && !resting && fx.coffee > 0 && founder.energy < C.energy.max) {
    founder.energy = Math.min(C.energy.max, founder.energy + fx.coffee);
    emit({ type: 'coffee', empirianId: founder.id, severity: 'info' });
  }
  // Running costs of the office (electricity, coffee…).
  state.company.money -= fx.upkeep;
  // The office atmosphere pulls morale towards a target (decoration, diminishing returns).
  const target = C.office.moraleBase + C.office.moraleFromAmbiance * ambianceLevel(fx.ambiance);
  founder.morale += (target - founder.morale) * C.office.moraleDrift;

  if (project) {
    if (project.phase !== 'released') gainXp(state, founder, 'management', C.progression.managementPerProjectDay, emit);
    projectDay(state, project);
    maybeDeadlineDecision(state, project, founder, emit);
  }
  applyScheduled(state, emit);
  maybeTriggerEvent(state, emit);
  if ((state.day - 1) % 7 === 0) marketWeek(state, emit);
  if (state.company.money < 500 && state.company.money + C.economy.dailyLivingCost >= 500) {
    emit({ type: 'money_low', severity: 'important' });
  }
  emit({ type: 'day_started', day: state.day, severity: 'info' });
}
