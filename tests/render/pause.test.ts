import { describe, expect, it } from 'vitest';
import { EmpirianView } from '../../src/render/empirianView';
import { EmpirianActor } from '../../src/render/officeScene';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';

/**
 * ML.1 regression (found in 0.13.0, pause e2e at 4x, ~1 in 6 runs): when a
 * walking Empirian reached a waypoint in the last frame before the pause, its
 * heading towards the next leg was only computed in the first paused frame
 * (dt = 0), so the world changed while frozen.
 */
function walker() {
  const a = new EmpirianActor(new EmpirianView(DEFAULT_APPEARANCE, 'E-1'), { x: 0, z: 0, heading: 0, pose: 'stand' });
  a.target = { x: 10, z: 10, heading: 1, pose: 'sit' };
  a.targetName = 'seat';
  a.path = [[5, 0], [5, 10], [10, 10]];
  return a;
}
const snap = (a: EmpirianActor) => JSON.stringify([a.pos, a.view.heading, a.view.root.rotation.y, a.path, a.view.pose]);

describe('pause freezes walking Empirians (ML.1 regression)', () => {
  it('reaching a waypoint in the last frame before the pause changes nothing while paused', () => {
    const a = walker();
    // Walk part of the first leg (towards +x)…
    a.step(0.1, 1);
    expect(a.view.heading).toBeCloseTo(Math.PI / 2, 5);
    // …then land on the waypoint in the last frame before the pause.
    a.step(3.4 / 17, 1);
    expect(a.pos).toEqual([5, 0]);
    // It already faces the next leg (towards +z) in that same frame.
    expect(a.view.heading).toBeCloseTo(0, 5);
    const frozen = snap(a);
    for (let i = 0; i < 30; i++) { a.step(0, 4); a.view.animate(1, 0, 'idle', 100, true, 4); }
    expect(snap(a)).toBe(frozen);
  });

  it('a paused actor keeps walking state but never moves or turns, at every speed', () => {
    for (const speed of [1, 2, 4, 8]) {
      const a = walker();
      a.step(0.13, speed);
      const frozen = snap(a);
      expect(a.step(0, speed)).toBe(true); // still "walking" (path left), just frozen
      expect(snap(a)).toBe(frozen);
    }
  });

  it('resuming continues the same route from the same place', () => {
    const a = walker();
    a.step(5 / 17, 1);
    a.step(0, 1);
    a.step(0.1, 1);
    expect(a.pos[0]).toBe(5);
    expect(a.pos[1]).toBeCloseTo(1.7, 5);
  });
});
