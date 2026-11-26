import { SIM_CONFIG } from './config';
import type { EventSink } from './core/events';
import type { GameState } from './model/state';
import { getActiveProject, getFounder } from './state';
import { isResting, projectDay, workTick } from './systems/project';
import { maybeDeadlineDecision } from './systems/decisions';
import { marketWeek } from './systems/market';
import { applyScheduled, maybeTriggerEvent } from './systems/events';
import { contractsDay, contractTick } from './systems/contracts';
import { gainXp } from './systems/progression';
import { ambianceLevel, officeEffects } from './systems/office';
import { storyDay } from './systems/story';
import { OFFICE_SIZES } from '../content/officeSizes';
import { onBreak, routinesTick } from './systems/routines';
import { harmony, relationsDay } from './systems/relations';
import { progressTick } from './systems/progress';
import { productsWeek, supportTick } from './systems/products';
import { inspirationDay } from './systems/inspiration';
import { coordinationFactor, hiringDay, payroll, teamMoraleBonus, traitDrain, workstationEffects } from './systems/team';

const C = SIM_CONFIG;

/** Advances the simulation by exactly one tick (one working hour). Pure w.r.t. inputs. */
export function step(state: GameState, emit: EventSink): void {
  const founder = getFounder(state);
  const project = getActiveProject(state);

  // Short breaks first (AW.B): who is on a break this hour doesn't work.
  routinesTick(state, emit);

  const contract = state.contracts.active;
  if (project) {
    workTick(state, project, founder, emit);
  } else if (contract && !state.pendingDecision) {
    // The whole team works on the contract (GT.1).
    const coord = coordinationFactor(state.empirians.length) * harmony(state);
    for (const e of state.empirians) {
      if (onBreak(state, e)) continue;
      contractTick(state, e, emit, coord);
      e.energy = Math.max(0, e.energy - (C.energy.drainPerTick.normal ?? 0.85) * workstationEffects(state, e).fatigue * traitDrain(e));
    }
  } else if (state.support && !state.pendingDecision) {
    // GT.6: the whole team looks after a released product (patch or update).
    const coord = coordinationFactor(state.empirians.length) * harmony(state);
    for (const e of state.empirians) {
      if (onBreak(state, e) || !state.support) continue;
      supportTick(state, e, emit, coord);
      e.energy = Math.max(0, e.energy - (C.energy.drainPerTick.normal ?? 0.85) * workstationEffects(state, e).fatigue * traitDrain(e));
    }
  } else if (!state.pendingDecision) {
    // Nothing to do: back to idle (a celebration lasts until the next 2-day mark).
    for (const e of state.empirians) if (!onBreak(state, e) && (e.activity !== 'celebrating' || state.tick % (C.ticksPerDay * 2) === 0)) e.activity = 'idle';
  }

  // Energy drains while working (not while waiting for a decision).
  if (project && !state.pendingDecision && !isResting(state, project)) {
    for (const e of state.empirians) {
      if (onBreak(state, e)) continue;
      const before = e.energy;
      const mgmt = e.id === founder.id ? 1 - Math.max(0, e.skills.management - 5) * C.progression.managementFatigue : 1;
      const chair = workstationEffects(state, e).fatigue;
      e.energy = Math.max(0, e.energy - (C.energy.drainPerTick[project.pace] ?? 0.7) * mgmt * chair * traitDrain(e));
      if (before >= 25 && e.energy < 25) emit({ type: 'energy_low', empirianId: e.id, severity: 'important' });
    }
  }

  state.tick += 1;
  // Progression (D-062): announce what the studio has just unlocked.
  progressTick(state, emit);

  if (state.tick % C.ticksPerDay === 0) dayBoundary(state, emit);
}

function dayBoundary(state: GameState, emit: EventSink): void {
  const founder = getFounder(state);
  const project = getActiveProject(state);

  state.day += 1;
  state.company.money -= C.economy.dailyLivingCost;
  const fx = officeEffects(state.office);
  const resting = !!project && isResting(state, project);
  const working = !!project || !!state.contracts.active || !!state.support;
  const relaxedBonus = resting ? 8 : project?.pace === 'relaxed' ? 2 : working ? 0 : 6;
  // A good place to rest helps every night, and much more on days off (LS.4).
  const restBonus = fx.rest * (resting || !working ? 1.5 : 0.5);
  // The office atmosphere pulls morale towards a target (decoration, diminishing returns; a sociable colleague helps).
  const target = C.office.moraleBase + C.office.moraleFromAmbiance * ambianceLevel(fx.ambiance) + teamMoraleBonus(state);
  for (const e of state.empirians) {
    e.energy = Math.min(C.energy.max, e.energy + C.energy.overnightRecovery + relaxedBonus + restBonus);
    if (!project) e.morale = Math.min(100, e.morale + 0.5);
    // Coffee on working mornings (paid every day through upkeep).
    if (project && !resting && fx.coffee > 0 && e.energy < C.energy.max) {
      e.energy = Math.min(C.energy.max, e.energy + fx.coffee);
      emit({ type: 'coffee', empirianId: e.id, severity: 'info' });
    }
    e.morale += (target - e.morale) * C.office.moraleDrift;
  }
  // Running costs of the office (electricity, coffee…) and rent of a bigger studio (AW.E.1).
  state.company.money -= fx.upkeep + OFFICE_SIZES[state.office.size ?? 'room'].rent;

  if (project) {
    if (project.phase !== 'released') gainXp(state, founder, 'management', C.progression.managementPerProjectDay, emit);
    projectDay(state, project);
    maybeDeadlineDecision(state, project, founder, emit);
  }
  contractsDay(state, emit);
  hiringDay(state, emit);
  // Relationships (E.3): a working day together, mentoring, tension fading.
  relationsDay(state, (!!project && !resting && project.phase !== 'released') || (!project && (!!state.contracts.active || !!state.support)), emit, project?.pace === 'crunch' && !resting);
  storyDay(state, emit);
  inspirationDay(state, emit);
  if (state.contracts.active) gainXp(state, founder, 'management', C.progression.managementPerProjectDay, emit);
  applyScheduled(state, emit);
  maybeTriggerEvent(state, emit);
  if ((state.day - 1) % 7 === 0) {
    marketWeek(state, emit);
    productsWeek(state, emit);
    const paid = payroll(state);
    if (paid > 0) emit({ type: 'payroll', total: paid, severity: 'info' });
  }
  if (state.company.money < 500 && state.company.money + C.economy.dailyLivingCost >= 500) {
    emit({ type: 'money_low', severity: 'important' });
  }
  emit({ type: 'day_started', day: state.day, severity: 'info' });
}
