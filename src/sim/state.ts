import { SIM_CONFIG } from './config';
import { createRngStreams } from './core/rng';
import type { Appearance, Empirian, GameState, Project } from './model/state';
import { TOPICS } from '../content/topics';
import { createStartingOffice } from './systems/office';
import { createWorld } from './systems/world';
import { createHiring } from './systems/team';
import { createStory } from './systems/story';
import { createTutorial } from './systems/tutorial';
import { createContracts } from './systems/contracts';

export const SCHEMA_VERSION = 10;

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 2,
  hairStyle: 0,
  hairColor: 1,
  top: 0,
  topColor: 0,
  pantsColor: 0,
  accessory: 0,
};

export function createNewGame(seed: number): GameState {
  const founder: Empirian = {
    id: 'E-founder',
    name: 'Alex',
    appearance: { ...DEFAULT_APPEARANCE },
    skills: { tech: 5, design: 5, creativity: 5, management: 5 },
    baseSkills: { tech: 5, design: 5, creativity: 5, management: 5 },
    xp: { tech: 0, design: 0, creativity: 0, management: 0 },
    topicXp: {},
    energy: SIM_CONFIG.energy.max,
    morale: 70,
    activity: 'idle',
  };
  const topicTrends: Record<string, number> = {};
  for (const t of TOPICS) topicTrends[t.id] = 1;
  let uid = 0;
  const office = createStartingOffice(() => `I-start-${++uid}`);
  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    rng: createRngStreams(seed),
    tick: 0,
    day: 1,
    nextId: 1,
    company: { name: 'Mi Estudio', money: SIM_CONFIG.economy.startingMoney, reputation: 30 },
    founderId: founder.id,
    empirians: [founder],
    projects: [],
    activeProjectId: null,
    pendingDecision: null,
    ledger: [],
    topicTrends,
    setupComplete: false,
    office,
    world: createWorld(),
    contracts: createContracts(),
    hiring: createHiring(),
    story: createStory(),
    tutorial: createTutorial(),
    scheduled: [],
    eventLog: { lastDay: null, lastByKind: {} },
  };
}

export function getFounder(state: GameState): Empirian {
  const f = state.empirians.find((e) => e.id === state.founderId);
  if (!f) throw new Error('Founder missing');
  return f;
}

export function getActiveProject(state: GameState): Project | null {
  if (!state.activeProjectId) return null;
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}

export function getProject(state: GameState, id: string): Project | undefined {
  return state.projects.find((p) => p.id === id);
}
