import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import type { Empirian, GameState, PendingDecision, Project, TextRef } from '../model/state';
import { productionProgress } from './project';
import { releaseProject } from './market';

/**
 * Decisive Moments for the MVP. They are triggered by real simulation state
 * (progress, deadline) and every option has concrete, recorded consequences.
 */

const k = (key: string): TextRef => ({ key });

export function maybeOfferBigIdea(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (p.bigIdeaOffered || p.phase !== 'production' || state.pendingDecision) return;
  if (productionProgress(p) < 0.45) return;
  p.bigIdeaOffered = true;
  const extraDays = p.size === 'small' ? 10 : 14;
  const decision: PendingDecision = {
    id: newId(state, 'D'),
    kind: 'big_idea',
    speakerId: founder.id,
    text: { key: 'decision.big_idea.text', params: { project: p.name, days: extraDays } },
    options: [
      { id: 'approve', label: { key: 'decision.big_idea.approve', params: { days: extraDays } }, hints: [k('hint.quality_up2_probable'), k('hint.cost_delay'), k('hint.interest_down_if_late')] },
      { id: 'simple', label: k('decision.big_idea.simple'), hints: [k('hint.quality_up_some'), { key: 'hint.plus_days', params: { days: Math.round(extraDays / 3) } }, k('hint.bugs_up_rush')] },
      { id: 'postpone', label: k('decision.big_idea.postpone'), hints: [k('hint.no_delay'), k('hint.promise'), k('hint.morale_up_little')] },
      { id: 'keep', label: k('decision.big_idea.keep'), hints: [k('hint.no_changes'), k('hint.morale_down')] },
    ],
    createdTick: state.tick,
  };
  state.pendingDecision = decision;
  founder.activity = 'raising_hand';
  emit({ type: 'idea', empirianId: founder.id, severity: 'info' });
  emit({ type: 'decision_requested', decisionId: decision.id, severity: 'decisive' });
}

export function maybeDeadlineDecision(state: GameState, p: Project, founder: Empirian, emit: EventSink): void {
  if (state.pendingDecision || p.phase === 'released' || state.day < p.deadlineDay) return;
  const prog = productionProgress(p);
  const unfinished = prog < 1;
  const decision: PendingDecision = {
    id: newId(state, 'D'),
    kind: 'deadline',
    speakerId: founder.id,
    text: unfinished
      ? { key: 'decision.deadline.unfinished', params: { project: p.name, pct: Math.round(prog * 100) / 100 } }
      : { key: 'decision.deadline.ready', params: { project: p.name, bugs: p.bugs.known } },
    options: [
      { id: 'release', label: k('decision.deadline.release'), hints: unfinished ? [k('hint.incomplete_reviews_down'), k('hint.no_more_costs')] : [k('hint.hidden_bugs_may_ship')] },
      { id: 'extend7', label: k('decision.deadline.extend7'), hints: [k('hint.more_polish'), k('hint.cost_up'), k('hint.interest_down')] },
      { id: 'extend14', label: k('decision.deadline.extend14'), hints: [k('hint.much_more_polish'), k('hint.cost_up2'), k('hint.interest_down2')] },
    ],
    createdTick: state.tick,
  };
  state.pendingDecision = decision;
  founder.activity = 'raising_hand';
  emit({ type: 'decision_requested', decisionId: decision.id, severity: 'decisive' });
}

export function resolveDecision(
  state: GameState,
  decisionId: string,
  optionId: string,
  emit: EventSink,
): { ok: true } | { ok: false; error: string } {
  const d = state.pendingDecision;
  if (!d || d.id !== decisionId) return { ok: false, error: 'no_pending_decision' };
  if (!d.options.some((o) => o.id === optionId)) return { ok: false, error: 'invalid_option' };
  const p = state.projects.find((x) => x.id === state.activeProjectId);
  const founder = state.empirians.find((e) => e.id === d.speakerId);
  if (!p || !founder) return { ok: false, error: 'no_active_project' };

  state.pendingDecision = null;
  founder.activity = 'idle';
  p.decisionsTaken.push(`${d.kind}:${optionId}`);

  if (d.kind === 'big_idea') {
    const extraDays = p.size === 'small' ? 10 : 14;
    if (optionId === 'approve') {
      const id = record(state, { kind: 'decision', text: { key: 'ledger.big_idea.approve', params: { days: extraDays } }, causes: [], tone: 1, projectId: p.id });
      p.requiredPoints *= 1.25;
      p.deadlineDay += extraDays;
      p.ceilingMods.push({ amount: 1.0, causeId: id });
      founder.morale = Math.min(100, founder.morale + 8);
    } else if (optionId === 'simple') {
      const id = record(state, { kind: 'decision', text: k('ledger.big_idea.simple'), causes: [], tone: 0, projectId: p.id });
      p.requiredPoints *= 1.07;
      p.deadlineDay += Math.round(extraDays / 3);
      p.ceilingMods.push({ amount: 0.5, causeId: id });
      p.bugRateMods.push({ factor: 1.3, causeId: id });
    } else if (optionId === 'postpone') {
      record(state, { kind: 'promise', text: k('ledger.big_idea.postpone'), causes: [], tone: 0, projectId: p.id });
      founder.morale = Math.min(100, founder.morale + 3);
    } else {
      record(state, { kind: 'decision', text: k('ledger.big_idea.keep'), causes: [], tone: -1, projectId: p.id });
      founder.morale = Math.max(0, founder.morale - 10);
    }
  } else if (d.kind === 'deadline') {
    if (optionId === 'release') {
      emit({ type: 'decision_resolved', decisionId, optionId, severity: 'info' });
      releaseProject(state, p, founder, emit);
      return { ok: true };
    }
    const days = optionId === 'extend7' ? 7 : 14;
    record(state, { kind: 'delay', text: { key: 'ledger.delay', params: { days } }, causes: [], tone: -1, projectId: p.id });
    p.deadlineDay = state.day + days;
  }
  emit({ type: 'decision_resolved', decisionId, optionId, severity: 'info' });
  return { ok: true };
}
