import type { GameState, Tutorial } from '../model/state';

/**
 * In-game tutorial (AW.A). The simulation only stores progress; the UI shows
 * the guidance. Each step completes from a real fact of the game (or, for
 * purely visual steps, a mark the UI records through a command), so a player
 * who does something on their own is recognised and never asked to repeat it.
 */
export const TUTORIAL_STEPS = [
  'founder', 'meet', 'speed', 'first_game', 'progress', 'decision', 'release', 'reviews', 'decorate', 'story', 'hiring',
] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Steps the UI completes with a mark (they have no simulation fact). */
export const MARK_STEPS: readonly TutorialStep[] = ['meet', 'speed', 'progress', 'reviews', 'story', 'hiring'];

function counts(state: GameState): Tutorial['base'] {
  return {
    projects: state.projects.length,
    released: state.projects.filter((p) => p.phase === 'released').length,
    decisions: state.projects.reduce((a, p) => a + p.decisionsTaken.length, 0),
    purchases: state.ledger.filter((l) => l.kind === 'office' && l.text.key === 'ledger.office.bought').length,
  };
}

export function createTutorial(): Tutorial {
  return { active: true, marks: [], base: { projects: 0, released: 0, decisions: 0, purchases: 0 } };
}

export function stepDone(state: GameState, step: TutorialStep): boolean {
  const t = state.tutorial;
  const c = counts(state);
  const active = state.projects.find((p) => p.id === state.activeProjectId);
  switch (step) {
    case 'founder': return state.setupComplete;
    case 'first_game': return c.projects > t.base.projects;
    case 'progress': return t.marks.includes('progress') || (!!active && state.day - active.startDay >= 6) || c.released > t.base.released;
    case 'decision': return c.decisions > t.base.decisions;
    case 'release': return c.released > t.base.released;
    case 'decorate': return c.purchases > t.base.purchases;
    default: return t.marks.includes(step);
  }
}

/** The step to show now, or null when the tutorial is skipped or finished. */
export function currentStep(state: GameState): TutorialStep | null {
  if (!state.tutorial.active) return null;
  return TUTORIAL_STEPS.find((s) => !stepDone(state, s)) ?? null;
}

export function tutorialProgress(state: GameState): { done: number; total: number } {
  return { done: TUTORIAL_STEPS.filter((s) => stepDone(state, s)).length, total: TUTORIAL_STEPS.length };
}

export function tutorialCommand(state: GameState, action: 'mark' | 'skip' | 'restart' | 'finish', step?: string): string | null {
  const t = state.tutorial;
  switch (action) {
    case 'mark':
      if (!step || !(MARK_STEPS as readonly string[]).includes(step)) return 'unknown_step';
      if (!t.marks.includes(step)) t.marks.push(step);
      return null;
    case 'skip':
      t.active = false;
      return null;
    case 'restart':
      state.tutorial = { active: true, marks: [], base: counts(state) };
      return null;
    case 'finish':
      if (currentStep(state) !== null) return 'tutorial_not_done';
      t.active = false;
      t.finishedDay = state.day;
      return null;
  }
}
