/**
 * Tunable simulation constants. Everything about pacing and balance lives here
 * so it can be adjusted without touching system logic (D-010).
 *
 * Time model: 1 tick = 1 working hour. A game day has TICKS_PER_DAY working ticks;
 * nights are not simulated tick-by-tick, only as a day-boundary step (rest, costs).
 */
export const SIM_CONFIG = {
  /** Working ticks (hours) per game day. */
  ticksPerDay: 8,
  /** Real seconds that one game day lasts at 1x speed (provisional: D-010). */
  realSecondsPerDayAt1x: 3,
  /** Allowed speeds. 0 = paused. */
  speeds: [0, 1, 2, 4, 8] as const,
  /** Safety cap: max ticks processed in a single frame (prevents spiral of death). */
  maxTicksPerFrame: 64,

  economy: {
    startingMoney: 8000,
    /** Living costs paid every day regardless of activity. */
    dailyLivingCost: 40,
  },

  work: {
    /** Work points per tick for a skill-5 founder at full efficiency. */
    basePointsPerTick: 1.0,
    /** Points of work required per project size. */
    requiredPoints: { small: 220, medium: 520 } as Record<string, number>,
    /** Fraction of required points that make up the concept phase. */
    conceptFraction: 0.15,
    /** Productivity multiplier from budget: 1 + maxBoost * (1 - e^(-dailySpend / spendScale)). */
    budgetMaxBoost: 0.3,
    budgetSpendScale: 120,
    /** Fraction of budget that goes to marketing (builds hype). */
    marketingShare: 0.3,
  },

  quality: {
    /** Quality ceiling (0-10) base before skill and fit modifiers. */
    baseCeiling: 6.2,
    /** Rate constant of the saturating quality curve. */
    k: 2.2,
    /** Quality points earned per polish point, relative to production points. */
    polishWeight: 0.6,
  },

  bugs: {
    /** Expected bugs per tech work point at normal pace and full energy. */
    ratePerTechPoint: 0.12,
    /** Fraction of new bugs that are hidden. */
    hiddenShare: 0.75,
    /** Probability a hidden bug is discovered per testing point. */
    discoverPerTestPoint: 0.035,
    /** Work points needed to fix a known bug. */
    fixCost: 0.8,
  },

  energy: {
    max: 100,
    drainPerTick: { relaxed: 0.35, normal: 0.85, crunch: 1.5 } as Record<string, number>,
    overnightRecovery: 5.0,
    /** Below this, efficiency and bug rate get worse. */
    tiredThreshold: 40,
  },

  /** "Big idea" Decisive Moment (D-030): a gamble, not a free upgrade. */
  bigIdea: {
    approve: { work: 1.35, ceilingHit: 1.1, ceilingMiss: 0.2, hitChance: 0.65, bugFactor: 1.2 },
    simple: { work: 1.07, ceiling: 0.5, bugFactor: 1.3 },
  },

  /** Founder learning (LS.1, D-035): level = base + gainMax · (1 − e^(−xp/xpScale)), capped. */
  progression: {
    gainMax: 3,
    xpScale: 1800,
    cap: 9.5,
    topicGainMax: 0.45,
    topicScale: 1500,
    /** Share of work points that also count as creativity xp in the concept phase / polish improvements. */
    conceptCreativity: 0.6,
    polishCreativity: 0.35,
    testingTech: 0.5,
    managementPerProjectDay: 1,
    managementPerRelease: 12,
    managementPerDecision: 3,
    /** Effects of the new skills (small on purpose). */
    creativityCeiling: 0.12,
    creativityBigIdea: 0.04,
    managementFatigue: 0.03,
    /** Work speed per skill level around 5 (was effectively 0.2 when speed was linear in skill). */
    speedPerLevel: 0.1,
  },

  pace: {
    workMultiplier: { relaxed: 0.8, normal: 1.0, crunch: 1.45 } as Record<string, number>,
    bugMultiplier: { relaxed: 0.85, normal: 1.0, crunch: 1.5 } as Record<string, number>,
  },

  market: {
    /** Daily multiplicative decay of hype (audience attention fades during long silences). */
    hypeDecayPerDay: 0.985,
    /** Extra decay per day once the announced deadline has been missed. */
    lateHypeDecayPerDay: 0.97,
    /** Hype gained per unit of marketing money spent. */
    hypePerMarketingMoney: 0.002,
    /** Hype level at which marketing returns are halved (LS.1 review). */
    hypeSaturation: 4,
    /** Weeks a released product keeps selling in the MVP. */
    salesWeeks: 10,
    weeklySalesDecay: 0.72,
    baseAudience: 2000,
    /** Bigger games reach more players and justify higher prices (D-030). */
    sizeAudience: { small: 1, medium: 1.9 } as Record<string, number>,
    sizePriceBonus: { small: 0, medium: 3 } as Record<string, number>,
  },
} as const;

export type Pace = 'relaxed' | 'normal' | 'crunch';
export type Speed = (typeof SIM_CONFIG.speeds)[number];

/** Real milliseconds of one tick at 1x. */
export function msPerTickAt1x(): number {
  return (SIM_CONFIG.realSecondsPerDayAt1x * 1000) / SIM_CONFIG.ticksPerDay;
}
