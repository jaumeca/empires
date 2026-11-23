import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import type { GameState, Project, ProjectProfile } from '../model/state';
import { getFeature } from '../../content/features';
import { getTopic } from '../../content/topics';
import { remember } from './story';

/**
 * Different kinds of project (D.4 / D-060) — on the SAME project system, not
 * separate modes. The profile follows from the plan and is fixed at the start:
 *  - indie: a small game by a small team (founder + at most one person). Cheap
 *    and low risk; a well-rounded idea stands out.
 *  - ambitious: a medium game with at least two features. More anticipation,
 *    higher expectations (a great game becomes a phenomenon, a mediocre one
 *    disappoints) and more coordination for bigger teams.
 *  - standard: everything else.
 * Client contracts (the third way) live in systems/contracts.ts, with client
 * relationships. Numbers in SIM_CONFIG.ambition.
 */
const K = () => SIM_CONFIG.ambition;

export function profileFor(state: GameState, size: string, features: number): ProjectProfile {
  if (size === 'small' && state.empirians.length <= 2) return 'indie';
  if (size === 'medium' && features >= K().ambitiousFeatures) return 'ambitious';
  return 'standard';
}

/** A small game that is round: the focus suits the topic and every feature fits it. */
export function indieSpark(p: Project): number {
  if (p.profile !== 'indie') return 0;
  const topic = getTopic(p.topicId);
  if (Math.abs(p.focus - topic.idealFocus) > K().indieFocusTolerance) return 0;
  const feats = (p.features ?? []).filter((id) => !(p.featureDropped ?? []).includes(id));
  // A round idea is a choice: at least one feature that players of this topic love, and none out of place.
  if (!feats.some((id) => (getFeature(id)?.fit[p.topicId] ?? 0) >= K().indieSignatureFit)) return 0;
  if (feats.some((id) => (getFeature(id)?.fit[p.topicId] ?? 0) < K().indieFit)) return 0;
  return K().indieSpark;
}

/** Ambitious projects draw attention from the start. */
export function profileHype(profile: ProjectProfile): number {
  return profile === 'ambitious' ? K().ambitiousHype : 0;
}

/** Each feature beyond the first adds coordination for every extra person (capped). */
export function ambitionCoordination(state: GameState, p: Project): number {
  if (p.profile !== 'ambitious') return 1;
  const extraFeatures = Math.max(0, (p.features ?? []).length - 1);
  return 1 - Math.min(K().maxCoordination, K().coordinationPerFeature * extraFeatures * Math.max(0, state.empirians.length - 1));
}

/** At launch: did an ambitious game live up to expectations? (sales for some weeks; in the Story). */
export function ambitionVerdict(state: GameState, p: Project, emit: EventSink): void {
  if (p.profile !== 'ambitious' || !p.result) return;
  const k = K();
  const score = p.result.averageScore;
  const verdict = score >= k.phenomenonAt ? 'phenomenon' : score < k.letdownBelow ? 'letdown' : null;
  if (!verdict) return;
  const factor = verdict === 'phenomenon' ? k.phenomenonSales : k.letdownSales;
  const prev = p.result.salesBoost && p.result.salesBoost.untilDay > state.day ? p.result.salesBoost.factor : 1;
  p.result.salesBoost = { factor: prev * factor, untilDay: state.day + k.verdictDays };
  const id = record(state, { kind: 'consequence', text: { key: `ledger.ambition.${verdict}`, params: { project: p.name } }, causes: [], tone: verdict === 'phenomenon' ? 1 : -1, projectId: p.id });
  remember(state, `ambition:${p.id}`, 'decision', { key: `ledger.ambition.${verdict}`, params: { project: p.name } }, { tone: verdict === 'phenomenon' ? 1 : -1, projectId: p.id });
  void id; void emit;
}
