import type { Expression } from './face';
import type { Activity, TraitId } from '../sim/model/state';

/**
 * Little gestures (0.18.0, "Empirians vivos"): stretching, yawning, a eureka,
 * concentration, a facepalm at a bug, a small fist pump, waving, nodding,
 * slumping after bad news, scratching the head. Purely visual: they read the
 * simulation state and never change it.
 *
 * - Each one is an envelope over the current pose (in, hold, out), so it blends
 *   with sitting, standing or lounging without jumps.
 * - Seated or lounging gestures never move the hips (no new chair collisions):
 *   only arms and head.
 * - Who does what, and how often, depends on the person (trait, energy, mood)
 *   and on a personal rhythm (hash of their id): nobody moves in sync.
 * - Everything runs on world time: the pause freezes it, faster speeds speed it up a little.
 */
export type Gesture = 'stretch' | 'yawn' | 'eureka' | 'focus' | 'scratch' | 'facepalm' | 'fistpump' | 'wave' | 'nod' | 'slump' | 'look';
export const GESTURES: readonly Gesture[] = ['stretch', 'yawn', 'eureka', 'focus', 'scratch', 'facepalm', 'fistpump', 'wave', 'nod', 'slump', 'look'];

/** Seconds of world time each gesture lasts. */
export const GESTURE_DUR: Record<Gesture, number> = {
  stretch: 2.2, yawn: 1.8, eureka: 1.6, focus: 3.2, scratch: 1.8, facepalm: 1.6, fistpump: 1.2, wave: 1.6, nod: 1.2, slump: 2.6, look: 2.4,
};

export interface PoseTarget {
  bodyY: number; legL: number; legR: number; armLx: number; armRx: number; armLz: number; armRz: number;
  headX: number; headY: number; headZ: number; torsoY: number; headSquash: number;
}

/** Smooth in/hold/out envelope over progress p ∈ [0, 1]. */
export function envelope(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  const edge = 0.22;
  if (p < edge) return smooth(p / edge);
  if (p > 1 - edge) return smooth((1 - p) / edge);
  return 1;
}
const smooth = (x: number) => x * x * (3 - 2 * x);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Bends the pose target towards the gesture. `seated` = sitting or lounging
 * (hips stay where they are). `yaw` = where to look (radians, relative), for wave/look/nod.
 */
export function applyGesture(target: PoseTarget, g: Gesture, p: number, t: number, seated: boolean, yaw = 0, voxel = 1): void {
  const k = envelope(p);
  if (k <= 0) return;
  switch (g) {
    case 'stretch':
      target.armLx = mix(target.armLx, -Math.PI + 0.15, k); target.armRx = mix(target.armRx, -Math.PI + 0.15, k);
      // Raised arms open outwards (with the arm up, +z on the right arm points away from the head).
      target.armLz = mix(target.armLz, -0.75, k); target.armRz = mix(target.armRz, 0.75, k);
      // Seated, the head barely tilts back: a high backrest is right behind it (measured: −0.3 rad hits it).
      target.headX = mix(target.headX, seated ? -0.1 : -0.3, k);
      if (!seated) target.torsoY = mix(target.torsoY, 0.6 * voxel, k);
      break;
    case 'yawn':
      // Head back, a hand to the mouth.
      target.headX = mix(target.headX, seated ? -0.1 : -0.35, k);
      target.armRx = mix(target.armRx, -2.5, k); target.armRz = mix(target.armRz, 0.45, k);
      break;
    case 'eureka': {
      // A sudden idea: one arm up, a little hop when standing.
      const pop = Math.sin(Math.min(1, p * 2.5) * Math.PI);
      target.armRx = mix(target.armRx, -Math.PI + 0.1, k); target.armRz = mix(target.armRz, 0.7, k);
      target.headX = mix(target.headX, -0.2, k);
      if (!seated) target.bodyY = mix(target.bodyY, pop * 1.6 * voxel, k);
      break;
    }
    case 'focus':
      // Leaning in, chin on a hand.
      target.headX = mix(target.headX, 0.3, k);
      target.armLx = mix(target.armLx, -1.9, k); target.armLz = mix(target.armLz, -0.35, k);
      break;
    case 'scratch':
      target.armRx = mix(target.armRx, -2.7, k); target.armRz = mix(target.armRz, 0.55 + Math.sin(t * 14) * 0.08, k);
      target.headZ = mix(target.headZ, -0.15, k);
      break;
    case 'facepalm':
      target.armRx = mix(target.armRx, -2.3, k); target.armRz = mix(target.armRz, 0.7, k);
      target.headX = mix(target.headX, 0.35, k);
      break;
    case 'fistpump': {
      const beat = Math.abs(Math.sin(p * Math.PI * 2));
      target.armRx = mix(target.armRx, -2.4 - beat * 0.5, k); target.armRz = mix(target.armRz, 0.65, k);
      target.headX = mix(target.headX, -0.15, k);
      if (!seated) target.bodyY = mix(target.bodyY, beat * 0.8 * voxel, k);
      break;
    }
    case 'wave':
      target.armRx = mix(target.armRx, -2.7, k); target.armRz = mix(target.armRz, 0.8 + Math.sin(t * 12) * 0.3, k);
      target.headY = mix(target.headY, clampYaw(yaw), k);
      break;
    case 'nod':
      target.headX = mix(target.headX, Math.abs(Math.sin(p * Math.PI * 3)) * 0.25, k);
      target.headY = mix(target.headY, clampYaw(yaw), k);
      break;
    case 'slump':
      target.headX = mix(target.headX, 0.4, k);
      target.armLz = mix(target.armLz, 0, k); target.armRz = mix(target.armRz, 0, k);
      if (!seated) target.torsoY = mix(target.torsoY, -0.4 * voxel, k);
      break;
    case 'look':
      target.headY = mix(target.headY, clampYaw(yaw), k);
      break;
  }
}

