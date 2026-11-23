import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import type { DecisionOption, Empirian, GameState, PendingDecision, Project, TextRef } from '../model/state';
import { pointsPerTick, productionProgress } from './project';
import { addFeatureLate, cutTrouble, FEATURE_CFG, fixTrouble, hashUnit, ignoreTrouble, openTrouble, scopeCandidate } from './features';
import { topicMood } from './world';
import { unlocked } from './progress';
import { debtLevel, refactorCost } from './debt';
import { remember } from './story';

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
  /** speakerId: who raises it (default: the founder). */
  build(state: GameState, p: Project, f: Empirian): { text: TextRef; options: DecisionOption[]; speakerId?: string };
  resolve(state: GameState, p: Project, f: Empirian, optionId: string): void;
}

/** Days needed to finish production at the current speed. */
export function projectedProductionDays(p: Project, f: Empirian): number {
  const remaining = Math.max(0, p.requiredPoints - p.workDone.design - p.workDone.tech);
  return remaining / Math.max(0.01, pointsPerTick(p, f) * SIM_CONFIG.ticksPerDay);
}

/** Who on the team knows the code best (they raise code-quality questions). */
/**
 * At most one team proposal per project (pacing): a code shortcut or a scope
 * idea, decided per project from the seed. Solo founders only get scope ideas.
 */
function proposalKind(state: GameState, p: Project): 'tech_shortcut' | 'scope_idea' {
  if (state.empirians.length < 2) return 'scope_idea';
  return hashUnit(state.seed, p.id, 'proposal') < 0.5 ? 'tech_shortcut' : 'scope_idea';
}

function mostCreative(state: GameState): Empirian {
  return [...state.empirians].sort((a, b) => b.skills.creativity - a.skills.creativity || (a.id < b.id ? -1 : 1))[0]!;
}

function bestCoder(state: GameState): Empirian {
  return [...state.empirians].sort((a, b) => b.skills.tech - a.skills.tech || (a.id < b.id ? -1 : 1))[0]!;
}

