import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import type { DecisionOption, Empirian, GameState, PendingDecision, Project, TextRef } from '../model/state';
import { pointsPerTick, productionProgress } from './project';
import { cutTrouble, FEATURE_CFG, fixTrouble, ignoreTrouble, openTrouble } from './features';

const productionShare = (p: Project) => productionProgress(p);

/**
 * Contextual Decisive Moments (F3.1, GDD §7 and §16). Each moment is triggered
 * by the real state of the project, is offered at most once per project, and
 * every option has concrete consequences recorded in the causal ledger.
 * Pacing rules keep interruptions reasonable (see MOMENT_RULES).
 */
export const MOMENT_RULES = {
  /** Max contextual moments per project (big idea and deadline not counted). */
  maxPerProject: 3,
  /** Minimum days between two moments of the same project. */
  minGapDays: 4,
} as const;

const k = (key: string, params?: TextRef['params']): TextRef => (params ? { key, params } : { key });
const opt = (id: string, kind: string, hints: string[]): DecisionOption => ({ id, label: k(`moment.${kind}.${id}`), hints: hints.map((h) => k(h)) });

interface MomentDef {
  kind: PendingDecision['kind'];
  trigger(state: GameState, p: Project, f: Empirian): boolean;
  build(state: GameState, p: Project, f: Empirian): { text: TextRef; options: DecisionOption[] };
  resolve(state: GameState, p: Project, f: Empirian, optionId: string): void;
}

/** Days needed to finish production at the current speed. */
export function projectedProductionDays(p: Project, f: Empirian): number {
  const remaining = Math.max(0, p.requiredPoints - p.workDone.design - p.workDone.tech);
  return remaining / Math.max(0.01, pointsPerTick(p, f) * SIM_CONFIG.ticksPerDay);
}

