import type { RngStreams } from '../core/rng';
import type { Pace } from '../config';

/**
 * Reference to player-facing text. The simulation never stores sentences, only
 * translation keys + parameters; the UI translates them (src/i18n).
 */
export interface TextRef {
  key: string;
  params?: Record<string, string | number>;
}

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

export type SkillId = 'tech' | 'design' | 'creativity' | 'management';

export interface Empirian {
  id: string;
  name: string;
  appearance: Appearance;
  /** Current levels (1-10, fractional). Derived from baseSkills + xp (systems/progression.ts). */
  skills: Record<SkillId, number>;
  /** Starting levels (future: founder origins). */
  baseSkills: Record<SkillId, number>;
  /** Experience earned by doing each kind of activity. */
  xp: Record<SkillId, number>;
  /** Experience per game topic (specialization). */
  topicXp: Record<string, number>;
  energy: number; // 0-100
  morale: number; // 0-100
  activity: Activity;
}

export type ProjectPhase = 'concept' | 'production' | 'polish' | 'released';
export type ProjectSize = 'small' | 'medium';

export interface DecisionOption {
  id: string;
  label: TextRef;
  /** Short, uncertain hints shown to the player (estimates, not exact values). */
  hints: TextRef[];
  disabledReason?: TextRef;
}

export interface PendingDecision {
  id: string;
  kind: 'big_idea' | 'deadline' | 'exhausted' | 'running_late' | 'polish_plan';
  speakerId: string;
  text: TextRef;
  options: DecisionOption[];
  createdTick: number;
}

export interface Review {
  outlet: string;
  score: number; // 1-10, one decimal
  quote: TextRef;
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
  /** Contextual moments already offered in this project (systems/moments.ts). */
  momentsOffered?: string[];
  lastMomentDay?: number;
  /** The team is taking days off until this day (no work, extra recovery). */
  restUntilDay?: number;
  /** Set once its routine history has been archived (systems/history.ts). */
  historyCompacted?: boolean;
  result?: ProjectResult;
}

export interface LedgerEntry {
  id: string;
  tick: number;
  day: number;
  kind: string;
  text: TextRef;
  causes: string[];
  /** Sign of the effect on product outcome: +1 good, -1 bad, 0 neutral. */
  tone: -1 | 0 | 1;
  projectId?: string;
}

export type Rot = 0 | 1 | 2 | 3;

/** A catalog item placed in the office (LS.2). Coordinates are grid cells. */
export interface PlacedItem {
  uid: string;
  defId: string;
  x: number;
  z: number;
  rot: Rot;
  /** Desks hold a computer and a chair (catalog ids). */
  mounts?: { computer?: string; chair?: string };
}

export interface Office {
  w: number;
  d: number;
  items: PlacedItem[];
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
  office: Office;
}
