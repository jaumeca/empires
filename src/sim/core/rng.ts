/**
 * Deterministic seeded PRNG (sfc32). State is a plain tuple so it can be stored
 * inside GameState and serialized. Never use Math.random() in the simulation.
 */
export type RngState = [number, number, number, number];

/** Independent streams so that adding a roll in one system doesn't shift others. */
export const RNG_STREAMS = ['work', 'bugs', 'market', 'events', 'people'] as const;
export type RngStream = (typeof RNG_STREAMS)[number];
export type RngStreams = Record<RngStream, RngState>;

function hashString(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRngState(seed: number, salt = ''): RngState {
  const base = hashString(`${seed}:${salt}`);
  const s: RngState = [base, base ^ 0x9e3779b9, base ^ 0x243f6a88, base ^ 0xb7e15162];
  // Warm up to decorrelate similar seeds.
  for (let i = 0; i < 15; i++) nextUint32(s);
  return s;
}

export function createRngStreams(seed: number): RngStreams {
  const out = {} as RngStreams;
  for (const name of RNG_STREAMS) out[name] = createRngState(seed, name);
  return out;
}

/** Advances the state in place and returns a uint32. */
export function nextUint32(s: RngState): number {
  let [a, b, c, d] = s;
  a >>>= 0;
  b >>>= 0;
  c >>>= 0;
  d >>>= 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s[0] = a >>> 0;
  s[1] = b >>> 0;
  s[2] = c >>> 0;
  s[3] = d >>> 0;
  return t >>> 0;
}

/** Float in [0, 1). */
export function nextFloat(s: RngState): number {
  return nextUint32(s) / 4294967296;
}

export function nextRange(s: RngState, min: number, max: number): number {
  return min + nextFloat(s) * (max - min);
}

export function nextInt(s: RngState, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(nextFloat(s) * (maxInclusive - minInclusive + 1));
}

/**
 * Integer count with expected value `expected`: floor plus a Bernoulli on the
 * fractional part. Cheap and deterministic.
 */
export function sampleCount(s: RngState, expected: number): number {
  if (expected <= 0) return 0;
  const whole = Math.floor(expected);
  return whole + (nextFloat(s) < expected - whole ? 1 : 0);
}

export function pick<T>(s: RngState, items: readonly T[]): T {
  const item = items[Math.floor(nextFloat(s) * items.length)];
  if (item === undefined) throw new Error('pick from empty list');
  return item;
}
