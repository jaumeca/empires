import type { EventSink } from '../core/events';
import { newId } from '../core/ledger';
import type { Empirian, GameState, Memory, MemoryKind, Project, Story, TextRef } from '../model/state';
import { SKILLS } from './progression';

/**
 * Studio memories (ML.2) and achievements (ML.3).
 * Memories are derived from real facts of the state (releases, hires, contracts,
 * skills, money) and from the big decisions already written in the causal
 * ledger; each fact becomes a memory once (dedupe key). Achievements unlock
 * special decorations — nothing basic is ever locked behind them.
 */
export function createStory(tick = 0): Story {
  return { memories: [], achievements: {}, scannedTick: tick, seenReleases: [] };
}

const MAX_MEMORIES = 400;
const DECISION_KINDS = new Set(['big_idea', 'rival_similar', 'critical_bug', 'streamer_preview', 'unexpected_idea']);
const MONEY_MARKS = [50_000, 100_000, 250_000, 500_000, 1_000_000];
export const SKILL_MASTER_LEVEL = 8;

export interface AchievementDef {
  id: string;
  /** Decoration unlocked (catalog item id). */
  item: string;
  done: (s: GameState) => boolean;
}

const released = (s: GameState) => s.projects.filter((p) => p.phase === 'released' && p.result);

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first_hit', item: 'trophy_gold', done: (s) => released(s).some((p) => p.result!.averageScore >= 8) },
  { id: 'five_games', item: 'plaque_five', done: (s) => released(s).length >= 5 },
  { id: 'first_hire', item: 'team_photo', done: (s) => s.hiring.hired >= 1 },
  { id: 'five_contracts', item: 'bonsai', done: (s) => s.contracts.completed >= 5 },
  { id: 'rich', item: 'neon_sign', done: (s) => s.company.money >= 100_000 },
  { id: 'comeback', item: 'lucky_cactus', done: (s) => s.story.memories.some((m) => m.kind === 'comeback') },
];

export function achievementForItem(itemId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.item === itemId);
}

export function isUnlocked(state: GameState, itemId: string): boolean {
  const a = achievementForItem(itemId);
  return !a || state.story.achievements[a.id] !== undefined;
}

/** Adds a memory unless that fact is already remembered. Returns it if new. */
export function remember(
  state: GameState,
  key: string,
  kind: MemoryKind,
  text: TextRef,
  opts: { tone?: -1 | 0 | 1; empirianIds?: string[]; projectId?: string; day?: number } = {},
  emit?: EventSink,
): Memory | null {
  const st = state.story;
  if (st.memories.some((m) => m.fact === key)) return null;
  const m: Memory = { id: newId(state, 'M'), day: opts.day ?? state.day, kind, text, tone: opts.tone ?? 0, fact: key };
  if (opts.empirianIds?.length) m.empirianIds = opts.empirianIds;
  if (opts.projectId) m.projectId = opts.projectId;
  st.memories.push(m);
  st.memories.sort((a, b) => a.day - b.day);
  // Bounded: drop the oldest ordinary decisions first; milestones stay.
  while (st.memories.length > MAX_MEMORIES) {
    const i = st.memories.findIndex((x) => x.kind === 'decision');
    st.memories.splice(i >= 0 ? i : 0, 1);
  }
  emit?.({ type: 'memory', memoryId: m.id, severity: 'info' });
  return m;
}

/** What makes a release memorable (at most one memory per product). */
function releaseMemory(state: GameState, p: Project, prev: Project | undefined, best: number, isFirst: boolean): { kind: MemoryKind; tone: -1 | 0 | 1 } | null {
  const score = p.result!.averageScore;
  const had = (k: MemoryKind) => state.story.memories.some((m) => m.kind === k);
  if (isFirst) return { kind: 'first_release', tone: score >= 6 ? 1 : 0 };
  if (score >= 8) return { kind: had('first_hit') ? 'hit' : 'first_hit', tone: 1 };
  if (score < 5) return had('first_flop') ? null : { kind: 'first_flop', tone: -1 };
  if (prev && prev.result!.averageScore < 5 && score >= 7) return { kind: 'comeback', tone: 1 };
  if (score > best + 0.3) return { kind: 'record', tone: 1 };
  return null;
}

