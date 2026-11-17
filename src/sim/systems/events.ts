import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { newId, record } from '../core/ledger';
import { nextFloat, pick } from '../core/rng';
import type { DecisionOption, Empirian, GameState, PendingDecision, Project, ScheduledEffect, TextRef } from '../model/state';
import { getActiveProject, getFounder } from '../state';
import { productionProgress } from './project';
import { getTopic } from '../../content/topics';
import { addNews } from './world';
import { speakerOf, STORY_EVENTS } from './storyEvents';

/**
 * Dynamic events (LS.7). Unlike the project moments (systems/moments.ts),
 * these can involve the world, older products and the studio itself.
 *
 * Each event: a trigger on the real state (returns a context or null), a daily
 * chance, a per-kind cooldown, options with different consequences, and —
 * when it makes sense — deferred effects queued in `state.scheduled` and
 * recorded in the causal ledger when they happen (basis for chains).
 * A global gap keeps interruptions rare (see SIM_CONFIG.events).
 */
export type Ctx = Record<string, string | number>;

export interface EventDef {
  kind: PendingDecision['kind'];
  cooldownDays: number;
  /** Daily chance once the trigger holds (may depend on the state). */
  chance: number | ((state: GameState) => number);
  trigger(state: GameState): Ctx | null;
  /** speakerId: who raises it (default: the founder). */
  build(state: GameState, ctx: Ctx): { text: TextRef; options: DecisionOption[]; speakerId?: string };
  resolve(state: GameState, ctx: Ctx, optionId: string, emit: EventSink): void;
}

const E = () => SIM_CONFIG.events;
const k = (key: string, params?: TextRef['params']): TextRef => (params ? { key, params } : { key });
const opt = (kind: string, id: string, hints: string[]): DecisionOption => ({ id, label: k(`event.${kind}.${id}`), hints: hints.map((h) => k(h)) });
const proj = (state: GameState, id: string | number | undefined) => state.projects.find((p) => p.id === id);

/** Queue an effect for a future day. */
export function schedule(state: GameState, day: number, effect: ScheduledEffect['effect'], causeId: string): void {
  state.scheduled.push({ id: newId(state, 'S'), day, effect, causeId });
}

