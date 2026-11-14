import { SIM_CONFIG } from './config';
import type { EventSink } from './core/events';
import type { GameState } from './model/state';
import { getActiveProject, getFounder } from './state';
import { projectDay, workTick } from './systems/project';
import { maybeDeadlineDecision } from './systems/decisions';
import { marketWeek } from './systems/market';

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
  if (project && !state.pendingDecision) {
    const before = founder.energy;
    founder.energy = Math.max(0, founder.energy - (C.energy.drainPerTick[project.pace] ?? 0.7));
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
  const relaxedBonus = project?.pace === 'relaxed' ? 2 : project ? 0 : 6;
  founder.energy = Math.min(C.energy.max, founder.energy + C.energy.overnightRecovery + relaxedBonus);
  if (!project) founder.morale = Math.min(100, founder.morale + 0.5);

  if (project) {
    projectDay(state, project);
    maybeDeadlineDecision(state, project, founder, emit);
  }
  if ((state.day - 1) % 7 === 0) marketWeek(state, emit);
  if (state.company.money < 500 && state.company.money + C.economy.dailyLivingCost >= 500) {
    emit({ type: 'money_low', severity: 'important' });
  }
  emit({ type: 'day_started', day: state.day, severity: 'info' });
}
