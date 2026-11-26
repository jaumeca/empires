import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import type { GameState, Inspiration, Project } from '../model/state';
import { TOPICS } from '../../content/topics';
import { FEATURES } from '../../content/features';
import { getFounder } from '../state';
import { hashUnit } from './features';
import { relationsOf } from './relations';
import { remember } from './story';
import { unlocked } from './progress';
import { demandFactor } from './world';

/**
 * Ideas and inspiration (0.19.0, D-068). A light mechanic: the people of the
 * studio come up with ideas for the NEXT game while they work, chat, rest and
 * learn from what they released. Each idea is an opportunity (never an
 * obligation): a small push to a game that follows it, used when planning.
 *
 * - Natural sources only: a lesson after a flop, a sequel after a hit, two
 *   friends chatting, a curious mind, a product's community.
 * - Few: at most 3 waiting, at most one new every IDEA_GAP days; older ones
 *   give way to new ones. Own deterministic draw (seed + day): no luck reshuffle.
 * - A bet, not a gift: +IDEA_BONUS to the quality ceiling and +IDEA_WORK more work,
 *   only if the game really follows it (measured: not a dominant strategy).
 */
export const IDEA_GAP = 12;
export const IDEA_MAX = 3;
export const IDEA_BONUS = 0.3;
/** Days of a production without any idea before someone starts daydreaming about the next game. */
export const QUIET_DAYS = 25;
/** Following an idea makes the game a bit more ambitious: more work (time and salaries). */
export const IDEA_WORK = 0.12;

const list = (s: GameState) => (s.company.inspirations ??= []);
const released = (s: GameState) => s.projects.filter((p) => p.result).sort((a, b) => a.result!.releasedDay - b.result!.releasedDay);

function add(s: GameState, idea: Omit<Inspiration, 'id' | 'day'>, emit: EventSink): void {
  const ideas = list(s);
  if (ideas.some((i) => i.topicId === idea.topicId && i.featureId === idea.featureId && i.kind === idea.kind)) return;
  const full: Inspiration = { ...idea, id: `I-${s.day}-${ideas.length}`, day: s.day };
  ideas.push(full);
  if (ideas.length > IDEA_MAX) ideas.shift();
  s.company.lastIdeaDay = s.day;
  // The memory comes when a game follows it (see useIdea): that is what the story keeps.
  emit({ type: 'inspiration', inspirationId: full.id, empirianId: idea.by, severity: 'info' });
}

/** The idea, in words (TextRef, translated by the UI). */
export function ideaText(s: GameState, i: Inspiration) {
  const who = s.empirians.find((e) => e.id === i.by)?.name ?? '';
  // Only the parameters this idea uses (memories are saved: keep them small).
  const params: Record<string, string> = {};
  if (who) params.name = who;
  if (i.topicId) params.topic = i.topicId;
  if (i.featureId) params.feature = i.featureId;
  if (i.project) params.project = i.project;
  return { key: `idea.${i.source}`, params };
}

