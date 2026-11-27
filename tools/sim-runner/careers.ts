/**
 * Whole-career runner for economy reviews (LS.9): plays games, contracts and
 * office purchases with simple human-like policies. Headless, deterministic.
 * Shared by tools/sim-runner/economy.report.ts and tests/sim/economy.test.ts.
 */
import { Game } from '../../src/sim/game';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from '../../src/sim/state';
import { getTopic } from '../../src/content/topics';
import { estimateDays } from '../../src/sim/systems/contracts';
import { canPlace } from '../../src/sim/systems/office';
import { employees, freeWorkstations } from '../../src/sim/systems/team';
import type { GameState, Rot } from '../../src/sim/model/state';
import type { Command } from '../../src/sim/commands';
import { patchBlock, updateBlock } from '../../src/sim/systems/products';
import { unlocked } from '../../src/sim/systems/progress';
import { SIM_CONFIG } from '../../src/sim/config';

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)]!;

type Next = { kind: 'game'; topicId: string; size: 'small' | 'medium'; budget: number; days: number; features?: string[]; ideaId?: string } | { kind: 'contract' } | { kind: 'wait' } | { kind: 'support'; projectId: string; job: 'patch' | 'update' };
export interface Strategy {
  name: string;
  next: (s: GameState, ctx: Ctx) => Next;
  /** Purchases once money allows (office investment strategies). */
  shopping?: { defId: string; mount?: boolean }[];
  /** GT.1: hire up to this many employees (best skill per euro), buying desks as needed. */
  hire?: number;
}
interface Ctx { games: number; lastScore: number; justContracted?: boolean }

const game = (topicId: string, size: 'small' | 'medium' = 'small', budget = 1500, days = 42): Next => ({ kind: 'game', topicId, size, budget, days });
const kart = () => game('kart');
const trendTopic = (s: GameState) => s.world.trends.find((x) => s.day - x.startDay <= 14 && s.day < x.peakDay)?.topicId ?? 'kart';

/** GT.6: the product most worth looking after now (null = none). */
function careFor(s: GameState): Next | null {
  if (!unlocked(s, 'products')) return null;
  for (const p of s.projects) {
    if (!p.result) continue;
    if (!updateBlock(s, p) && p.result.averageScore >= 7 && (p.result.salesEnded || p.result.weeklySales.length >= SIM_CONFIG.market.salesWeeks)) return { kind: 'support', projectId: p.id, job: 'update' };
    if (!patchBlock(s, p) && p.bugs.hidden + p.bugs.known >= 6 && p.result.averageScore >= 6.5 && !p.result.salesEnded) return { kind: 'support', projectId: p.id, job: 'patch' };
  }
  return null;
}

