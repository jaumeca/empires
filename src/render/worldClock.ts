/**
 * Animation time of the simulated world (Empirians, bubbles, confetti, screens…).
 *
 * The render loop has two clocks:
 *  - real time: UI, camera, input — always runs;
 *  - world time (this): advances only while the simulation runs. When the game
 *    is paused (speed 0) world time stops, so every animation tied to the world
 *    freezes in its exact pose and resumes from that same instant, without jumps.
 *
 * Pure: no DOM, no Three.js; unit-tested.
 */
export class WorldClock {
  /** Seconds of world time elapsed (frozen while paused). */
  time = 0;
  /** World delta of the last advance (0 while paused). */
  dt = 0;

  /**
   * @param realDt real seconds since the previous frame (already capped by the caller)
   * @param speed simulation speed (0 = paused)
   */
  advance(realDt: number, speed: number): number {
    this.dt = speed > 0 ? Math.max(0, realDt) : 0;
    this.time += this.dt;
    return this.dt;
  }

  get paused(): boolean {
    return this.dt === 0;
  }
}