/** Daily scan (and after commands that change the team): new facts become memories; achievements unlock. */
export function storyDay(state: GameState, emit: EventSink): void {
  const st = state.story;
  // Releases, in release order.
  const rel = released(state).sort((a, b) => a.result!.releasedDay - b.result!.releasedDay || (a.id < b.id ? -1 : 1));
  let best = 0;
  rel.forEach((p, i) => {
    if (!st.seenReleases.includes(p.id)) {
      st.seenReleases.push(p.id);
      const mem = releaseMemory(state, p, rel[i - 1], best, i === 0);
      if (mem) remember(state, `release:${p.id}`, mem.kind, { key: `memory.${mem.kind}`, params: { project: p.name, score: Math.round(p.result!.averageScore * 10) / 10 } }, { tone: mem.tone, projectId: p.id, day: p.result!.releasedDay }, emit);
    }
    best = Math.max(best, p.result!.averageScore);
  });
  if (state.contracts.completed >= 1) remember(state, 'first_contract', 'first_contract', { key: 'memory.first_contract', params: {} }, { tone: 1 }, emit);
  for (const e of state.empirians) {
    for (const k of SKILLS) {
      if (e.skills[k] >= SKILL_MASTER_LEVEL) remember(state, `skill:${e.id}:${k}`, 'skill_master', { key: 'memory.skill_master', params: { name: e.name, skill: k } }, { tone: 1, empirianIds: [e.id] }, emit);
    }
  }
  for (const mark of MONEY_MARKS) {
    if (state.company.money >= mark) remember(state, `money:${mark}`, 'money', { key: 'memory.money', params: { amount: mark } }, { tone: 1 }, emit);
  }
  // Big decisions already explained in the causal ledger.
  for (const l of state.ledger) {
    if (l.tick < st.scannedTick) continue; // same-tick entries are rescanned; facts dedupe
    if (DECISION_KINDS.has(l.kind)) remember(state, `ledger:${l.id}`, 'decision', l.text, { tone: l.tone, projectId: l.projectId, day: l.day }, emit);
    if (l.kind === 'office' && l.text.key === 'ledger.office.bought') remember(state, 'first_decor', 'first_decor', { key: 'memory.first_decor', params: { item: String(l.text.params?.item ?? '') } }, { tone: 1, day: l.day }, emit);
  }
  st.scannedTick = state.tick;
  // Achievements (ML.3).
  for (const a of ACHIEVEMENTS) {
    if (st.achievements[a.id] !== undefined || !a.done(state)) continue;
    st.achievements[a.id] = state.day;
    remember(state, `achievement:${a.id}`, 'achievement', { key: 'memory.achievement', params: { achievement: a.id, item: a.item } }, { tone: 1 }, emit);
    emit({ type: 'achievement', achievementId: a.id, itemId: a.item, severity: 'important' });
  }
}

export function rememberFounding(state: GameState): void {
  remember(state, 'founded', 'founded', { key: 'memory.founded', params: { company: state.company.name } }, { tone: 1, day: 1, empirianIds: [state.founderId] });
}

export function rememberHire(state: GameState, e: Empirian, emit: EventSink): void {
  const first = !state.story.memories.some((m) => m.kind === 'first_hire');
  remember(state, `hire:${e.id}`, first ? 'first_hire' : 'hire', { key: first ? 'memory.first_hire' : 'memory.hire', params: { name: e.name } }, { tone: 1, empirianIds: [e.id] }, emit);
}

export function rememberFarewell(state: GameState, e: Empirian, emit: EventSink): void {
  remember(state, `farewell:${e.id}`, 'farewell', { key: 'memory.farewell', params: { name: e.name } }, { tone: -1, empirianIds: [e.id] }, emit);
}

export function memoriesOf(state: GameState, opts: { projectId?: string; empirianId?: string }): Memory[] {
  return state.story.memories.filter((m) => (opts.projectId ? m.projectId === opts.projectId : true) && (opts.empirianId ? m.empirianIds?.includes(opts.empirianId) : true));
}
