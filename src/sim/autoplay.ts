import type { Pace } from './config';
import { Game } from './game';
import type { GameState, ProjectSize } from './model/state';
import { createNewGame, DEFAULT_APPEARANCE, getProject } from './state';

/**
 * Headless helper that plays one full project with a fixed policy.
 * Used by tests and by tools/sim-runner for balance analysis. No rendering.
 */
export interface AutoplayPlan {
  seed: number;
  topicId?: string;
  size?: ProjectSize;
  focus?: number;
  budget?: number;
  days?: number;
  price?: number;
  pace?: Pace;
  testFocus?: number;
  bigIdea?: 'approve' | 'simple' | 'postpone' | 'keep';
  /** At the deadline: release or extend. */
  atDeadline?: 'release' | 'extend7' | 'extend14';
  /** Weeks to keep simulating after release so sales accrue. */
  weeksAfter?: number;
}

export interface AutoplayResult {
  state: GameState;
  game: Game;
  score: number;
  revenue: number;
  units: number;
  shippedBugs: number;
  profit: number;
  releaseDay: number;
}

export function autoplay(plan: AutoplayPlan): AutoplayResult {
  const game = new Game(createNewGame(plan.seed));
  const startMoney = game.state.company.money;
  must(game.dispatch({ type: 'setup_founder', name: 'Test', companyName: 'Test Studio', appearance: DEFAULT_APPEARANCE }));
  must(
    game.dispatch({
      type: 'start_project',
      name: 'Autoplay',
      topicId: plan.topicId ?? 'space-farm',
      size: plan.size ?? 'small',
      focus: plan.focus ?? 0.35,
      budget: plan.budget ?? 1500,
      days: plan.days ?? 42,
      price: plan.price ?? 9.99,
    }),
  );
  if (plan.pace || plan.testFocus !== undefined) {
    must(game.dispatch({ type: 'adjust_project', pace: plan.pace, testFocus: plan.testFocus }));
  }
  const projectId = game.state.activeProjectId!;
  let guard = 0;
  let shippedBugs = 0;
  while (game.state.activeProjectId && guard++ < 20000) {
    const d = game.state.pendingDecision;
    if (d) {
      const opt = d.kind === 'big_idea' ? (plan.bigIdea ?? 'keep') : (plan.atDeadline ?? 'release');
      // Never extend forever: after two extensions, release.
      const extensions = getProject(game.state, projectId)!.decisionsTaken.filter((x) => x.startsWith('deadline:extend')).length;
      const finalOpt = d.kind === 'deadline' && extensions >= 2 ? 'release' : opt;
      if (d.kind === 'deadline' && finalOpt === 'release') {
        const p = getProject(game.state, projectId)!;
        shippedBugs = p.bugs.hidden + p.bugs.known;
      }
      must(game.dispatch({ type: 'choose_option', decisionId: d.id, optionId: finalOpt }));
      continue;
    }
    game.tick();
  }
  const releaseDay = game.state.day;
  const weeks = plan.weeksAfter ?? 11;
  for (let i = 0; i < weeks * 7 * 8; i++) game.tick();
  const p = getProject(game.state, projectId)!;
  const r = p.result!;
  return {
    state: game.state,
    game,
    score: r.averageScore,
    revenue: r.revenue,
    units: r.totalUnits,
    shippedBugs,
    profit: game.state.company.money - startMoney,
    releaseDay,
  };
}

function must(res: { ok: boolean; error?: string }): void {
  if (!res.ok) throw new Error(`Command failed: ${res.error}`);
}

/**
 * Plays `projects` consecutive games with a policy function (career mode).
 * Returns the game for inspection. Used by long-game tests and balance reports.
 */
export function autoplayCareer(
  seed: number,
  projects: number,
  policy: (i: number, state: GameState) => Omit<AutoplayPlan, 'seed' | 'weeksAfter'> = () => ({}),
  restDaysBetween = 7,
): { game: Game; scores: number[]; moneyAfter: number[] } {
  const game = new Game(createNewGame(seed));
  must(game.dispatch({ type: 'setup_founder', name: 'Test', companyName: 'Test Studio', appearance: DEFAULT_APPEARANCE }));
  const scores: number[] = [];
  const moneyAfter: number[] = [];
  for (let i = 0; i < projects; i++) {
    const plan = policy(i, game.state);
    const money = Math.max(0, game.state.company.money);
    const r = game.dispatch({
      type: 'start_project', name: `P${i}`, topicId: plan.topicId ?? 'space-farm', size: plan.size ?? 'small', focus: plan.focus ?? 0.35,
      budget: Math.min(plan.budget ?? 1500, money), days: plan.days ?? 42, price: plan.price ?? 9.99,
    });
    if (!r.ok) break;
    if (plan.pace || plan.testFocus !== undefined) game.dispatch({ type: 'adjust_project', pace: plan.pace, testFocus: plan.testFocus });
    const pid = game.state.activeProjectId!;
    let guard = 0;
    while (game.state.activeProjectId && guard++ < 50000) {
      const d = game.state.pendingDecision;
      if (d) {
        const p = getProject(game.state, pid)!;
        const ext = p.decisionsTaken.filter((x) => x.startsWith('deadline:extend')).length;
        const opt = d.kind === 'big_idea' ? (plan.bigIdea ?? 'keep') : ext >= 2 ? 'release' : (plan.atDeadline ?? 'release');
        must(game.dispatch({ type: 'choose_option', decisionId: d.id, optionId: opt }));
        continue;
      }
      game.tick();
    }
    for (let k = 0; k < restDaysBetween * 8; k++) game.tick();
    scores.push(getProject(game.state, pid)!.result!.averageScore);
    moneyAfter.push(game.state.company.money);
  }
  return { game, scores, moneyAfter };
}
