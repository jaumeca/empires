import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { newId } from '../core/ledger';
import { nextFloat, nextInt, nextRange, pick } from '../core/rng';
import type { GameState, NewsItem, NewsKind, Trend, World } from '../model/state';
import { TOPICS } from '../../content/topics';

/**
 * Empires Daily (LS.5): a world that evolves on its own with the clock and the
 * seed. Every news item is written *by* a state change that has a real effect
 * (demand, competition, economy, work speed). Nothing here is decorative.
 *
 * Demand for a topic on a given day =
 *   drift (topicTrends) × trend curve × economy ÷ (1 + competition)
 */
const W = () => SIM_CONFIG.world;

export const COMPETITORS = [
  { id: 'pixelforge', topics: ['kart', 'robots'], quality: 7.2 },
  { id: 'bytebakery', topics: ['cooking', 'cat-puzzle'], quality: 6.6 },
  { id: 'nimbus', topics: ['space-farm', 'pirates'], quality: 6.9 },
  { id: 'looplab', topics: ['robots', 'cat-puzzle', 'pirates'], quality: 6.2 },
] as const;

export function createWorld(): World {
  return { trends: [], competition: {}, economy: 1, toolBoost: null, news: [], nextTrendDay: 14, lastReadNewsId: null, revivals: {} };
}

/** 0..1..0: rises until the peak, then fades until the end. */
export function trendShape(t: Trend, day: number): number {
  if (day < t.startDay || day >= t.endDay) return 0;
  if (day <= t.peakDay) return (day - t.startDay) / Math.max(1, t.peakDay - t.startDay);
  return 1 - (day - t.peakDay) / Math.max(1, t.endDay - t.peakDay);
}

export function trendMultiplier(world: World, topicId: string, day: number): number {
  let m = 1;
  for (const t of world.trends) if (t.topicId === topicId) m += t.strength * trendShape(t, day);
  return m;
}

/** Combined demand factor used by sales (and shown qualitatively to the player). */
export function demandFactor(state: GameState, topicId: string, day = state.day): number {
  const w = state.world;
  const drift = state.topicTrends[topicId] ?? 1;
  return (drift * trendMultiplier(w, topicId, day) * w.economy) / (1 + (w.competition[topicId] ?? 0));
}

export type TopicMood = 'rising' | 'hot' | 'fading' | 'crowded' | 'calm';

/** What the player can read about a topic (no exact numbers). */
export function topicMood(state: GameState, topicId: string): TopicMood {
  const w = state.world;
  const t = w.trends.find((x) => x.topicId === topicId && state.day >= x.startDay && state.day < x.endDay);
  if ((w.competition[topicId] ?? 0) > 0.45) return 'crowded';
  if (!t) return 'calm';
  if (state.day < t.peakDay - 7) return 'rising';
  if (state.day <= t.peakDay + 7) return 'hot';
  return 'fading';
}

/** Multiplier on a kind of work from a temporary new tool (tech news). */
export function toolMultiplier(state: GameState, kind: 'tech' | 'design'): number {
  const b = state.world.toolBoost;
  return b && b.kind === kind && state.day < b.untilDay ? b.factor : 1;
}

function addNews(state: GameState, kind: NewsKind, params: NewsItem['params'], importance: NewsItem['importance'], emit: EventSink): void {
  const item: NewsItem = { id: newId(state, 'N'), day: state.day, kind, params, importance };
  state.world.news.unshift(item);
  if (state.world.news.length > W().keepNews) state.world.news.length = W().keepNews;
  emit({ type: 'news', newsId: item.id, kind, importance, severity: importance === 'major' ? 'important' : 'info' });
}