/** Heads turn, but not like an owl. */
export const clampYaw = (y: number) => Math.max(-1, Math.min(1, y));

/** The face a gesture shows (null = keep the usual one). */
export function gestureExpression(g: Gesture, p: number): Expression | null {
  switch (g) {
    case 'yawn': return p > 0.2 && p < 0.8 ? 'surprised' : 'tired';
    case 'eureka': return 'joyful';
    case 'focus': return 'focused';
    case 'scratch': return 'thinking';
    case 'facepalm': return 'frustrated';
    case 'fistpump': return 'joyful';
    case 'wave': return 'happy';
    case 'nod': return 'happy';
    case 'slump': return 'tired';
    case 'stretch': return p > 0.3 && p < 0.7 ? 'blink' : null;
    default: return null;
  }
}

/** Stable pseudo-random number in [0, 1) for (id, n): personal rhythms, no Math.random. */
export function hash01(id: string, n: number): number {
  let h = 2166136261 ^ n;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export interface Persona {
  id: string;
  trait?: TraitId;
  energy: number;
  morale: number;
  activity: Activity;
  /** Sitting at a desk / lounging / standing still (moving = no gesture). */
  place: 'desk' | 'lounge' | 'stand';
  /** Hour of the working day (0–7), for the night owl. */
  hour: number;
}

/**
 * Seconds until this person's next spontaneous gesture: a personal rhythm,
 * a little more often when tired or restless, sociable people a bit livelier.
 */
export function gestureGap(p: Persona, n: number): number {
  const base = 9 + hash01(p.id, 7) * 6; // 9–15 s personal tempo
  const jitter = 0.6 + hash01(p.id, n) * 0.9; // never the same interval twice
  const tired = p.energy < 40 ? 0.75 : 1;
  const lively = p.trait === 'sociable' || p.trait === 'curious' ? 0.85 : 1;
  return base * jitter * tired * lively;
}

/** Which spontaneous gesture fits this person now (null = none this time). Weighted by who they are. */
export function idleGesture(p: Persona, roll: number): Gesture | null {
  const w: Partial<Record<Gesture, number>> = {};
  const add = (g: Gesture, v: number) => { w[g] = (w[g] ?? 0) + v; };
  const sleepy = p.energy < 45 || (p.trait === 'night_owl' && p.hour < 2);
  if (p.place === 'desk') {
    const work = p.activity === 'coding' || p.activity === 'designing' || p.activity === 'testing' || p.activity === 'thinking';
    if (work) {
      add('focus', p.trait === 'perfectionist' ? 4 : 2);
      add('scratch', p.activity === 'thinking' || p.activity === 'testing' ? 2 : 1);
      add('eureka', p.trait === 'curious' ? 1.6 : p.activity === 'designing' || p.activity === 'thinking' ? 0.9 : 0.4);
      add('stretch', sleepy ? 2.5 : p.trait === 'perfectionist' ? 0.4 : 0.9);
      if (p.trait === 'night_owl' && p.hour >= 5) add('fistpump', 0.8); // late hours suit them
    } else add('stretch', 1);
    if (sleepy) add('yawn', 2);
  } else if (p.place === 'lounge') {
    add('stretch', 1.5);
    if (sleepy) add('yawn', 2.5);
    add('look', 1);
  } else {
    add('look', 2);
    add('stretch', sleepy ? 1.5 : 0.5);
    if (sleepy) add('yawn', 1.2);
    if (p.trait === 'curious') add('scratch', 1);
    if (p.trait === 'sociable') add('wave', 0.8);
    if (p.morale > 75) add('fistpump', 0.4);
  }
  // Some calm moments: no gesture at all (more for focused perfectionists, fewer for sociable ones).
  const rest = p.trait === 'sociable' ? 1.5 : p.trait === 'perfectionist' ? 3 : 2.2;
  const entries = Object.entries(w) as [Gesture, number][];
  const total = entries.reduce((s, [, v]) => s + v, 0) + rest;
  let x = roll * total;
  for (const [g, v] of entries) { x -= v; if (x < 0) return g; }
  return null;
}

/** How someone reacts to a colleague's moment (and after how long): personalities differ. */
export function reactionTo(kind: 'good' | 'bad' | 'call', trait: TraitId | undefined, roll: number): { gesture: Gesture; delay: number } | null {
  const delay = 0.15 + roll * 0.9; // nobody reacts at exactly the same moment
  if (kind === 'call') return { gesture: 'look', delay };
  if (kind === 'good') {
    if (trait === 'sociable') return { gesture: roll < 0.6 ? 'fistpump' : 'wave', delay };
    if (trait === 'perfectionist') return roll < 0.5 ? { gesture: 'nod', delay } : null;
    return { gesture: roll < 0.5 ? 'nod' : 'fistpump', delay };
  }
  if (trait === 'perfectionist') return { gesture: 'facepalm', delay };
  return { gesture: roll < 0.5 ? 'slump' : 'scratch', delay };
}
