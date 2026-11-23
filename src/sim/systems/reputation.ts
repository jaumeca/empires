import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import type { Fame, FameAspect, GameState, Project } from '../model/state';
import { remember } from './story';

/**
 * Reputation with memory (F3.8 / D-059). Besides the studio's general prestige
 * (`company.reputation`, unchanged), players and clients remember a TRACK
 * RECORD in three aspects — quality, keeping dates and promises, innovation —
 * each in −10…10. Every fact (a launch, a delivered contract, a delay, a
 * patch…) pulls its aspect towards the fact's value (recent facts weigh more),
 * and every week the record drifts back towards neutral. So it always recovers
 * after a failure and can never pile up without limit. Effects are moderate
 * and capped. Numbers in SIM_CONFIG.fame.
 */
const K = () => SIM_CONFIG.fame;
export const FAME_ASPECTS: readonly FameAspect[] = ['quality', 'reliability', 'innovation'];

export function fameOf(state: GameState): Fame {
  return state.company.fame ?? { quality: 0, reliability: 0, innovation: 0 };
}

/** −1…1 for effects. */
export function fame(state: GameState, a: FameAspect): number {
  return Math.max(-1, Math.min(1, fameOf(state)[a] / 10));
}

export type FameLevel = 'great' | 'good' | 'neutral' | 'shaky' | 'poor';
export function fameLevel(v: number): FameLevel {
  const k = K();
  return v >= k.greatAt ? 'great' : v >= k.goodAt ? 'good' : v > -k.goodAt ? 'neutral' : v > -k.greatAt ? 'shaky' : 'poor';
}

/**
 * A fact for the track record: the aspect moves towards `value` (−10…10).
 * Crossing into "great" or "poor" — or climbing back out of "poor" — becomes a
 * memory and a small moment in the office.
 */
export function noteFame(state: GameState, a: FameAspect, value: number, emit: EventSink): void {
  const f = { ...fameOf(state) };
  const before = f[a];
  const v = Math.max(-10, Math.min(10, value));
  const pulled = before + (v - before) * K().weight;
  // A fact only moves the record in its own direction: a small bad fact never improves a bad name,
  // a small good one never spoils a good name (forgetting is the weekly drift's job).
  f[a] = Math.round((v >= 0 ? Math.max(before, pulled) : Math.min(before, pulled)) * 100) / 100;
  state.company.fame = { ...f, marks: { ...(fameOf(state).marks ?? {}) } };
  const marks = state.company.fame.marks!;
  const crossed = (key: string, tone: -1 | 1) => {
    const n = (marks[key] ?? 0) + 1;
    marks[key] = n;
    remember(state, `fame:${key}:${n}`, 'reputation', { key: `memory.fame.${key}` }, { tone }, emit);
    emit({ type: 'fame', aspect: a, level: key.split('.')[1] as 'great' | 'poor' | 'recovered', severity: 'important' });
  };
  const lb = fameLevel(before);
  const la = fameLevel(f[a]);
  if (la === 'great' && lb !== 'great') crossed(`${a}.great`, 1);
  else if (la === 'poor' && lb !== 'poor') crossed(`${a}.poor`, -1);
  else if (f[a] >= 0 && (marks[`${a}.poor`] ?? 0) > (marks[`${a}.recovered`] ?? 0) && before < 0) crossed(`${a}.recovered`, 1);
}

/** Weekly: memories fade a little; nothing is forever. */
export function fameWeek(state: GameState): void {
  if (!state.company.fame) return;
  const f = state.company.fame;
  for (const a of FAME_ASPECTS) f[a] = Math.round(f[a] * K().weeklyKeep * 100) / 100;
}

/** What a launch says about the studio. */
export function fameRelease(state: GameState, p: Project, emit: EventSink): void {
  const k = K();
  const r = p.result!;
  const bugs = p.bugs.hidden + p.bugs.known;
  noteFame(state, 'quality', (r.averageScore - k.qualityPivot) * k.qualityPerPoint - bugs * k.qualityPerBug, emit);
  // Keeping the announced date: on time is good, every week late a bit worse.
  const late = Math.max(0, r.releasedDay - p.originalDeadlineDay);
  noteFame(state, 'reliability', late === 0 ? k.onTime : -Math.min(k.maxLate, Math.ceil(late / 7) * k.perLateWeek), emit);
  // Something new: a topic the studio hadn't done, features, a validated prototype.
  const before = state.projects.filter((q) => q.id !== p.id && q.phase === 'released' && q.topicId === p.topicId).length;
  const feats = (p.features ?? []).filter((id) => !(p.featureDropped ?? []).includes(id)).length;
  const fresh = (before === 0 ? k.newTopic : 0) + Math.min(k.maxFeatures, feats * k.perFeature) + (p.prototypeValidated ? k.prototype : 0);
  noteFame(state, 'innovation', fresh > 0 ? fresh : -k.sameAgain * Math.min(3, before), emit);
}

/** A delivered (or cancelled) contract. */
export function fameContract(state: GameState, lateDays: number, early: boolean, emit: EventSink): void {
  const k = K();
  noteFame(state, 'reliability', lateDays > 0 ? -Math.min(k.maxLate, Math.ceil(lateDays / 3) * k.contractLate) : early ? k.contractEarly : k.contractOnTime, emit);
}

// ------------------------------------------------------------------ effects

/** Reviewers' patience with bugs: a studio known for quality is forgiven a little more (±15 %). */
export function bugTolerance(state: GameState): number {
  return 1 - fame(state, 'quality') * K().bugTolerance;
}

/** Interest a new game starts with: trust in quality, and curiosity if it brings features from an innovative studio. */
export function startingHype(state: GameState, features: number): number {
  const k = K();
  return Math.max(k.minHype, 1 + fame(state, 'quality') * k.trustHype + (features > 0 ? fame(state, 'innovation') * k.innovationHype : 0));
}

/** Clients: reliable studios get better pay and more room; unreliable ones, demanding clients. */
export function clientTerms(state: GameState): { pay: number; slack: number } {
  const r = fame(state, 'reliability');
  return { pay: 1 + r * K().clientPay, slack: 1 + r * K().clientSlack };
}
