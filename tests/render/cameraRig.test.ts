import { describe, expect, it } from 'vitest';
import { CAM_LIMITS, CameraRig } from '../../src/render/cameraRig';

/** 0.21.0: the camera eases smoothly, stays within the room and can follow someone. */
const settle = (r: CameraRig, s = 3) => { for (let i = 0; i < s * 60; i++) r.tick(1 / 60); };

describe('camera rig', () => {
  it('zooms smoothly (several frames), within limits', () => {
    const r = new CameraRig();
    r.zoomBy(1.5);
    r.tick(1 / 60);
    expect(r.cur.zoom).toBeGreaterThan(1);
    expect(r.cur.zoom).toBeLessThan(1.5);
    settle(r);
    expect(r.cur.zoom).toBeCloseTo(1.5, 3);
    r.setZoom(99);
    settle(r);
    expect(r.cur.zoom).toBe(CAM_LIMITS.zoomMax);
  });

  it('never pans out of the room; zoomed out it stays almost centred', () => {
    const r = new CameraRig();
    r.setRoom(3, 2);
    r.panBy(100, -100);
    expect(Math.abs(r.want.panX)).toBeLessThanOrEqual(3 * 0.1 + 1e-9);
    r.setZoom(CAM_LIMITS.zoomMax);
    r.panBy(100, -100);
    expect(r.want.panX).toBeLessThanOrEqual(3);
    expect(r.want.panZ).toBeGreaterThanOrEqual(-2);
  });

  it('the orbit is gentle (the back walls stay behind)', () => {
    const r = new CameraRig();
    r.rotateBy(5);
    expect(r.want.yaw).toBe(CAM_LIMITS.yawMax);
  });

  it('follows an Empirian until the player pans; overview goes back to the default view', () => {
    const r = new CameraRig();
    r.setRoom(4, 4);
    r.setZoom(2);
    r.follow('E-1');
    for (let i = 0; i < 120; i++) r.tick(1 / 60, { x: 1, z: -0.5 });
    expect(r.cur.panX).toBeCloseTo(1, 2);
    expect(r.moved).toBe(true);
    r.panBy(0.1, 0);
    expect(r.followId).toBeNull();
    r.overview();
    settle(r);
    expect(r.moved).toBe(false);
    expect(r.cur.zoom).toBeCloseTo(1, 3);
  });

  it('reports "no movement" once settled (the scene re-frames only when needed)', () => {
    const r = new CameraRig();
    settle(r);
    expect(r.tick(1 / 60)).toBe(false);
  });
});
