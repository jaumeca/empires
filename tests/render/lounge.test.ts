import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { EmpirianView } from '../../src/render/empirianView';
import { itemModel } from '../../src/render/models/catalogModels';
import { VOXEL } from '../../src/render/voxel';
import { ITEMS } from '../../src/content/officeItems';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';
import { GESTURES, GESTURE_DUR, type Gesture } from '../../src/render/gestures';
import type { Matrix4 } from 'three';

/**
 * Block 0.3 (0.17.0): the same real-geometry check as the desk chairs, for the
 * places where Empirians lounge (armchair, sofa, beanbag): at their resting
 * spot and pose, the skull and the torso don't go through the furniture.
 */
const SEATS = ITEMS.filter((d) => d.spot?.pose === 'lounge');

function lounging(spot: { x: number; z: number }, gesture?: Gesture) {
  const v = new EmpirianView({ ...DEFAULT_APPEARANCE, accessory: 0 }, 'E-1');
  v.pose = 'lounge';
  if (gesture) v.playGesture(gesture, 79 * 0.05 - GESTURE_DUR[gesture] / 2, 0.8);
  for (let i = 0; i < 80; i++) v.animate(i * 0.05, 0.05, 'resting', 100, false, 1);
  // Facing away from the backrest (+z), as the scene does (use-spot heading + π).
  v.root.position.set(spot.x * VOXEL, 0, spot.z * VOXEL);
  v.root.rotation.y = 0;
  v.root.updateMatrixWorld(true);
  const skull = new Box3(new Vector3(-5 * VOXEL, 0, -4.5 * VOXEL), new Vector3(5 * VOXEL, 10 * VOXEL, 4.5 * VOXEL)).applyMatrix4(v.head.matrixWorld);
  const torsoMesh = v.torso.children.find((c) => (c as { isMesh?: boolean }).isMesh)!;
  return { head: skull, headMatrix: v.head.matrixWorld.clone(), torso: new Box3().setFromObject(torsoMesh) };
}

function itemBoxes(model: string): Box3[] {
  const boxes: Box3[] = [];
  for (const part of itemModel(model).parts) {
    const g = part.grid;
    for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) {
      if (!g.get(x, y, z)) continue;
      const min = new Vector3((x + part.at[0]) * VOXEL, (y + part.at[1]) * VOXEL, (z + part.at[2]) * VOXEL);
      boxes.push(new Box3(min, min.clone().addScalar(VOXEL)));
    }
  }
  return boxes;
}
const depth = (a: Box3, b: Box3) => {
  const i = a.clone().intersect(b);
  if (i.isEmpty()) return 0;
  const s = i.getSize(new Vector3());
  return Math.min(s.x, s.y, s.z) / VOXEL;
};

describe('lounging Empirians fit their seats (block 0.3)', () => {
  for (const def of SEATS) {
    it(`${def.id}: head and torso stay out of the furniture`, () => {
      const boxes = itemBoxes(def.model);
      const body = lounging(def.spot!);
      // Sinking into a soft cushion a little is fine (≤ 1 voxel); going through the backrest is not.
      const head = Math.max(0, ...boxes.map((b) => depth(body.head, b)));
      const torso = Math.max(0, ...boxes.map((b) => depth(body.torso, b)));
      expect(head, 'head').toBeLessThanOrEqual(0.2);
      expect(torso, 'torso').toBeLessThanOrEqual(1 + 1e-6);
      // …and not floating: the seat surface under the hips is within a voxel of the body.
      const c = body.torso.getCenter(new Vector3());
      const under = boxes.filter((b) => b.min.x <= c.x && b.max.x >= c.x && b.min.z <= c.z && b.max.z >= c.z && b.max.y <= body.torso.min.y + VOXEL);
      const surface = Math.max(...under.map((b) => b.max.y));
      expect((body.torso.min.y - surface) / VOXEL, 'gap under the body').toBeLessThanOrEqual(1);
    });
  }
});

/** Oriented: chair voxel centres in the head's own space stay outside the skull (sinking ≤ 1 voxel into a cushion is fine). */
function headDepth(m: Matrix4, boxes: Box3[]): number {
  const inv = m.clone().invert();
  const scale = new Vector3().setFromMatrixScale(m).x;
  let worst = 0;
  for (const b of boxes) {
    const c = b.getCenter(new Vector3()).applyMatrix4(inv);
    const dx = 5 * VOXEL - Math.abs(c.x), dz = 4.5 * VOXEL - Math.abs(c.z), dy = Math.min(c.y, 10 * VOXEL - c.y);
    const d = Math.min(dx, dy, dz) * scale / VOXEL + 0.5; // + half a furniture voxel
    if (d > worst) worst = d;
  }
  return worst;
}

describe('gestures while lounging stay out of the furniture (0.18.0)', () => {
  for (const def of SEATS) {
    it(`${def.id}: every gesture`, () => {
      const boxes = itemBoxes(def.model);
      for (const g of GESTURES) expect(headDepth(lounging(def.spot!, g).headMatrix, boxes), `${def.id} ${g}`).toBeLessThanOrEqual(0.2);
    });
  }
});
