import { SIM_CONFIG, type Pace } from './config';
import type { EventSink } from './core/events';
import { newId, record } from './core/ledger';
import type { Appearance, GameState, Project, ProjectSize } from './model/state';
import { getActiveProject, getFounder } from './state';
import { getTopic } from '../content/topics';
import { resolveDecision } from './systems/decisions';
import { productionProgress } from './systems/project';
import { releaseProject } from './systems/market';

/** All player intents. The presentation layer never mutates GameState directly. */
export type Command =
  | { type: 'setup_founder'; name: string; companyName: string; appearance: Appearance }
  | {
      type: 'start_project';
      name: string;
      topicId: string;
      size: ProjectSize;
      focus: number;
      budget: number;
      days: number;
      price: number;
    }
  | { type: 'adjust_project'; budget?: number; deadlineDay?: number; pace?: Pace; testFocus?: number; price?: number }
  | { type: 'choose_option'; decisionId: string; optionId: string }
  | { type: 'release' };

export type CommandResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): CommandResult => ({ ok: false, error });

export const PROJECT_LIMITS = {
  minDays: 14,
  maxDays: 120,
  prices: [4.99, 9.99, 14.99, 19.99],
} as const;

export function applyCommand(state: GameState, cmd: Command, emit: EventSink): CommandResult {
  switch (cmd.type) {
    case 'setup_founder': {
      const f = getFounder(state);
      const name = cmd.name.trim().slice(0, 24);
      if (!name) return fail('Name required');
      f.name = name;
      f.appearance = { ...cmd.appearance };
      state.company.name = cmd.companyName.trim().slice(0, 32) || `${name} Studio`;
      state.setupComplete = true;
      return { ok: true };
    }

    case 'start_project': {
      if (getActiveProject(state)) return fail('A project is already in progress');
      try {
        getTopic(cmd.topicId);
      } catch {
        return fail('Unknown topic');
      }
      if (cmd.days < PROJECT_LIMITS.minDays || cmd.days > PROJECT_LIMITS.maxDays) return fail('Invalid duration');
      if (cmd.budget < 0 || cmd.budget > Math.max(0, state.company.money)) return fail('Budget exceeds available money');
      if (cmd.price <= 0) return fail('Invalid price');
      const required = SIM_CONFIG.work.requiredPoints[cmd.size];
      if (!required) return fail('Invalid size');
      const p: Project = {
        id: newId(state, 'P'),
        name: cmd.name.trim().slice(0, 32) || 'Proyecto sin nombre',
        topicId: cmd.topicId,
        size: cmd.size,
        focus: Math.max(0, Math.min(1, cmd.focus)),
        pace: 'normal',
        phase: 'concept',
        startDay: state.day,
        deadlineDay: state.day + Math.round(cmd.days),
        originalDeadlineDay: state.day + Math.round(cmd.days),
        budget: cmd.budget,
        spent: 0,
        price: cmd.price,
        requiredPoints: required,
        workDone: { design: 0, tech: 0 },
        polishDone: 0,
        testingDone: 0,
        ceilingMods: [],
        bugRateMods: [],
        bugs: { hidden: 0, known: 0, fixed: 0 },
        hype: 1,
        testFocus: 0.6,
        decisionsTaken: [],
        bigIdeaOffered: false,
      };
      state.projects.push(p);
      state.activeProjectId = p.id;
      record(state, {
        kind: 'project_started',
        text: `Empezaste "${p.name}" (${getTopic(p.topicId).name}, ${p.size === 'small' ? 'pequeño' : 'mediano'}) con ${cmd.budget} € de presupuesto y ${cmd.days} días de plazo.`,
        causes: [],
        tone: 0,
        projectId: p.id,
      });
      emit({ type: 'project_started', projectId: p.id, severity: 'important' });
      return { ok: true };
    }

    case 'adjust_project': {
      const p = getActiveProject(state);
      if (!p || p.phase === 'released') return fail('No active project');
      if (cmd.budget !== undefined && cmd.budget !== p.budget) {
        if (cmd.budget < p.spent) return fail('Budget below money already spent');
        if (cmd.budget - p.spent > Math.max(0, state.company.money)) return fail('Not enough money');
        record(state, { kind: 'budget_changed', text: `Cambiaste el presupuesto de ${Math.round(p.budget)} € a ${Math.round(cmd.budget)} €.`, causes: [], tone: 0, projectId: p.id });
        p.budget = cmd.budget;
      }
      if (cmd.deadlineDay !== undefined && cmd.deadlineDay !== p.deadlineDay) {
        if (cmd.deadlineDay <= state.day) return fail('Deadline must be in the future');
        if (cmd.deadlineDay - p.startDay > PROJECT_LIMITS.maxDays * 1.5) return fail('Deadline too far');
        const later = cmd.deadlineDay > p.deadlineDay;
        record(state, {
          kind: 'deadline_changed',
          text: later ? `Retrasaste la fecha de lanzamiento al día ${cmd.deadlineDay}.` : `Adelantaste la fecha de lanzamiento al día ${cmd.deadlineDay}.`,
          causes: [],
          tone: later ? 0 : -1,
          projectId: p.id,
        });
        p.deadlineDay = cmd.deadlineDay;
      }
      if (cmd.pace !== undefined && cmd.pace !== p.pace) {
        const texts: Record<Pace, string> = {
          relaxed: 'Pusiste un ritmo tranquilo: menos avance, menos cansancio y menos errores.',
          normal: 'Volviste a un ritmo de trabajo normal.',
          crunch: 'Activaste el modo crunch: más avance a corto plazo, más cansancio y más bugs.',
        };
        record(state, { kind: 'pace_changed', text: texts[cmd.pace], causes: [], tone: cmd.pace === 'crunch' ? -1 : 0, projectId: p.id });
        p.pace = cmd.pace;
      }
      if (cmd.testFocus !== undefined && cmd.testFocus !== p.testFocus) {
        const tf = Math.max(0, Math.min(1, cmd.testFocus));
        record(state, { kind: 'testing_changed', text: tf < p.testFocus ? 'Redujiste el tiempo dedicado a pruebas.' : 'Aumentaste el tiempo dedicado a pruebas.', causes: [], tone: tf < 0.3 ? -1 : 0, projectId: p.id });
        p.testFocus = tf;
      }
      if (cmd.price !== undefined) {
        if (cmd.price <= 0) return fail('Invalid price');
        p.price = cmd.price;
      }
      return { ok: true };
    }

    case 'choose_option': {
      return resolveDecision(state, cmd.decisionId, cmd.optionId, emit);
    }

    case 'release': {
      const p = getActiveProject(state);
      if (!p || p.phase === 'released') return fail('No active project');
      if (state.pendingDecision) return fail('Resolve the pending decision first');
      if (productionProgress(p) < 1 && p.phase !== 'polish') {
        record(state, { kind: 'delay', text: 'Publicaste antes de terminar la producción.', causes: [], tone: -1, projectId: p.id });
      }
      releaseProject(state, p, getFounder(state), emit);
      return { ok: true };
    }
  }
}
