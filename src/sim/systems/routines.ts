import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import type { BreakKind, Empirian, GameState } from '../model/state';
import { getActiveProject } from '../state';
import { getItemDef, officeEffects } from './office';
import { bond, relationsChat, relationsOf } from './relations';

/**
 * Daily routines (AW.B): short, purposeful breaks that make the office feel
 * alive. No randomness: a break happens because of the hour of the working day,
 * energy, mood, personality and the furniture there is. At most one break per
 * person per day, one hour long, with small, understandable effects.
 */
const R = () => SIM_CONFIG.routines;

const ACTIVITY: Record<BreakKind, Empirian['activity']> = { drink: 'drinking', rest: 'lounging', chat: 'chatting' };

export function onBreak(state: GameState, e: Empirian): boolean {
  return e.breakUntil !== undefined && state.tick < e.breakUntil;
}

/** A place to sit and rest (sofa, armchair…). */
export function hasRestSeat(state: GameState): boolean {
  return state.office.items.some((it) => getItemDef(it.defId).spot?.pose === 'lounge');
}

function begin(state: GameState, e: Empirian, kind: BreakKind, emit: EventSink, partner?: Empirian, mentoring = false): void {
  e.breakUntil = state.tick + 1;
  e.breakKind = kind;
  e.lastBreakDay = state.day;
  e.activity = ACTIVITY[kind];
  if (partner) e.chatWith = partner.id; else delete e.chatWith;
  emit({ type: 'routine', empirianId: e.id, kind, partnerId: partner?.id, mentoring: mentoring || undefined, severity: 'info' });
}

/** Called at the start of every working tick, before work. */
export function routinesTick(state: GameState, emit: EventSink): void {
  const p = getActiveProject(state);
  const working = !state.pendingDecision && ((!!p && p.phase !== 'released' && !(p.restUntilDay !== undefined && state.day < p.restUntilDay)) || (!p && (!!state.contracts.active || !!state.support)));
  // Breaks end on their own.
  for (const e of state.empirians) if (e.breakUntil !== undefined && state.tick >= e.breakUntil) { delete e.breakUntil; delete e.breakKind; delete e.chatWith; }
  if (!working) return;
  const hour = state.tick % SIM_CONFIG.ticksPerDay;
  const fx = officeEffects(state.office);
  const crunch = p?.pace === 'crunch';
  const free = (e: Empirian) => !onBreak(state, e) && e.lastBreakDay !== state.day;
  // Every other day, a team with someone sociable (or everyone low) saves its break for a chat.
  const lowMood = state.empirians.filter((x) => x.morale < R().chatMoraleBelow).length >= 2;
  // Friends (E.3) also look forward to a chat.
  const friendsHere = relationsOf(state).some((r) => r.bond >= SIM_CONFIG.relations.friendsAbove);
  const chatDay = !crunch && state.empirians.length >= 2 && state.day % 2 === 0 && (state.empirians.some((x) => x.trait === 'sociable') || lowMood || friendsHere);
  // Mentoring (E.3): every other day the mentor goes over to help for an hour.
  if (hour === SIM_CONFIG.relations.mentorHour && state.day % 2 === 1 && !crunch) {
    for (const r of relationsOf(state)) {
      if (!r.mentor) continue;
      const m = state.empirians.find((x) => x.id === r.mentor);
      const s = state.empirians.find((x) => x.id === (r.a === r.mentor ? r.b : r.a));
      if (!m || !s || !free(m) || !free(s)) continue;
      begin(state, m, 'chat', emit, s, true);
      begin(state, s, 'chat', emit, m, true);
    }
  }
  for (const e of state.empirians) {
    if (!free(e)) continue;
    if (e.energy < R().restBelow && hasRestSeat(state) && !crunch) {
      begin(state, e, 'rest', emit);
      e.energy = Math.min(SIM_CONFIG.energy.max, e.energy + R().restGain + fx.rest);
    } else if (hour === R().drinkHour && !chatDay && fx.drink > 0 && e.energy < R().drinkBelow && (!crunch || e.trait === 'night_owl')) {
      // In crunch only the night owl still makes time for a coffee.
      begin(state, e, 'drink', emit);
      e.energy = Math.min(SIM_CONFIG.energy.max, e.energy + fx.drink);
    } else if (hour === R().chatHour && !crunch && state.empirians.length >= 2) {
      // Who to chat with: whoever they get on with best (never someone they're in tension with).
      const partner = state.empirians
        .filter((o) => o !== e && free(o) && bond(state, e.id, o.id) > SIM_CONFIG.relations.tensionBelow)
        .sort((a, b) => bond(state, e.id, b.id) - bond(state, e.id, a.id))[0];
      if (!partner) continue;
      const social = e.trait === 'sociable' || partner.trait === 'sociable';
      const friends = bond(state, e.id, partner.id) >= SIM_CONFIG.relations.friendsAbove;
      if (!social && !friends && !(e.morale < R().chatMoraleBelow && partner.morale < R().chatMoraleBelow)) continue;
      const gain = social ? R().sociableChatMorale : R().chatMorale;
      begin(state, e, 'chat', emit, partner);
      begin(state, partner, 'chat', emit, e);
      e.morale = Math.min(100, e.morale + gain);
      partner.morale = Math.min(100, partner.morale + gain);
      relationsChat(state, e.id, partner.id, emit);
    }
  }
}