const CORE_EVENTS: EventDef[] = [
  {
    // A content creator wants to show an early build.
    kind: 'streamer_preview',
    cooldownDays: 90,
    chance: 0.02,
    trigger: (s) => {
      const p = getActiveProject(s);
      if (!p || p.previewGiven !== undefined || p.phase === 'released' || p.phase === 'concept') return null;
      if (productionProgress(p) < 0.5 || p.hype > 4) return null;
      return { projectId: p.id };
    },
    build: (s, c) => ({
      text: k('event.streamer_preview.text', { project: proj(s, c.projectId)!.name }),
      options: [
        opt('streamer_preview', 'give_build', ['hint.interest_up2', 'hint.bugs_exposed_risk']),
        opt('streamer_preview', 'polished_demo', ['hint.interest_up', 'hint.lose_3_days']),
        opt('streamer_preview', 'decline', ['hint.no_changes']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      p.previewGiven = o;
      if (o === 'give_build') {
        record(s, { kind: 'decision', text: k('ledger.event.streamer_preview.give_build'), causes: [], tone: 0, projectId: p.id });
        p.hype += 1.6;
      } else if (o === 'polished_demo') {
        record(s, { kind: 'decision', text: k('ledger.event.streamer_preview.polished_demo'), causes: [], tone: 1, projectId: p.id });
        p.hype += 1.4;
        p.requiredPoints += 3 * SIM_CONFIG.ticksPerDay * 0.9;
      } else {
        record(s, { kind: 'decision', text: k('ledger.event.streamer_preview.decline'), causes: [], tone: 0, projectId: p.id });
      }
    },
  },
  {
    // A rival announces a game on the same topic as yours.
    kind: 'rival_similar',
    cooldownDays: 70,
    chance: 0.015,
    trigger: (s) => {
      const p = getActiveProject(s);
      if (!p || p.rivalAnnounced || p.phase !== 'production' || p.deadlineDay - s.day < 14) return null;
      return { projectId: p.id, topic: p.topicId, company: pick(s.rng.events, ['pixelforge', 'bytebakery', 'nimbus', 'looplab']) };
    },
    build: (s, c) => ({
      text: k('event.rival_similar.text', { company: c.company!, topic: c.topic!, project: proj(s, c.projectId)!.name }),
      options: [
        opt('rival_similar', 'rush', ['hint.release_before_rival', 'hint.bugs_up', 'hint.energy_down2']),
        opt('rival_similar', 'differentiate', ['hint.quality_up_some', 'hint.more_work']),
        opt('rival_similar', 'ignore', ['hint.rival_crowds_topic']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      p.rivalAnnounced = true;
      // The rival's date is fixed by *their* plan: about a week after your announced date.
      const rivalDay = Math.max(s.day + 14, p.deadlineDay + 7);
      const id = record(s, { kind: 'decision', text: k(`ledger.event.rival_similar.${o}`, { company: c.company!, topic: c.topic! }), causes: [], tone: o === 'ignore' ? -1 : 0, projectId: p.id });
      if (o === 'rush') {
        p.deadlineDay = Math.max(s.day + 5, p.deadlineDay - 10);
        p.pace = 'crunch';
      } else if (o === 'differentiate') {
        p.requiredPoints *= 1.15;
        p.ceilingMods.push({ amount: 0.3, causeId: id });
        // A distinctive game suffers less from the rival's arrival.
        schedule(s, rivalDay, { kind: 'competition', topic: String(c.topic), amount: E().rivalCompetition * 0.6, company: String(c.company) }, id);
        return;
      }
      schedule(s, rivalDay, { kind: 'competition', topic: String(c.topic), amount: E().rivalCompetition, company: String(c.company) }, id);
    },
  },
  {
    // Players find a serious bug in a released game that shipped with hidden bugs.
    kind: 'critical_bug',
    cooldownDays: 40,
    chance: 0.05,
    trigger: (s) => {
      const candidates = s.projects.filter((p) => p.result && !p.bugReported && p.bugs.hidden >= E().criticalBugMinHidden && s.day - p.result.releasedDay >= 14 && s.day - p.result.releasedDay < 120);
      if (!candidates.length) return null;
      return { projectId: pick(s.rng.events, candidates).id };
    },
    build: (s, c) => {
      const p = proj(s, c.projectId)!;
      return {
        text: k('event.critical_bug.text', { project: p.name, bugs: p.bugs.hidden }),
        options: [
          opt('critical_bug', 'patch_now', ['hint.reputation_up', 'hint.sales_up_some', getActiveProject(s) ? 'hint.lose_3_days' : 'hint.no_delay']),
          opt('critical_bug', 'patch_later', ['hint.no_delay', 'hint.reputation_down_later']),
          opt('critical_bug', 'ignore', ['hint.reputation_down2', 'hint.sales_down']),
        ],
      };
    },
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      p.bugReported = true;
      const id = record(s, { kind: 'decision', text: k(`ledger.event.critical_bug.${o}`, { project: p.name }), causes: [], tone: o === 'patch_now' ? 1 : -1, projectId: p.id });
      if (o === 'patch_now') {
        p.bugs.fixed += p.bugs.hidden;
        p.bugs.hidden = 0;
        s.company.reputation = Math.min(100, s.company.reputation + 2);
        p.result!.salesBoost = { factor: 1.15, untilDay: s.day + 42 };
        const active = getActiveProject(s);
        if (active) active.requiredPoints += 3 * SIM_CONFIG.ticksPerDay;
      } else if (o === 'patch_later') {
        schedule(s, s.day + 21, { kind: 'reputation', delta: -4 }, id);
        schedule(s, s.day + 21, { kind: 'fix_bugs', projectId: p.id }, id);
      } else {
        s.company.reputation = Math.max(0, s.company.reputation - 6);
        p.result!.salesBoost = { factor: 0.7, untilDay: s.day + 56 };
      }
    },
  },
  {
    // An unexpected idea while exploring the concept (more likely with creativity).
    kind: 'unexpected_idea',
    cooldownDays: 30,
    // More creative founders get more unexpected ideas.
    chance: (s) => 0.3 * (0.35 + Math.max(0, getFounder(s).skills.creativity - 5) * 0.1),
    trigger: (s) => {
      const p = getActiveProject(s);
      if (!p || p.phase !== 'concept' || p.ideaOffered) return null;
      return { projectId: p.id };
    },
    build: (s, c) => ({
      text: k('event.unexpected_idea.text', { project: proj(s, c.projectId)!.name, topic: proj(s, c.projectId)!.topicId }),
      options: [
        opt('unexpected_idea', 'explore', ['hint.quality_up_some', 'hint.more_work']),
        opt('unexpected_idea', 'save', ['hint.next_project_better']),
      ],
    }),
    resolve: (s, c, o) => {
      const p = proj(s, c.projectId)!;
      p.ideaOffered = true;
      const id = record(s, { kind: o === 'save' ? 'promise' : 'decision', text: k(`ledger.event.unexpected_idea.${o}`), causes: [], tone: 1, projectId: p.id });
      if (o === 'explore') {
        p.requiredPoints *= 1.08;
        // A fresh angle also pulls the design closer to what the topic needs.
        p.focus += (getTopic(p.topicId).idealFocus - p.focus) * 0.5;
        p.ceilingMods.push({ amount: 0.3, causeId: id });
      } else {
        s.company.savedIdeas = [...(s.company.savedIdeas ?? []), id];
      }
    },
  },
];

const EVENTS: EventDef[] = [...CORE_EVENTS, ...STORY_EVENTS];

export const EVENT_KINDS = EVENTS.map((e) => e.kind);

/** Tests/debug: raise an event now if its trigger holds (ignores chance and pacing). */
export function forceEvent(state: GameState, kind: string, emit: EventSink): boolean {
  const def = EVENTS.find((e) => e.kind === kind);
  if (!def || state.pendingDecision) return false;
  const ctx = def.trigger(state);
  if (!ctx) return false;
  const { text, options, speakerId } = def.build(state, ctx);
  const speaker = speakerOf(state, speakerId);
  state.pendingDecision = { id: newId(state, 'D'), kind: def.kind, speakerId: speaker.id, text, options, createdTick: state.tick, context: ctx };
  speaker.activity = 'raising_hand';
  emit({ type: 'decision_requested', decisionId: state.pendingDecision.id, severity: 'decisive' });
  return true;
}

/** Daily check (after the project moments). At most one event at a time, with a global gap. */
export function maybeTriggerEvent(state: GameState, emit: EventSink): void {
  if (state.pendingDecision) return;
  const ev = state.eventLog;
  if (ev.lastDay !== null && state.day - ev.lastDay < E().minGapDays) return;
  const active = getActiveProject(state);
  if (active && (active.eventsSeen ?? 0) >= E().maxPerProject) return;
  for (const def of EVENTS) {
    const last = ev.lastByKind[def.kind];
    if (last !== undefined && state.day - last < def.cooldownDays) continue;
    const chance = typeof def.chance === 'number' ? def.chance : def.chance(state);
    if (nextFloat(state.rng.events) >= chance) continue;
    const ctx = def.trigger(state);
    if (!ctx) continue;
    const { text, options, speakerId } = def.build(state, ctx);
    const speaker = speakerOf(state, speakerId);
    const d: PendingDecision = { id: newId(state, 'D'), kind: def.kind, speakerId: speaker.id, text, options, createdTick: state.tick, context: ctx };
    state.pendingDecision = d;
    ev.lastDay = state.day;
    ev.lastByKind[def.kind] = state.day;
    if (active) active.eventsSeen = (active.eventsSeen ?? 0) + 1;
    speaker.activity = 'raising_hand';
    emit({ type: 'decision_requested', decisionId: d.id, severity: 'decisive' });
    return;
  }
}

/** Returns true when the decision was a dynamic event and has been resolved. */
export function resolveEvent(state: GameState, d: PendingDecision, optionId: string, founder: Empirian, emit: EventSink): boolean {
  const def = EVENTS.find((e) => e.kind === d.kind);
  if (!def) return false;
  def.resolve(state, d.context ?? {}, optionId, emit);
  void founder;
  return true;
}

/** Applies the effects due today (called at the day boundary). */
export function applyScheduled(state: GameState, emit: EventSink): void {
  const due = state.scheduled.filter((x) => x.day <= state.day);
  if (!due.length) return;
  state.scheduled = state.scheduled.filter((x) => x.day > state.day);
  for (const s of due) {
    const e = s.effect;
    switch (e.kind) {
      case 'reputation':
        state.company.reputation = Math.max(0, Math.min(100, state.company.reputation + e.delta));
        record(state, { kind: 'consequence', text: k(e.delta < 0 ? 'ledger.consequence.reputation_down' : 'ledger.consequence.reputation_up'), causes: [s.causeId], tone: e.delta < 0 ? -1 : 1 });
        break;
      case 'competition':
        state.world.competition[e.topic] = (state.world.competition[e.topic] ?? 0) + e.amount;
        record(state, { kind: 'consequence', text: k('ledger.consequence.rival_arrives', { company: e.company, topic: e.topic }), causes: [s.causeId], tone: -1 });
        addNews(state, 'competitor_release', { company: e.company, topic: e.topic, score: 7.4 }, 'major', emit);
        break;
      case 'fix_bugs': {
        const p = proj(state, e.projectId);
        if (p) { p.bugs.fixed += p.bugs.hidden; p.bugs.hidden = 0; }
        record(state, { kind: 'consequence', text: k('ledger.consequence.patch_released', { project: p?.name ?? '' }), causes: [s.causeId], tone: 0 });
        break;
      }
    }
  }
}

/** Ideas saved for later improve the next project (persistent consequence). */
export function useSavedIdeas(state: GameState, p: Project): void {
  const ideas = state.company.savedIdeas ?? [];
  if (!ideas.length) return;
  const id = ideas[0]!;
  state.company.savedIdeas = ideas.slice(1);
  p.ceilingMods.push({ amount: E().savedIdeaBonus, causeId: id });
  record(state, { kind: 'consequence', text: k('ledger.consequence.saved_idea_used', { project: p.name }), causes: [id], tone: 1, projectId: p.id });
}