const MOMENTS: MomentDef[] = [
  {
    // AW.D.2: the prototype found a problem while it is still cheap to fix.
    kind: 'prototype_result',
    trigger: (_s, p) => !!p.prototype && !p.prototypeDone && p.phase !== 'concept' && openTrouble(p).length > 0,
    build: (_s, p) => ({
      text: k('moment.prototype_result.text', { project: p.name, features: openTrouble(p).join(',') }),
      options: [
        opt('fix', 'prototype_result', ['hint.work_up_small', 'hint.keeps_feature']),
        opt('cut', 'prototype_result', ['hint.work_down', 'hint.less_appeal']),
      ],
    }),
    resolve: (state, p, _f, o) => {
      p.prototypeDone = true;
      record(state, { kind: 'decision', text: k(`ledger.moment.prototype_result.${o}`, { features: openTrouble(p).join(',') }), causes: [], tone: o === 'fix' ? 1 : 0, projectId: p.id });
      if (o === 'fix') fixTrouble(p, true); else cutTrouble(p, true);
    },
  },
  {
    // AW.D.1: without a prototype, a risky feature shows its problem mid-production.
    kind: 'feature_trouble',
    trigger: (_s, p) => !p.prototype && p.phase === 'production' && productionShare(p) >= FEATURE_CFG.discoverAt && openTrouble(p).length > 0,
    build: (_s, p) => ({
      text: k('moment.feature_trouble.text', { project: p.name, features: openTrouble(p).join(',') }),
      options: [
        opt('push', 'feature_trouble', ['hint.work_up', 'hint.keeps_feature']),
        opt('cut', 'feature_trouble', ['hint.work_down', 'hint.interest_cut']),
        opt('ship', 'feature_trouble', ['hint.no_delay', 'hint.quality_down', 'hint.bugs_up']),
      ],
    }),
    resolve: (state, p, _f, o) => {
      const id = record(state, { kind: 'decision', text: k(`ledger.moment.feature_trouble.${o}`, { features: openTrouble(p).join(',') }), causes: [], tone: o === 'ship' ? -1 : 0, projectId: p.id });
      if (o === 'push') fixTrouble(p, false);
      else if (o === 'cut') cutTrouble(p, false);
      else ignoreTrouble(p, id);
    },
  },
  {
    // The founder is worn out.
    kind: 'exhausted',
    trigger: (_s, p, f) => f.energy < 30 && p.phase !== 'released',
    build: (_s, p) => ({
      text: k('moment.exhausted.text', { project: p.name }),
      options: [
        opt('rest', 'exhausted', ['hint.energy_up2', 'hint.lose_2_days']),
        opt('relaxed', 'exhausted', ['hint.energy_up_slow', 'hint.progress_down']),
        opt('push', 'exhausted', ['hint.no_delay', 'hint.bugs_up', 'hint.morale_down']),
      ],
    }),
    resolve: (state, p, f, o) => {
      if (o === 'rest') {
        record(state, { kind: 'decision', text: k('ledger.moment.exhausted.rest'), causes: [], tone: 1, projectId: p.id });
        p.restUntilDay = state.day + 2;
        f.energy = Math.min(SIM_CONFIG.energy.max, f.energy + 20);
        f.morale = Math.min(100, f.morale + 5);
      } else if (o === 'relaxed') {
        record(state, { kind: 'pace_changed', text: k('ledger.pace.relaxed'), causes: [], tone: 0, projectId: p.id });
        p.pace = 'relaxed';
      } else {
        const id = record(state, { kind: 'decision', text: k('ledger.moment.exhausted.push'), causes: [], tone: -1, projectId: p.id });
        p.bugRateMods.push({ factor: 1.2, causeId: id });
        f.morale = Math.max(0, f.morale - 8);
      }
    },
  },
  {
    // The plan is not going to make the announced date.
    kind: 'running_late',
    trigger: (state, p, f) => {
      if (p.phase !== 'production') return false;
      const span = p.deadlineDay - p.startDay;
      if (state.day < p.startDay + span * 0.55) return false;
      return state.day + projectedProductionDays(p, f) > p.deadlineDay + 1;
    },
    build: (state, p, f) => ({
      text: k('moment.running_late.text', { project: p.name, days: Math.max(1, Math.round(state.day + projectedProductionDays(p, f) - p.deadlineDay)) }),
      options: [
        opt('cut', 'running_late', ['hint.on_time', 'hint.quality_down']),
        opt('sprint', 'running_late', ['hint.progress_up', 'hint.energy_down2', 'hint.bugs_up']),
        opt('delay', 'running_late', ['hint.plus_week', 'hint.interest_down']),
        opt('carry_on', 'running_late', ['hint.no_changes']),
      ],
    }),
    resolve: (state, p, _f, o) => {
      if (o === 'cut') {
        const id = record(state, { kind: 'decision', text: k('ledger.moment.running_late.cut'), causes: [], tone: 0, projectId: p.id });
        const done = p.workDone.design + p.workDone.tech;
        p.requiredPoints = done + Math.max(0, p.requiredPoints - done) * 0.65;
        p.ceilingMods.push({ amount: -0.5, causeId: id });
      } else if (o === 'sprint') {
        record(state, { kind: 'pace_changed', text: k('ledger.pace.crunch'), causes: [], tone: -1, projectId: p.id });
        p.pace = 'crunch';
      } else if (o === 'delay') {
        record(state, { kind: 'delay', text: k('ledger.delay', { days: 7 }), causes: [], tone: -1, projectId: p.id });
        p.deadlineDay += 7;
      } else {
        record(state, { kind: 'decision', text: k('ledger.moment.running_late.carry_on'), causes: [], tone: 0, projectId: p.id });
      }
    },
  },
  {
    // Production just finished: how do we use the polish time?
    kind: 'polish_plan',
    trigger: (_s, p) => p.phase === 'polish' && p.polishDone === 0 && p.testingDone === 0,
    build: (state, p) => ({
      text: k('moment.polish_plan.text', { project: p.name, days: Math.max(0, p.deadlineDay - state.day), bugs: p.bugs.known }),
      options: [
        opt('test', 'polish_plan', ['hint.hidden_bugs_found', 'hint.quality_same']),
        opt('balanced', 'polish_plan', ['hint.bit_of_both']),
        opt('improve', 'polish_plan', ['hint.quality_up_some', 'hint.hidden_bugs_may_ship']),
      ],
    }),
    resolve: (state, p, _f, o) => {
      const tf = o === 'test' ? 0.9 : o === 'improve' ? 0.2 : 0.6;
      record(state, { kind: 'testing_changed', text: k(`ledger.moment.polish_plan.${o}`), causes: [], tone: o === 'improve' ? -1 : 0, projectId: p.id });
      p.testFocus = tf;
    },
  },
];

export function maybeOfferMoment(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (state.pendingDecision || p.phase === 'released') return;
  const offered = p.momentsOffered ?? [];
  if (offered.length >= MOMENT_RULES.maxPerProject) return;
  if (p.lastMomentDay !== undefined && state.day - p.lastMomentDay < MOMENT_RULES.minGapDays) return;
  for (const m of MOMENTS) {
    if (offered.includes(m.kind) || !m.trigger(state, p, founder)) continue;
    const { text, options } = m.build(state, p, founder);
    const decision: PendingDecision = { id: newId(state, 'D'), kind: m.kind, speakerId: founder.id, text, options, createdTick: state.tick };
    p.momentsOffered = [...offered, m.kind];
    p.lastMomentDay = state.day;
    state.pendingDecision = decision;
    founder.activity = 'raising_hand';
    emit({ type: 'decision_requested', decisionId: decision.id, severity: 'decisive' });
    return;
  }
}

/** Returns true if `kind` is a contextual moment and it was resolved here. */
export function resolveMoment(state: GameState, p: Project, founder: Empirian, kind: string, optionId: string): boolean {
  const m = MOMENTS.find((x) => x.kind === kind);
  if (!m) return false;
  m.resolve(state, p, founder, optionId);
  return true;
}

export const MOMENT_KINDS = MOMENTS.map((m) => m.kind);
