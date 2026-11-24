import { describe, expect, it } from 'vitest';
import { applyGesture, envelope, gestureGap, GESTURES, hash01, idleGesture, reactionTo, type Gesture, type Persona, type PoseTarget } from '../../src/render/gestures';
import { EmpirianView } from '../../src/render/empirianView';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';

/** 0.18.0 "Empirians vivos": small gestures, personal rhythms, no chair collisions, pause-safe. */
const base = (): PoseTarget => ({ bodyY: 2.7, legL: -Math.PI / 2, legR: -Math.PI / 2, armLx: -1.15, armRx: -1.15, armLz: 0.06, armRz: -0.06, headX: 0.12, headY: 0, headZ: 0, torsoY: 0, headSquash: 1 });
const persona = (over: Partial<Persona> = {}): Persona => ({ id: 'E-1', energy: 80, morale: 70, activity: 'coding', place: 'desk', hour: 3, ...over });
const counts = (mk: (i: number) => Persona) => {
  const c: Partial<Record<Gesture | 'none', number>> = {};
  for (let i = 0; i < 4000; i++) { const g = idleGesture(mk(i), hash01('roll', i)) ?? 'none'; c[g] = (c[g] ?? 0) + 1; }
  return c;
};

describe('gestures', () => {
  it('blend in and out smoothly (nothing at the start or the end)', () => {
    expect(envelope(0)).toBe(0);
    expect(envelope(1)).toBe(0);
    expect(envelope(0.5)).toBe(1);
    expect(envelope(0.05)).toBeLessThan(envelope(0.15));
  });

  it('seated or lounging: never move hips, legs or torso (no new collisions with furniture)', () => {
    for (const g of GESTURES) for (let p = 0; p <= 1; p += 0.05) {
      const t = base();
      applyGesture(t, g, p, p * 3, true, 0.7);
      expect([t.bodyY, t.legL, t.legR, t.torsoY], g).toEqual([2.7, -Math.PI / 2, -Math.PI / 2, 0]);
    }
  });

  it('heads turn to look, but within a natural range', () => {
    const t = base();
    applyGesture(t, 'look', 0.5, 1, false, 3);
    expect(Math.abs(t.headY)).toBeLessThanOrEqual(1);
  });
});

describe('personality and rhythm', () => {
  it('a perfectionist at work concentrates more; a curious one has more eurekas', () => {
    const perf = counts((i) => persona({ id: `P${i}`, trait: 'perfectionist' }));
    const cur = counts((i) => persona({ id: `C${i}`, trait: 'curious' }));
    expect(perf.focus!).toBeGreaterThan(cur.focus!);
    expect(cur.eureka!).toBeGreaterThan((perf.eureka ?? 0) * 2);
  });

  it('tired people yawn and stretch; rested ones hardly yawn', () => {
    const tired = counts((i) => persona({ id: `T${i}`, energy: 30 }));
    const fresh = counts((i) => persona({ id: `F${i}`, energy: 90 }));
    expect(tired.yawn!).toBeGreaterThan(200);
    expect(fresh.yawn ?? 0).toBe(0);
    expect(tired.stretch!).toBeGreaterThan(fresh.stretch!);
  });

  it('a night owl yawns in the morning, not in the late hours', () => {
    expect(counts((i) => persona({ id: `N${i}`, trait: 'night_owl', hour: 0 })).yawn!).toBeGreaterThan(0);
    expect(counts((i) => persona({ id: `N${i}`, trait: 'night_owl', hour: 6 })).yawn ?? 0).toBe(0);
  });

  it('there are calm moments too (not a gesture every time)', () => {
    const c = counts((i) => persona({ id: `X${i}` }));
    expect(c.none!).toBeGreaterThan(600);
  });

  it('nobody moves in sync: personal rhythms differ', () => {
    const schedule = (id: string) => { let t = 0; return Array.from({ length: 6 }, (_, n) => (t += gestureGap(persona({ id }), n))); };
    const a = schedule('E-founder'), b = schedule('E-4'), c = schedule('E-7');
    for (let i = 0; i < 6; i++) { expect(Math.abs(a[i]! - b[i]!)).toBeGreaterThan(0.05); expect(Math.abs(b[i]! - c[i]!)).toBeGreaterThan(0.05); }
    for (const x of a) expect(x).toBeGreaterThan(0);
  });

  it('reactions to colleagues come with personal delays and styles', () => {
    const delays = ['a', 'b', 'c', 'd'].map((id) => reactionTo('good', 'sociable', hash01(id, 1))!.delay);
    expect(new Set(delays.map((d) => d.toFixed(3))).size).toBe(4);
    expect(reactionTo('bad', 'perfectionist', 0.3)!.gesture).toBe('facepalm');
    expect(reactionTo('call', undefined, 0.5)!.gesture).toBe('look');
  });
});

describe('pause', () => {
  it('a gesture does not move while the world is paused (dt = 0)', () => {
    const v = new EmpirianView({ ...DEFAULT_APPEARANCE }, 'E-1');
    v.pose = 'stand';
    for (let i = 0; i < 20; i++) v.animate(i * 0.05, 0.05, 'idle', 100, false, 1);
    v.playGesture('stretch', 1.0);
    for (let i = 0; i < 8; i++) v.animate(1 + i * 0.05, 0.05, 'idle', 100, false, 1);
    const arm = v.armR.rotation.x, head = v.head.rotation.x;
    for (let i = 0; i < 30; i++) v.animate(1.4, 0, 'idle', 100, false, 1);
    expect(v.armR.rotation.x).toBe(arm);
    expect(v.head.rotation.x).toBe(head);
  });
});
