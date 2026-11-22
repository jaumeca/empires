import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import type { Empirian, GameState, Project, Relation, RelationKind, SkillId } from '../model/state';
import { gainXp } from './progression';
import { remember } from './story';

/**
 * Professional relationships (E.3 / D-056). Light and fact-driven: a bond
 * (−100…100) grows or shrinks only because of things that happened in the
 * game — breaks spent chatting, days and launches shared, debates, mentoring.
 * Nothing random. Effects are moderate and capped: a bad relationship costs a
 * little morale and coordination, never sinks the studio, and tension fades
 * with time. Numbers in SIM_CONFIG.relations.
 */
const K = () => SIM_CONFIG.relations;

export function relationsOf(state: GameState): Relation[] {
  return state.relations ?? [];
}

/** The pair's relation (ids in a stable order). Created on demand when `create`. */
export function relation(state: GameState, x: string, y: string, create = false): Relation | null {
  const [a, b] = x < y ? [x, y] : [y, x];
  let r = relationsOf(state).find((q) => q.a === a && q.b === b) ?? null;
  if (!r && create && a !== b) {
    r = { a, b, bond: 0, days: 0, shared: 0, hits: 0, since: state.day };
    state.relations = [...relationsOf(state), r];
  }
  return r;
}

export function bond(state: GameState, x: string, y: string): number {
  return relation(state, x, y)?.bond ?? 0;
}

export function other(r: Relation, id: string): string {
  return r.a === id ? r.b : r.a;
}

/** What the relationship is, in words (derived; nothing extra is stored). */
export function kindOf(r: Relation): RelationKind | null {
  const k = K();
  if (r.mentor) return 'mentor';
  if (r.bond <= k.rivalsBelow) return 'rivals';
  if (r.bond <= k.tensionBelow) return 'tension';
  if (r.bond >= k.friendsAbove) return 'friends';
  if (r.hits >= k.respectHits && r.bond >= k.respectBond) return 'respect';
  if (r.shared >= k.goodTeamShared && r.bond >= k.goodTeamBond) return 'good_team';
  return null;
}

const name = (state: GameState, id: string) => state.empirians.find((e) => e.id === id)?.name ?? '';

/**
 * Changes a pair's bond. Gains shrink as the bond grows (no runaway friendships);
 * a new kind of relationship is announced, remembered once, and shown in the office.
 */
export function changeBond(state: GameState, x: string, y: string, delta: number, emit: EventSink, was?: RelationKind | null): void {
  if (x === y || !state.empirians.some((e) => e.id === x) || !state.empirians.some((e) => e.id === y)) return;
  const r = relation(state, x, y, true)!;
  const before = was !== undefined ? was : kindOf(r);
  const scaled = delta > 0 ? delta * (1 - Math.max(0, r.bond) / 110) : delta * (1 - Math.max(0, -r.bond) / 110);
  r.bond = Math.max(-100, Math.min(100, r.bond + scaled));
  announce(state, r, before, emit);
}

function announce(state: GameState, r: Relation, before: RelationKind | null, emit: EventSink): void {
  const now = kindOf(r);
  if (!now || now === before) return;
  // Easing out of tension is not news; becoming friends, rivals, mentor… is.
  if (before === 'rivals' && now === 'tension') return;
  emit({ type: 'relation', a: r.a, b: r.b, kind: now, severity: 'info' });
  const params = { a: name(state, r.mentor ?? r.a), b: name(state, r.mentor ? other(r, r.mentor) : r.b), skill: r.mentorSkill ?? 'tech' };
  remember(state, `relation:${r.a}|${r.b}:${now}`, 'relation', { key: `memory.relation.${now}`, params }, { tone: now === 'tension' || now === 'rivals' ? -1 : 1, empirianIds: [r.a, r.b] }, emit);
}

/** Main skill for mentoring: the better of programming and design. */
function mainSkill(e: Empirian): SkillId {
  return e.skills.tech >= e.skills.design ? 'tech' : 'design';
}

/** Daily: working together, mentoring, tension fading, and the small effect on morale. */
export function relationsDay(state: GameState, working: boolean, emit: EventSink, crunch = false): void {
  const k = K();
  const people = state.empirians;
  if (people.length < 2) return;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const x = people[i]!;
      const y = people[j]!;
      if (working) {
        const r = relation(state, x.id, y.id, true)!;
        r.days += 1;
        if (r.bond < k.workCap) changeBond(state, x.id, y.id, k.workTogether * chemistry(x, y), emit);
        if (crunch) changeBond(state, x.id, y.id, -k.crunchStrain, emit);
        mentoring(state, r, x, y, emit);
      }
      const r = relation(state, x.id, y.id);
      // Time heals: tension slowly fades.
      if (r && r.bond < 0) { const before = kindOf(r); r.bond = Math.min(0, r.bond + k.tensionFade); announce(state, r, before, emit); }
    }
  }
  // Morale: friends lift it a little, tension weighs a little (capped both ways).
  for (const e of people) {
    let lift = 0;
    for (const r of relationsOf(state)) {
      if (r.a !== e.id && r.b !== e.id) continue;
      const kd = kindOf(r);
      if (kd === 'friends' || kd === 'mentor') lift += k.friendMorale;
      else if (kd === 'tension') lift -= k.tensionMorale;
      else if (kd === 'rivals') lift -= k.rivalMorale;
    }
    e.morale = Math.max(0, Math.min(100, e.morale + Math.max(-k.moraleCap, Math.min(k.moraleCap, lift))));
  }
}