/** Daily: maybe one new idea, from what is really happening in the studio. */
export function inspirationDay(s: GameState, emit: EventSink): void {
  if (!s.setupComplete || !unlocked(s, 'planning')) return;
  if (s.company.lastIdeaDay !== undefined && s.day - s.company.lastIdeaDay < IDEA_GAP) return;
  const roll = hashUnit(s.seed, `day${s.day}`, 'inspiration');
  const rel = released(s);
  const last = rel[rel.length - 1];
  const founder = getFounder(s);
  // 1. Lessons and sequels: right after a launch (once per game).
  if (last && !last.inspired && s.day - last.result!.releasedDay <= 14) {
    last.inspired = true;
    const score = last.result!.averageScore;
    if (score >= 8) return add(s, { kind: 'topic', source: 'sequel', topicId: last.topicId, by: founder.id, project: last.name }, emit);
    if (score < 6) return add(s, { kind: 'polish', source: 'lesson', by: founder.id, project: last.name }, emit);
  }
  // A long production with nothing new (0.20.0, measured gaps of up to 79 days): someone starts
  // daydreaming about the next game. Still at most one idea every IDEA_GAP days and 3 waiting.
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const quietSince = Math.max(s.company.lastIdeaDay ?? -999, active?.startDay ?? -999);
  if (active && s.day - quietSince >= QUIET_DAYS) {
    const dreamer = [...s.empirians].sort((a, b) => b.skills.creativity - a.skills.creativity || (a.id < b.id ? -1 : 1))[0]!;
    // What the market wants right now (an opportunity, not a random wish).
    const others = TOPICS.filter((t) => t.id !== active.topicId);
    const topic = [...others].sort((a, b) => demandFactor(s, b.id) - demandFactor(s, a.id) || hashUnit(s.seed, a.id, `d${s.day}`) - hashUnit(s.seed, b.id, `d${s.day}`))[0]!;
    return add(s, { kind: 'topic', source: 'daydream', topicId: topic.id, by: dreamer.id }, emit);
  }
  if (roll > 0.35) return; // most days, nothing
  // 2. Two friends chatting today: a combination (their favourite topic + a feature that suits it).
  const friends = relationsOf(s).find((r) => r.bond >= 50 && [r.a, r.b].every((id) => s.empirians.find((e) => e.id === id)?.lastBreakDay === s.day));
  if (friends) {
    const topic = TOPICS[Math.floor(hashUnit(s.seed, `day${s.day}`, 'ins-topic') * TOPICS.length)]!;
    const fits = FEATURES.filter((f) => (f.fit[topic.id] ?? 0) >= 0.5 && !f.unlock);
    const feat = fits[Math.floor(hashUnit(s.seed, `day${s.day}`, 'ins-feat') * fits.length)];
    if (feat) return add(s, { kind: 'combo', source: 'chat', topicId: topic.id, featureId: feat.id, by: friends.a, with: friends.b }, emit);
  }
  // 3. A curious mind: a topic the studio hasn't tried yet (or least tried).
  const curious = s.empirians.find((e) => e.trait === 'curious');
  if (curious && roll < 0.2) {
    const counts = TOPICS.map((t) => ({ t, n: s.projects.filter((p) => p.topicId === t.id).length }));
    const fresh = counts.sort((a, b) => a.n - b.n || hashUnit(s.seed, a.t.id, `c${s.day}`) - hashUnit(s.seed, b.t.id, `c${s.day}`))[0]!.t;
    return add(s, { kind: 'topic', source: 'curious', topicId: fresh.id, by: curious.id }, emit);
  }
  // 4. A product's community asks for more of the same.
  const loved = rel.find((p) => p.result!.happening === 'community');
  if (loved && roll < 0.3) add(s, { kind: 'topic', source: 'community', topicId: loved.topicId, by: founder.id, project: loved.name }, emit);
}

/** Does this plan follow the idea? (Only then does it help.) */
export function ideaFits(i: Inspiration, plan: { topicId: string; features?: string[] }): boolean {
  if (i.kind === 'polish') return true;
  if (i.topicId && i.topicId !== plan.topicId) return false;
  if (i.featureId && !(plan.features ?? []).includes(i.featureId)) return false;
  return true;
}

/** Starting a game with an idea: a small push to its ceiling, remembered as theirs. The idea is used up. */
export function useIdea(s: GameState, p: Project, ideaId: string): string | null {
  const ideas = list(s);
  const i = ideas.find((x) => x.id === ideaId);
  if (!i) return 'idea_gone';
  if (!ideaFits(i, { topicId: p.topicId, features: p.features })) return 'idea_not_fit';
  s.company.inspirations = ideas.filter((x) => x.id !== ideaId);
  const id = record(s, { kind: 'decision', text: { key: 'ledger.idea_used', params: { ...ideaText(s, i).params, game: p.name, source: i.source } }, causes: [], tone: 1, projectId: p.id });
  p.ceilingMods.push({ amount: IDEA_BONUS, causeId: id });
  remember(s, `idea:${i.id}`, 'decision', { key: 'ledger.idea_used', params: { ...ideaText(s, i).params, game: p.name, source: i.source } }, { tone: 1, empirianIds: i.by ? [i.by] : undefined, projectId: p.id });
  p.requiredPoints = Math.round(p.requiredPoints * (1 + IDEA_WORK));
  return null;
}