/** Remember a code decision in the Story, with who raised it. */
function rememberCode(state: GameState, id: string, key: string, params: TextRef['params'], tone: -1 | 0 | 1, p: Project, who?: string): void {
  remember(state, `code:${id}`, 'decision', { key, params }, { tone, projectId: p.id, empirianIds: who && who !== state.founderId ? [who] : undefined });
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
  {
    // The best coder proposes a shortcut early in production (F3.4).
    kind: 'tech_shortcut',
    // Raised by an employee (a solo founder doesn't argue with themself).
    trigger: (s, p) => s.empirians.length >= 2 && proposalKind(s, p) === 'tech_shortcut' && p.phase === 'production' && productionShare(p) >= 0.2 && productionShare(p) <= 0.5,
    build: (state, p) => {
      const c = bestCoder(state);
      return {
        speakerId: c.id,
        text: k('moment.tech_shortcut.text', { name: c.name, project: p.name }),
        options: [
          opt('shortcut', 'tech_shortcut', ['hint.work_down', 'hint.debt_up']),
          opt('proper', 'tech_shortcut', ['hint.no_changes']),
          opt('solid_base', 'tech_shortcut', ['hint.work_up_small', 'hint.debt_down', 'hint.next_project_faster']),
        ],
      };
    },
    resolve: (state, p, _f, o) => {
      const D = SIM_CONFIG.debt;
      const who = bestCoder(state).id;
      const id = record(state, { kind: 'decision', text: k(`ledger.moment.tech_shortcut.${o}`, { project: p.name }), causes: [], tone: o === 'shortcut' ? -1 : o === 'solid_base' ? 1 : 0, projectId: p.id });
      if (o === 'shortcut') {
        const done = p.workDone.design + p.workDone.tech;
        p.requiredPoints = done + Math.max(0, p.requiredPoints - done) * (1 - D.shortcutSaving);
        p.debt = Math.min(D.max, (p.debt ?? 0) + D.shortcutDebt);
        p.debtCauses = [...(p.debtCauses ?? []), id];
      } else if (o === 'solid_base') {
        p.requiredPoints *= 1 + D.solidBaseWork;
        p.debt = Math.max(0, (p.debt ?? 0) - D.solidBaseDebtCut);
        state.company.solidBase = id;
      }
      if (o !== 'proper') rememberCode(state, id, `ledger.moment.tech_shortcut.${o}`, { project: p.name }, o === 'shortcut' ? -1 : 1, p, who);
    },
  },
  {
    // The code has become fragile: refactor now or live with it (F3.4).
    kind: 'debt_review',
    trigger: (s, p) => unlocked(s, 'studio') && (p.phase === 'production' || p.phase === 'polish') && (p.debt ?? 0) >= SIM_CONFIG.debt.reviewAt,
    build: (state, p) => {
      const c = bestCoder(state);
      const days = (share: number) => Math.max(1, Math.round(refactorCost(p, share) / Math.max(0.1, pointsPerTick(p, c) * SIM_CONFIG.ticksPerDay * state.empirians.length)));
      return {
        speakerId: c.id,
        text: k('moment.debt_review.text', { name: c.name, project: p.name, level: debtLevel(p.debt ?? 0) }),
        options: [
          { ...opt('refactor', 'debt_review', ['hint.debt_down2', 'hint.bugs_down']), label: k('moment.debt_review.refactor', { days: days(0.75) }) },
          { ...opt('patch', 'debt_review', ['hint.debt_down']), label: k('moment.debt_review.patch', { days: days(0.4) }) },
          opt('live_with', 'debt_review', ['hint.no_delay', 'hint.next_project_debt']),
        ],
      };
    },
    resolve: (state, p, _f, o) => {
      const who = bestCoder(state).id;
      const id = record(state, { kind: 'decision', text: k(`ledger.moment.debt_review.${o}`, { project: p.name }), causes: [], tone: o === 'live_with' ? -1 : 1, projectId: p.id });
      const share = o === 'refactor' ? 0.75 : o === 'patch' ? 0.4 : 0;
      if (share) {
        p.requiredPoints += refactorCost(p, share);
        p.debt = (p.debt ?? 0) * (1 - share);
      } else {
        p.debtCauses = [...(p.debtCauses ?? []), id];
      }
      rememberCode(state, id, `ledger.moment.debt_review.${o}`, { project: p.name }, o === 'live_with' ? -1 : 1, p, who);
    },
  },
  {
    // Someone wants to add a feature mid-production (F3.2 / D-058).
    kind: 'scope_idea',
    trigger: (state, p) => unlocked(state, 'planning') && proposalKind(state, p) === 'scope_idea' && p.phase === 'production' && productionShare(p) >= 0.15 && productionShare(p) <= 0.45
      && !!scopeCandidate(state, p, ['rising', 'hot'].includes(topicMood(state, p.topicId))),
    build: (state, p) => {
      const trending = ['rising', 'hot'].includes(topicMood(state, p.topicId));
      const f = scopeCandidate(state, p, trending)!;
      const who = mostCreative(state);
      return {
        speakerId: who.id,
        text: k(trending ? 'moment.scope_idea.text_trend' : 'moment.scope_idea.text', { project: p.name, feature: f.id, topic: p.topicId }),
        options: [
          opt('add', 'scope_idea', ['hint.quality_up_some', 'hint.more_work', f.risk >= 0.25 ? 'hint.risky' : 'hint.little_risk']),
          { ...opt('add_time', 'scope_idea', ['hint.quality_up_some', 'hint.plus_week', 'hint.interest_down']), label: k('moment.scope_idea.add_time', { days: FEATURE_CFG.lateDelayDays }) },
          opt('keep', 'scope_idea', ['hint.no_changes']),
        ],
      };
    },
    resolve: (state, p, _f, o) => {
      const f = scopeCandidate(state, p, ['rising', 'hot'].includes(topicMood(state, p.topicId)));
      const who = mostCreative(state);
      const id = record(state, { kind: 'decision', text: k(`ledger.moment.scope_idea.${o}`, { project: p.name, feature: f?.id ?? '', name: who.name }), causes: [], tone: o === 'keep' ? 0 : 1, projectId: p.id });
      if (!f || o === 'keep') { if (who.id !== state.founderId) who.morale = Math.max(0, who.morale - 2); return; }
      addFeatureLate(state, p, f, id);
      if (o === 'add_time') {
        p.deadlineDay += FEATURE_CFG.lateDelayDays;
        p.hype *= FEATURE_CFG.lateDelayHype;
      }
      if (who.id !== state.founderId) who.morale = Math.min(100, who.morale + 5);
      rememberCode(state, id, `ledger.moment.scope_idea.${o}`, { project: p.name, feature: f.id, name: who.name }, 1, p, who.id);
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
    const { text, options, speakerId } = m.build(state, p, founder);
    const speaker = state.empirians.find((e) => e.id === speakerId) ?? founder;
    const decision: PendingDecision = { id: newId(state, 'D'), kind: m.kind, speakerId: speaker.id, text, options, createdTick: state.tick };
    p.momentsOffered = [...offered, m.kind];
    p.lastMomentDay = state.day;
    state.pendingDecision = decision;
    speaker.activity = 'raising_hand';
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
