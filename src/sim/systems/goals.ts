import type { GameState, TextRef } from '../model/state';
import { unlocked } from './progress';
import { getItemDef } from './office';
import { OFFICE_SIZES } from '../../content/officeSizes';

/**
 * Natural goals (block 1.3, D-063): the next nearby ambition, read from the
 * real state — never a quest log, never a reward. One line in the HUD.
 * The first goal that is still pending wins; when everything is done, none.
 */
export interface Goal {
  id: string;
  text: TextRef;
  /** What tapping the goal opens (the UI decides how). */
  action?: 'new_project' | 'project' | 'decor' | 'contracts' | 'team' | 'story';
}

const released = (s: GameState) => s.projects.filter((p) => p.phase === 'released');
const bestScore = (s: GameState) => Math.max(0, ...released(s).map((p) => p.result?.averageScore ?? 0));
const hasUpgrade = (s: GameState) =>
  s.office.items.some((it) => (it.mounts?.computer && it.mounts.computer !== 'pc_basic') || (it.mounts?.chair && it.mounts.chair !== 'chair_basic') || ['creative'].includes(getItemDef(it.defId).category));

export function nextGoal(s: GameState): Goal | null {
  if (!s.setupComplete) return null;
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const rel = released(s);
  if (!s.projects.length) return { id: 'first_game', text: { key: 'goal.first_game' }, action: 'new_project' };
  if (!rel.length) return { id: 'finish_first', text: { key: 'goal.finish_first', params: { name: active?.name ?? '' } }, action: 'project' };
  if (rel.length === 1 && (rel[0]!.result?.weeklySales.length ?? 0) === 0) return { id: 'first_sales', text: { key: 'goal.first_sales' } };
  if (unlocked(s, 'equipment') && !hasUpgrade(s) && s.company.money >= 1400) return { id: 'better_pc', text: { key: 'goal.better_pc' }, action: 'decor' };
  if (bestScore(s) < 7) return { id: 'good_review', text: { key: 'goal.good_review' }, action: active ? 'project' : 'new_project' };
  if (unlocked(s, 'contracts') && s.contracts.completed === 0 && !active) return { id: 'first_contract', text: { key: 'goal.first_contract' }, action: 'contracts' };
  if (unlocked(s, 'team') && s.hiring.hired === 0) return { id: 'first_hire', text: { key: 'goal.first_hire' }, action: 'team' };
  if (unlocked(s, 'studio') && !s.projects.some((p) => p.size === 'medium')) return { id: 'medium_game', text: { key: 'goal.medium_game' }, action: active ? undefined : 'new_project' };
  if (bestScore(s) < 8) return { id: 'great_review', text: { key: 'goal.great_review' } };
  if (unlocked(s, 'expansion') && (s.office.size ?? 'room') === 'room') return { id: 'expand', text: { key: 'goal.expand', params: { price: OFFICE_SIZES.studio.price } }, action: 'decor' };
  if (!s.projects.some((p) => p.profile === 'ambitious' && p.phase === 'released')) return { id: 'ambitious', text: { key: 'goal.ambitious' } };
  return null;
}
