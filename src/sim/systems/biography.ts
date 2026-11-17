import type { Empirian, GameState, SkillId, TextRef } from '../model/state';
import { SKILLS, specializations } from './progression';
import { memoriesOf } from './story';

/**
 * A short, factual biography of an Empirian (AW.C). Every sentence comes from
 * something that really happened in this game — nothing is invented.
 */
export function biography(state: GameState, e: Empirian): TextRef[] {
  const out: TextRef[] = [];
  const founder = e.id === state.founderId;
  const since = founder ? 1 : e.hiredDay ?? 1;
  if (founder) out.push({ key: 'bio.founder', params: { company: state.company.name } });
  else out.push({ key: 'bio.joined', params: { day: since, days: Math.max(0, state.day - since) } });
  const games = state.projects.filter((p) => p.result && p.result.releasedDay >= since);
  if (games.length) {
    const best = games.reduce((a, b) => (b.result!.averageScore > a.result!.averageScore ? b : a));
    out.push({ key: 'bio.games', params: { count: games.length, best: best.name, score: Math.round(best.result!.averageScore * 10) / 10 } });
  } else if (!founder || state.projects.length) out.push({ key: 'bio.no_games', params: {} });
  const top: SkillId = SKILLS.reduce((a, b) => (e.skills[b] > e.skills[a] ? b : a));
  out.push({ key: 'bio.strength', params: { skill: top, level: Math.floor(e.skills[top]) } });
  const spec = specializations(e)[0];
  if (spec) out.push({ key: 'bio.specialty', params: { topic: spec.topicId } });
  const mastered = memoriesOf(state, { empirianId: e.id }).filter((m) => m.kind === 'skill_master').length;
  if (mastered) out.push({ key: 'bio.mastered', params: { count: mastered } });
  if (e.energy < 30) out.push({ key: 'bio.tired', params: {} });
  else if (e.morale >= 75) out.push({ key: 'bio.happy', params: {} });
  return out;
}