export const STRATEGIES: Strategy[] = [
  { name: 'A games only (small)', next: () => kart() },
  { name: 'B growth (medium when rich)', next: (s, c) => (c.games >= 2 && s.company.money > 14000 ? game('kart', 'medium', 3000, 98) : kart()) },
  // Since D-062 clients call once the first game is on sale: one game, then contracts only.
  { name: 'C contracts only (after a first game)', next: (_s, c) => (c.games === 0 ? kart() : { kind: 'contract' }) },
  { name: 'D mixed (contract after a flop/low cash)', next: (s, c) => (c.games > 0 && (c.lastScore < 6.5 || s.company.money < 7000) && s.contracts.offers.length && !c.justContracted ? { kind: 'contract' } : kart()) },
  { name: 'E games + office investment', next: () => kart(), shopping: [{ defId: 'pc_dev', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'whiteboard' }] },
  { name: 'F games + big spend office', next: () => kart(), shopping: [{ defId: 'pc_workstation', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'sofa' }, { defId: 'whiteboard' }, { defId: 'arcade' }, { defId: 'plant_tall' }, { defId: 'lamp_floor' }] },
  { name: 'H realistic: mixed + office + growth', next: (s, c) => (c.games > 0 && (c.lastScore < 6.5 || s.company.money < 7000) && s.contracts.offers.length && !c.justContracted ? { kind: 'contract' } : c.games >= 2 && s.company.money > 14000 ? game('kart', 'medium', 3000, 98) : kart()), shopping: [{ defId: 'pc_dev', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'whiteboard' }, { defId: 'sofa' }, { defId: 'plant_tall' }] },
  { name: 'I growth + office (no contracts)', next: (s, c) => (c.games >= 2 && s.company.money > 14000 ? game('kart', 'medium', 3000, 98) : kart()), shopping: [{ defId: 'pc_dev', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'whiteboard' }, { defId: 'sofa' }, { defId: 'plant_tall' }] },
  { name: 'J realistic + hire 1', hire: 1, next: (s, c) => (c.games > 0 && (c.lastScore < 6.5 || s.company.money < 7000) && s.contracts.offers.length && !c.justContracted ? { kind: 'contract' } : c.games >= 2 && s.company.money > 14000 ? game('kart', 'medium', 3000, 98) : kart()), shopping: [{ defId: 'pc_dev', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'whiteboard' }, { defId: 'sofa' }, { defId: 'plant_tall' }] },
  { name: 'K realistic + hire 2', hire: 2, next: (s, c) => (c.games > 0 && (c.lastScore < 6.5 || s.company.money < 7000) && s.contracts.offers.length && !c.justContracted ? { kind: 'contract' } : c.games >= 2 && s.company.money > 14000 ? game('kart', 'medium', 3000, 98) : kart()), shopping: [{ defId: 'pc_dev', mount: true }, { defId: 'chair_ergo', mount: true }, { defId: 'coffee_machine' }, { defId: 'whiteboard' }, { defId: 'sofa' }, { defId: 'plant_tall' }] },
  { name: 'L small games + hire 1', hire: 1, next: () => kart() },
  // GT.6: between games, patch a buggy hit and give good games new content when they can.
  { name: 'M games + look after products', next: (s) => careFor(s) ?? kart() },
  // D-068: always follow the team's oldest idea when there is one (its topic and feature).
  { name: 'N games following the team\'s ideas', next: (s) => { const i = (s.company.inspirations ?? [])[0]; return i ? { ...game(i.topicId ?? 'kart', 'small', 1500, 47), features: i.featureId ? [i.featureId] : undefined, ideaId: i.id } : kart(); } }, // +12 % work → ~+5 days, as a player would plan
  { name: 'G early trends + growth', next: (s, c) => (c.games >= 2 && s.company.money > 14000 ? game(trendTopic(s), 'medium', 3000, 98) : game(trendTopic(s))) },
];

function placeAnywhere(s: GameState, defId: string): Command | null {
  for (let z = 0; z < s.office.d; z++)
    for (let x = 0; x < s.office.w; x++)
      for (const rot of [0, 1, 2, 3] as Rot[]) if (!canPlace(s.office, defId, x, z, rot)) return { type: 'buy_item', defId, x, z, rot };
  return null;
}

/** A sensible player's answers to the story events (no gambling). */
export const STORY_POLICY: Record<string, string> = {
  team_idea: 'adopt', contract_change: 'paid', game_fair: 'table', influential_review: 'interview', team_debate: 'both', training_request: 'books',
  tech_shortcut: 'proper', debt_review: 'patch', scope_idea: 'keep',
  office_or_project: 'neither', old_game_revival: 'carry_on',
};