function mentoring(state: GameState, r: Relation, x: Empirian, y: Empirian, emit: EventSink): void {
  const k = K();
  if (r.mentor) {
    const mentor = state.empirians.find((e) => e.id === r.mentor);
    const mentee = state.empirians.find((e) => e.id === other(r, r.mentor!));
    if (!mentor || !mentee) return;
    const skill = r.mentorSkill ?? 'tech';
    gainXp(state, mentee, skill, k.menteeXp, emit);
    gainXp(state, mentor, 'management', k.mentorXp, emit);
    // When the student is nearly as good, the mentoring ends well.
    if (mentee.skills[skill] >= mentor.skills[skill] - k.graduateGap) {
      const before = kindOf(r);
      delete r.mentor;
      delete r.mentorSkill;
      r.bond = Math.min(100, r.bond + k.graduateBond);
      remember(state, `relation:${r.a}|${r.b}:graduated`, 'relation', { key: 'memory.relation.graduated', params: { a: mentor.name, b: mentee.name, skill } }, { tone: 1, empirianIds: [mentor.id, mentee.id] }, emit);
      announce(state, r, before, emit);
    }
    return;
  }
  if (r.bond < 0 || r.days < k.mentorAfterDays || r.mentorDone) return;
  // Someone clearly better at their main skill takes the other under their wing.
  for (const [m, s] of [[x, y], [y, x]] as const) {
    const skill = mainSkill(m);
    if (m.skills[skill] >= k.mentorMinSkill && s.skills[skill] <= m.skills[skill] - k.mentorGap) {
      const before = kindOf(r);
      r.mentor = m.id;
      r.mentorSkill = skill;
      r.mentorDone = true; // one mentoring per pair
      announce(state, r, before, emit);
      return;
    }
  }
}

/** Shared launches: a hit brings people together, a flop strains (or, between friends, unites). */
export function relationsRelease(state: GameState, p: Project, emit: EventSink): void {
  const k = K();
  const score = p.result?.averageScore ?? 5;
  const people = state.empirians;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const r = relation(state, people[i]!.id, people[j]!.id, true)!;
      const was = kindOf(r);
      r.shared += 1;
      if (score >= k.hitScore) { r.hits += 1; changeBond(state, r.a, r.b, k.hitBond, emit, was); }
      else if (score < k.flopScore) changeBond(state, r.a, r.b, r.bond >= k.flopUniteAbove ? k.flopUnite : -k.flopStrain, emit, was);
      else changeBond(state, r.a, r.b, k.shipBond, emit, was);
    }
  }
}

/**
 * Personality chemistry (not luck): sociable people warm up faster, two curious
 * minds click, a perfectionist is harder to win over.
 */
export function chemistry(x: Empirian, y: Empirian): number {
  let c = 1;
  for (const e of [x, y]) {
    if (e.trait === 'sociable') c *= 1.25;
    if (e.trait === 'perfectionist') c *= 0.8;
  }
  if (x.trait === 'curious' && y.trait === 'curious') c *= 1.2;
  return c;
}

/** A chat break together. */
export function relationsChat(state: GameState, x: string, y: string, emit: EventSink): void {
  const ex = state.empirians.find((e) => e.id === x);
  const ey = state.empirians.find((e) => e.id === y);
  changeBond(state, x, y, K().chat * (ex && ey ? chemistry(ex, ey) : 1), emit);
}

/** When someone leaves, their relationships go with them (memories stay). */
export function forgetRelations(state: GameState, id: string): void {
  if (!state.relations) return;
  state.relations = state.relations.filter((r) => r.a !== id && r.b !== id);
}

/**
 * Team harmony (coordination): good relationships make a team a little better
 * at working together, tense ones a little worse. Capped at ±maxHarmony.
 */
export function harmony(state: GameState): number {
  const rs = relationsOf(state);
  const n = state.empirians.length;
  if (n < 2 || !rs.length) return 1;
  const pairs = (n * (n - 1)) / 2;
  const avg = rs.reduce((a, r) => a + r.bond, 0) / pairs;
  const k = K();
  return 1 + Math.max(-k.maxHarmony, Math.min(k.maxHarmony, (avg / 100) * k.harmonyPerBond));
}

/** Notable relationships of one person, most important first (for the character sheet). */
export function notableRelations(state: GameState, id: string): { with: string; kind: RelationKind; mentorOf?: boolean; skill?: SkillId; bond: number }[] {
  const order: RelationKind[] = ['mentor', 'friends', 'rivals', 'tension', 'respect', 'good_team'];
  return relationsOf(state)
    .filter((r) => (r.a === id || r.b === id) && kindOf(r))
    .map((r) => ({ with: other(r, id), kind: kindOf(r)!, mentorOf: r.mentor ? r.mentor === id : undefined, skill: r.mentorSkill, bond: r.bond }))
    .sort((p, q) => order.indexOf(p.kind) - order.indexOf(q.kind) || Math.abs(q.bond) - Math.abs(p.bond));
}
