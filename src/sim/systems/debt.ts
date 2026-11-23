import { SIM_CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { record } from '../core/ledger';
import type { Empirian, GameState, Project } from '../model/state';
import { harmony } from './relations';
import { hasActiveTester } from './project';

/**
 * Technical debt (F3.4 / D-057). Shortcuts and haste leave "patches" in the
 * code: the project's debt (0…100). It grows while building — faster in
 * crunch, slower with skilled or perfectionist people and a well-coordinated
 * team — and it costs later: slower programming, more bugs and a slightly
 * lower ceiling. Part of it stays in the studio's codebase and the next game
 * starts with it. It is paid by refactoring (a moment) or a solid base.
 * Numbers in SIM_CONFIG.debt.
 */
const K = () => SIM_CONFIG.debt;

export function debtOf(p: Project): number {
  return p.debt ?? 0;
}

/** How a person's way of working adds debt: skill and personality (moderate). */
export function personDebtFactor(e: Empirian): number {
  const skill = Math.max(0.6, Math.min(1.3, 1 - (e.skills.tech - 5) * K().skillEffect));
  return skill * (e.trait === 'perfectionist' ? K().perfectionist : 1);
}

/** Debt from one hour of building (called with the tech points just built). */
export function accrueDebt(state: GameState, p: Project, e: Empirian, techPts: number): void {
  if (techPts <= 0) return;
  const pace = K().pace[p.pace] ?? 1;
  // A team that gets on well cuts fewer corners (E.3): harmony ±5 % → debt ∓20 %.
  const team = 1 - (harmony(state) - 1) * K().harmonyEffect;
  // A tester reviewing the code (E.2) catches shortcuts early.
  const review = hasActiveTester(state) ? SIM_CONFIG.roles.reviewDebt : 1;
  p.debt = Math.min(K().max, debtOf(p) + techPts * K().perTechPoint * pace * personDebtFactor(e) * team * review);
}

/** Programming slows down with debt (capped). */
export function debtSpeed(p: Project): number {
  return 1 - Math.min(K().maxSlowdown, debtOf(p) * K().slowdownPerPoint);
}

/** More bugs with debt. */
export function debtBugs(p: Project): number {
  return 1 + debtOf(p) * K().bugsPerPoint;
}

/** A fragile codebase shows in the result (small, capped). */
export function debtCeiling(p: Project): number {
  return Math.min(K().maxCeiling, Math.max(0, debtOf(p) - K().ceilingFree) * K().ceilingPerPoint);
}

/** Words for the player instead of a number. */
export function debtLevel(debt: number): 'solid' | 'patched' | 'fragile' {
  return debt < K().patchedAt ? 'solid' : debt < K().fragileAt ? 'patched' : 'fragile';
}

/** Work points to refactor a share of the debt. */
export function refactorCost(p: Project, share: number): number {
  return debtOf(p) * share * K().refactorPointsPerDebt;
}

/** At launch, part of the debt stays in the studio's code for the next game. */
export function carryDebt(state: GameState, p: Project): void {
  const left = debtOf(p) * K().carryShare;
  state.company.techDebt = Math.min(K().maxCompany, (state.company.techDebt ?? 0) * K().companyDecay + left);
}

/** A new project inherits the studio's code (and a solid base from before, if any). */
export function inheritDebt(state: GameState, p: Project, emit: EventSink): void {
  void emit;
  const inherited = state.company.techDebt ?? 0;
  if (inherited > 0.5) {
    p.debt = inherited;
    state.company.techDebt = 0;
    const id = record(state, { kind: 'consequence', text: { key: 'ledger.debt.inherited', params: { project: p.name, level: debtLevel(inherited) } }, causes: [], tone: -1, projectId: p.id });
    p.debtCauses = [...(p.debtCauses ?? []), id];
  }
  if (state.company.solidBase) {
    p.requiredPoints = Math.round(p.requiredPoints * (1 - K().solidBaseSaving));
    const id = record(state, { kind: 'consequence', text: { key: 'ledger.debt.solid_base_used', params: { project: p.name } }, causes: [state.company.solidBase], tone: 1, projectId: p.id });
    void id;
    delete state.company.solidBase;
  }
}