export function career(seed: number, st: Strategy, horizon = 365) {
  const g = new Game(createNewGame(seed));
  g.dispatch({ type: 'setup_founder', name: 'T', companyName: 'T', appearance: DEFAULT_APPEARANCE });
  const ctx: Ctx = { games: 0, lastScore: 10 };
  let minMoney = g.state.company.money;
  let spentOffice = 0, contracts = 0, late = 0, hires = 0, hireRetryDay = 0, supports = 0;
  const decisions = new Set<string>();
  const scores: number[] = [];
  const shop = [...(st.shopping ?? [])];
  // 0.20.0: days with something notable happening (to find long quiet stretches).
  const NOTABLE = new Set(['unlock', 'decision_requested', 'inspiration', 'project_released', 'achievement', 'product_happening', 'client_referral', 'hired', 'contract_done', 'support_done', 'fame', 'relation']);
  const notable: number[] = [];
  g.onUpdate((ev) => { for (const e of ev) { if (e.type === 'contract_done') { contracts++; if (e.lateDays > 0) late++; } if (NOTABLE.has(e.type) && notable[notable.length - 1] !== g.state.day) notable.push(g.state.day); } });
  let pid: string | null = null;
  let idleUntil = 0;
  while (g.state.day < horizon) {
    const s = g.state;
    const d = s.pendingDecision;
    if (d) {
      const opt = d.kind === 'deadline' ? 'release' : d.kind === 'big_idea' ? 'keep' : d.kind === 'exhausted' ? 'rest' : d.kind === 'rival_similar' ? 'differentiate' : d.kind === 'critical_bug' ? 'patch_now' : d.kind === 'unexpected_idea' ? 'save'
        : STORY_POLICY[d.kind] ?? d.options[d.options.length - 1]!.id;
      const ok = d.options.some((o) => o.id === opt) ? opt : d.options[0]!.id;
      decisions.add(`${d.kind}:${ok}`);
      g.dispatch({ type: 'choose_option', decisionId: d.id, optionId: ok });
      continue;
    }
    if (pid && !s.activeProjectId) {
      const r = getProject(s, pid)!.result;
      if (r) { scores.push(r.averageScore); ctx.lastScore = r.averageScore; ctx.games++; }
      pid = null;
      idleUntil = s.day + 5;
    }
    // Hiring between jobs (GT.1): buy a desk if needed, then the best skill per euro.
    // A player can hire at any time (also mid-project); since D-062 the team unlocks with the 2nd launch.
    if (st.hire && s.day >= hireRetryDay && !s.pendingDecision && employees(s).length < st.hire && s.hiring.candidates.length && s.company.money > 15000) {
      hireRetryDay = s.day + 7; // one attempt per week at most (never loops without time passing)
      if (!freeWorkstations(s).length) {
        const before = s.company.money;
        const cmd = placeAnywhere(s, 'desk_basic');
        if (cmd && g.dispatch(cmd).ok) spentOffice += before - g.state.company.money;
      }
      const best = [...s.hiring.candidates].sort((a, b) => (b.baseSkills.tech + b.baseSkills.design) / b.salary - (a.baseSkills.tech + a.baseSkills.design) / a.salary)[0]!;
      if (g.dispatch({ type: 'hire', candidateId: best.id }).ok) hires++;
      continue;
    }
    // Shopping between jobs, keeping a cushion for the next game.
    if (!s.activeProjectId && !s.contracts.active && shop.length && s.company.money > 12000) {
      const it = shop[0]!;
      const before = s.company.money;
      const desk = s.office.items.find((i) => i.defId.startsWith('desk'));
      const cmd: Command | null = it.mount ? { type: 'mount_item', defId: it.defId, deskUid: desk!.uid } : placeAnywhere(s, it.defId);
      if (cmd && g.dispatch(cmd).ok) spentOffice += before - g.state.company.money;
      shop.shift();
      continue;
    }
    if (!s.activeProjectId && !s.contracts.active && !s.support && s.day >= idleUntil) {
      const n = st.next(s, ctx);
      if (n.kind === 'support') { if (g.dispatch({ type: 'start_support', projectId: n.projectId, kind: n.job }).ok) { supports++; continue; } }
      if (n.kind === 'contract' && s.contracts.offers.length) {
        const best = [...s.contracts.offers].sort((a, b) => b.payment / estimateDays(s, b.work, b.focus) - a.payment / estimateDays(s, a.work, a.focus))[0]!;
        g.dispatch({ type: 'accept_contract', offerId: best.id });
        ctx.justContracted = true;
      } else if (n.kind === 'game') {
        const r = g.dispatch({ type: 'start_project', name: `P${ctx.games}`, topicId: n.topicId, features: n.features, ideaId: n.ideaId, size: n.size, focus: getTopic(n.topicId).idealFocus, budget: Math.min(n.budget, Math.max(0, s.company.money - 1000)), days: n.days, price: n.size === 'medium' ? 14.99 : 9.99 });
        if (r.ok) { pid = g.state.activeProjectId; ctx.justContracted = false; }
      }
    }
    // Human-like energy management: relax when tired, back to normal when rested.
    if (s.activeProjectId && s.tick % 8 === 0) {
      const p = getProject(s, s.activeProjectId)!;
      const e = s.empirians[0]!.energy;
      const want = e < 35 ? 'relaxed' : e > 60 ? 'normal' : p.pace;
      if (want !== p.pace) g.dispatch({ type: 'adjust_project', pace: want });
    }
    g.tick();
    minMoney = Math.min(minMoney, g.state.company.money);
  }
  const f = g.state.empirians[0]!;
  return {
    money: g.state.company.money, minMoney, supports, notable, games: scores.length, score: mean(scores), contracts, late,
    spentOffice, hires, salaries: g.state.hiring.salariesPaid, team: g.state.empirians.length, rep: g.state.company.reputation, skill: `${f.skills.tech.toFixed(1)}/${f.skills.design.toFixed(1)}/${f.skills.creativity.toFixed(1)}/${f.skills.management.toFixed(1)}`, decisions,
    unlockDays: g.state.progress?.days ?? {},
    relations: (g.state.relations ?? []).map((r) => ({ bond: Math.round(r.bond), shared: r.shared, hits: r.hits, days: r.days, mentor: !!r.mentor, mentorDone: !!r.mentorDone })),
    memories: g.state.story.memories.filter((m) => m.kind === 'relation').map((m) => `${m.day}:${m.text.key.split('.').pop()}`),
  };
}
