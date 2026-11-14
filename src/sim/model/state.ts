import type { RngStreams } from '../core/rng';
import type { Pace } from '../config';

/** Visual appearance of an Empirian. Indices refer to catalogs in content/appearance. */
export interface Appearance {
  skin: number;
  hairStyle: number;
  hairColor: number;
  top: number;
  topColor: number;
  pantsColor: number;
  accessory: number; // 0 = none
}

export type Activity =
  | 'idle'
  | 'coding'
  | 'designing'
  | 'testing'
  | 'thinking'
  | 'raising_hand'
  | 'celebrating'
  | 'resting';

export interface Empirian {
  id: string;
  name: string;
  appearance: Appearance;
  skills: { tech: number; design: number }; // 1-10
  energy: number; // 0-100
  morale: number; // 0-100
  activity: Activity;
}

export type ProjectPhase = 'concept' | 'production' | 'polish' | 'released';
export type ProjectSize = 'small' | 'medium';

export interface DecisionOption {
  id: string;
  label: string;
  /** Short, uncertain hints shown to the player (estimates, not exact values). */
  hints: string[];
  disabledReason?: string;
}

export interface PendingDecision {
  id: string;
  kind: 'big_idea' | 'deadline';
  speakerId: string;
  text: string;
  options: DecisionOption[];
  createdTick: number;
}

export interface Review {
  outlet: string;
  score: number; // 1-10, one decimal
  quote: string;
}

export interface ProjectResult {
  releasedDay: number;
  price: number;
  reviews: Review[];
  averageScore: number;
  weeklySales: number[]; // units per week so far
  totalUnits: number;
  revenue: number;
  /** Causal ledger ids explaining the score, most relevant first. */
  explanation: string[];
}

export interface Project {
  id: string;
  name: string;
  topicId: string;
  size: ProjectSize;
  /** 0 = pure design, 1 = pure tech. */
  focus: number;
  pace: Pace;
  phase: ProjectPhase;
  startDay: number;
  /** Day the product was announced to be ready. Can be changed by the player. */
  deadlineDay: number;
  originalDeadlineDay: number;
  budget: number;
  spent: number;
  /** Retail price chosen by the player. */
  price: number;
  requiredPoints: number;
  /** Production work done (design + tech). */
  workDone: { design: number; tech: number };
  /** Extra quality-earning polish work after production. */
  polishDone: number;
  testingDone: number;
  /** Additive modifiers to the quality ceiling, each tied to a ledger entry. */
  ceilingMods: { amount: number; causeId: string }[];
  bugRateMods: { factor: number; causeId: string }[];
  bugs: { hidden: number; known: number; fixed: number };
  hype: number;
  /** Fraction of polish-phase work devoted to testing/fixing (0-1). */
  testFocus: number;
  decisionsTaken: string[];
  bigIdeaOffered: boolean;
  result?: ProjectResult;
}

export interface LedgerEntry {
  id: string;
  tick: number;
  day: number;
  kind: string;
  text: string;
  causes: string[];
  /** Sign of the effect on product outcome: +1 good, -1 bad, 0 neutral. */
  tone: -1 | 0 | 1;
  projectId?: string;
}

export interface GameState {
  schemaVersion: number;
  seed: number;
  rng: RngStreams;
  tick: number;
  day: number;
  nextId: number;
  company: {
    name: string;
    money: number;
    reputation: number; // 0-100
  };
  founderId: string;
  empirians: Empirian[];
  projects: Project[];
  activeProjectId: string | null;
  pendingDecision: PendingDecision | null;
  ledger: LedgerEntry[];
  /** Trend multiplier per topic id (market drift). */
  topicTrends: Record<string, number>;
  /** Set until the founder has been customized. */
  setupComplete: boolean;
}