/** Weekly world update. Called from the market week, before sales. */
export function worldWeek(state: GameState, emit: EventSink): void {
  const w = state.world;
  const rng = state.rng.world;
  const day = state.day;

  // --- Trends: announce peaks and endings, spawn new ones.
  for (const t of w.trends) {
    if (!t.peakAnnounced && day >= t.peakDay) {
      t.peakAnnounced = true;
      addNews(state, 'trend_peak', { topic: t.topicId }, 'minor', emit);
    }
    if (!t.endAnnounced && day >= t.endDay) {
      t.endAnnounced = true;
      addNews(state, 'trend_over', { topic: t.topicId }, 'minor', emit);
    }
  }
  w.trends = w.trends.filter((t) => day < t.endDay + 28);
  const active = w.trends.filter((t) => day < t.endDay);
  if (day >= w.nextTrendDay && active.length < W().maxTrends) {
    const candidates = TOPICS.filter((x) => !active.some((t) => t.topicId === x.id));
    if (candidates.length) {
      const topic = pick(rng, candidates);
      const rise = nextInt(rng, W().riseDays[0], W().riseDays[1]);
      const fall = nextInt(rng, W().fallDays[0], W().fallDays[1]);
      const strength = nextRange(rng, W().strength[0], W().strength[1]);
      w.trends.push({ id: newId(state, 'T'), topicId: topic.id, startDay: day, peakDay: day + rise, endDay: day + rise + fall, strength, peakAnnounced: false, endAnnounced: false });
      addNews(state, 'trend_rising', { topic: topic.id }, 'major', emit);
    }
    w.nextTrendDay = day + nextInt(rng, W().trendGap[0], W().trendGap[1]);
  }

  // --- Competitors: release games; hot topics attract them (and get crowded).
  for (const k of Object.keys(w.competition)) w.competition[k] = (w.competition[k] ?? 0) * W().competitionDecay;
  for (const c of COMPETITORS) {
    let p = W().competitorReleaseChance;
    // Rivals react late: they pile into a trend once it is at its peak (and crowd it while it fades).
    const hotTopic = w.trends.find((t) => day >= t.peakDay && day < t.endDay);
    const topicId = hotTopic && nextFloat(rng) < W().followTrendChance ? hotTopic.topicId : pick(rng, c.topics as readonly string[]);
    if (hotTopic && topicId === hotTopic.topicId) p += W().trendReleaseBonus;
    if (nextFloat(rng) >= p) continue;
    const score = Math.round(Math.max(3, Math.min(9.5, c.quality + nextRange(rng, -1.5, 1.5))) * 10) / 10;
    w.competition[topicId] = (w.competition[topicId] ?? 0) + W().competitionPerRelease * (score / 7);
    // Only notable releases make the paper (the crowding itself is always simulated and shown on topic tags).
    const mine = state.projects.find((p) => p.id === state.activeProjectId)?.topicId ?? state.projects.at(-1)?.topicId;
    if (score >= W().newsworthyScore || topicId === mine) addNews(state, 'competitor_release', { company: c.id, topic: topicId, score }, score >= 8 ? 'major' : 'minor', emit);
  }

  // --- Economy: slow random walk; news only when it crosses a band.
  const before = w.economy;
  w.economy = Math.max(W().economyRange[0], Math.min(W().economyRange[1], w.economy * nextRange(rng, 0.97, 1.03) * 0.9 + 0.1));
  const band = (v: number) => (v >= 1.06 ? 1 : v <= 0.94 ? -1 : 0);
  if (band(w.economy) !== band(before)) addNews(state, band(w.economy) > band(before) ? 'economy_up' : 'economy_down', {}, 'major', emit);

  // --- Tech news: a new tool speeds up one kind of work for a while.
  if ((!w.toolBoost || day >= w.toolBoost.untilDay) && nextFloat(rng) < W().toolChance) {
    const kind = nextFloat(rng) < 0.5 ? 'tech' : 'design';
    w.toolBoost = { kind, factor: W().toolFactor, untilDay: day + W().toolDays };
    addNews(state, kind === 'tech' ? 'tool_tech' : 'tool_design', { days: W().toolDays }, 'major', emit);
  }

  // --- Revival: one of the player's older games' topics comes back.
  const old = state.projects.filter((p) => p.result && day - p.result.releasedDay > W().revivalMinAge);
  if (old.length && nextFloat(rng) < W().revivalChance) {
    const p = pick(rng, old);
    if (!active.some((t) => t.topicId === p.topicId)) {
      const rise = 14, fall = 35;
      w.trends.push({ id: newId(state, 'T'), topicId: p.topicId, startDay: day, peakDay: day + rise, endDay: day + rise + fall, strength: W().revivalStrength, peakAnnounced: true, endAnnounced: false });
      w.revivals[p.id] = day + rise + fall;
      addNews(state, 'revival', { topic: p.topicId, project: p.name }, 'major', emit);
    }
  }
}
