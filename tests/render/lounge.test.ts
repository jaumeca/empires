import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { EmpirianView } from '../../src/render/empirianView';
import { itemModel } from '../../src/render/models/catalogModels';
import { VOXEL } from '../../src/render/voxel';
import { ITEMS } from '../../src/content/officeItems';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';

/**
 * Block 0.3 (0.17.0): the same real-geometry check as the desk chairs, for the
 * places where Empirians lounge (armchair, sofa, beanbag): at their resting
 * spot and pose, the skull and the torso don't go through the furniture.
 */
const SEATS = ITEMS.filter((d) => d.spot?.pose === 'lounge');

function lounging(spot: { x: number; z: number }) {
  const v = new EmpirianView({ ...DEFAULT_APPEARANCE, accessory: 0 }, 'E-1');
  v.pose = 'lounge';
  for (let i = 0; i < 80; i++) v.animate(i * 0.05, 0.05, 'resting', 100, false, 1);
  // Facing away from the backrest (+z), as the scene does (use-spot heading + π).
  v.root.position.set(spot.x * VOXEL, 0, spot.z * VOXEL);
  v.root.rotation.y = 0;
  v.root.updateMatrixWorld(true);
  const skull = new Box3(new Vector3(-5 * VOXEL, 0, -4.5 * VOXEL), new Vector3(5 * VOXEL, 10 * VOXEL, 4.5 * VOXEL)).applyMatrix4(v.head.matrixWorld);
  const torsoMesh = v.torso.children.find((c) => (c as { isMesh?: boolean }).isMesh)!;
  return { head: skull, torso: new Box3().setFromObject(torsoMesh) };
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
