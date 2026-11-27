/**
 * Camera rig (0.21.0, QoL): smooth zoom, pan within the room, a gentle orbit
 * that keeps the back walls behind, centring on an Empirian and following one.
 * Pure state + easing (no Three.js here): the scene turns it into a camera.
 * Runs on REAL time, so it works while the world is paused.
 */
export interface CamPose {
  /** Pan offset from the room centre, in world units (x, z). */
  panX: number;
  panZ: number;
  zoom: number;
  /** Orbit around the default 45° view, radians (small: the walls must stay behind). */
  yaw: number;
}

export const CAM_LIMITS = { zoomMin: 0.85, zoomMax: 2.6, yawMax: 0.38 } as const;
export const DEFAULT_POSE: CamPose = { panX: 0, panZ: 0, zoom: 1, yaw: 0 };

export class CameraRig {
  /** Where the camera is now, and where it is going (eased each frame). */
  cur: CamPose = { ...DEFAULT_POSE };
  want: CamPose = { ...DEFAULT_POSE };
  /** Half-extents of the room (world units): the pan never leaves it. */
  private halfW = 3;
  private halfD = 3;
  /** Following an Empirian: their position is fed each frame by the scene. */
  followId: string | null = null;

  setRoom(halfW: number, halfD: number): void {
    this.halfW = halfW;
    this.halfD = halfD;
    this.clamp(this.want);
  }

  private clamp(p: CamPose): void {
    p.zoom = Math.max(CAM_LIMITS.zoomMin, Math.min(CAM_LIMITS.zoomMax, p.zoom));
    p.yaw = Math.max(-CAM_LIMITS.yawMax, Math.min(CAM_LIMITS.yawMax, p.yaw));
    // The more you zoom in, the further you may look around; zoomed out, the room stays centred.
    const k = Math.max(0, (p.zoom - 1) / (CAM_LIMITS.zoomMax - 1)) * 0.9 + 0.1;
    p.panX = Math.max(-this.halfW * k, Math.min(this.halfW * k, p.panX));
    p.panZ = Math.max(-this.halfD * k, Math.min(this.halfD * k, p.panZ));
  }

  zoomBy(f: number): void { this.want.zoom *= f; this.clamp(this.want); }
  setZoom(z: number): void { this.want.zoom = z; this.clamp(this.want); }
  /** Pan in world units (already converted from screen pixels by the scene). Stops following. */
  panBy(dx: number, dz: number): void { this.followId = null; this.want.panX += dx; this.want.panZ += dz; this.clamp(this.want); }
  rotateBy(d: number): void { this.want.yaw += d; this.clamp(this.want); }

  /** Centre on a point of the room (offset from its centre), zooming in a little. */
  lookAt(x: number, z: number, zoom = Math.max(this.want.zoom, 1.7)): void {
    this.want.zoom = zoom;
    this.want.panX = x;
    this.want.panZ = z;
    this.clamp(this.want);
  }

  follow(id: string | null): void { this.followId = id; }

  /** Back to the whole office. */
  overview(): void { this.followId = null; this.want = { ...DEFAULT_POSE }; }

  /** True when the view is not the default one (the UI then offers "overview"). */
  get moved(): boolean {
    const w = this.want;
    return !!this.followId || Math.abs(w.zoom - 1) > 0.02 || Math.abs(w.panX) > 0.05 || Math.abs(w.panZ) > 0.05 || Math.abs(w.yaw) > 0.01;
  }

  /** Eases towards the wanted pose. Returns true if the camera moved (the scene re-frames only then). */
  tick(realDt: number, followPos?: { x: number; z: number }): boolean {
    if (this.followId && followPos) { this.want.panX = followPos.x; this.want.panZ = followPos.z; this.clamp(this.want); }
    const k = 1 - Math.exp(-Math.min(0.1, Math.max(0, realDt)) * 9);
    let moved = false;
    for (const key of ['panX', 'panZ', 'zoom', 'yaw'] as const) {
      const d = this.want[key] - this.cur[key];
      if (Math.abs(d) < 1e-4) { if (this.cur[key] !== this.want[key]) { this.cur[key] = this.want[key]; moved = true; } continue; }
      this.cur[key] += d * k;
      moved = true;
    }
    return moved;
  }
}
