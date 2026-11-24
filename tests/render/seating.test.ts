import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { EmpirianView } from '../../src/render/empirianView';
import { buildEmpirianParts } from '../../src/render/models/empirian';
import { chairModel, itemModel } from '../../src/render/models/catalogModels';
import { VOXEL } from '../../src/render/voxel';
import { ITEMS } from '../../src/content/officeItems';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';

/**
 * Block 0.1 (0.17.0): the owner saw the head go through the chair. Real
 * geometry check: the seated Empirian (real model, real pose, every hair
 * style) at each desk's seat must not overlap any voxel of any chair.
 */
const CHAIRS = ITEMS.filter((d) => d.category === 'chair').map((d) => d.id);
const DESKS = ITEMS.filter((d) => d.category === 'desk');

function seated(hairStyle: number, deskSpot: { x: number; z: number }) {
  const v = new EmpirianView({ ...DEFAULT_APPEARANCE, hairStyle, accessory: 0 }, 'E-1');
  v.pose = 'sit';
  for (let i = 0; i < 60; i++) v.animate(i * 0.05, 0.05, 'coding', 100, false, 1);
  // Facing the desk (towards −z), at the seat spot, like the office scene does.
  v.root.position.set(deskSpot.x * VOXEL, 0, deskSpot.z * VOXEL);
  v.root.rotation.y = Math.PI;
  v.root.updateMatrixWorld(true);
  // The skull (head mesh) and the torso mesh, without hair and arms (hair may drape over a backrest).
  // Head and hair are one merged mesh: the skull is the real 10×10×9 head block at the head pivot.
  const skull = new Box3(new Vector3(-5 * VOXEL, 0, -4.5 * VOXEL), new Vector3(5 * VOXEL, 10 * VOXEL, 4.5 * VOXEL)).applyMatrix4(v.head.matrixWorld);
  const torsoMesh = v.torso.children.find((c) => (c as { isMesh?: boolean }).isMesh)!;
  // Every real hair voxel, placed with the head's matrix (an AABB would include the empty space in front of the face).
  const hairPart = buildEmpirianParts({ ...DEFAULT_APPEARANCE, hairStyle, accessory: 0 }).hair;
  const hairVoxels: Box3[] = [];
  const g = hairPart.grid;
  for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) {
    if (!g.get(x, y, z)) continue;
    const min = new Vector3((x - hairPart.origin[0]) * VOXEL, (y - hairPart.origin[1]) * VOXEL, (z - hairPart.origin[2]) * VOXEL);
    hairVoxels.push(new Box3(min, min.clone().addScalar(VOXEL)).applyMatrix4(v.head.matrixWorld));
  }
  return { head: skull, torso: new Box3().setFromObject(torsoMesh), hairVoxels };
}

/** Occupied chair voxels as boxes, in the desk's local space (as the scene places them). */
function chairBoxes(chairId: string, chairX: number): Box3[] {
  const boxes: Box3[] = [];
  for (const part of chairModel(chairId)) {
    const g = part.grid;
    for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) {
      if (!g.get(x, y, z)) continue;
      const min = new Vector3((x + part.at[0] + chairX) * VOXEL, (y + part.at[1]) * VOXEL, (z + part.at[2]) * VOXEL);
      boxes.push(new Box3(min, min.clone().addScalar(VOXEL)));
    }
  }
  return boxes;
}
// A tiny tolerance: touching is fine, overlapping by more than a fifth of a voxel is not.
const overlaps = (a: Box3, b: Box3) => {
  const i = a.clone().intersect(b);
  if (i.isEmpty()) return false;
  const s = i.getSize(new Vector3());
  return s.x > VOXEL * 0.2 && s.y > VOXEL * 0.2 && s.z > VOXEL * 0.2;
};

describe('seated Empirians fit their chairs (block 0.1)', () => {
  for (const desk of DESKS) {
    for (const chair of CHAIRS) {
      it(`${desk.id} + ${chair}: no head or torso inside the chair, for every hair style`, () => {
        const anchor = itemModel(desk.model).anchor!;
        const boxes = chairBoxes(chair, anchor.chairX);
        for (let hair = 0; hair < 8; hair++) {
          const body = seated(hair, desk.spot!);
          const hitHead = boxes.filter((b) => overlaps(body.head, b)).length;
          const hitTorso = boxes.filter((b) => overlaps(body.torso, b)).length;
          expect(hitHead, `head (hair ${hair})`).toBe(0);
          expect(hitTorso, `torso (hair ${hair})`).toBe(0);
          // Real hair voxels at head height: none inside the chair. Long hair hanging below the
          // head (style 3) may drape over the backrest, as hair does.
          const hitHair = body.hairVoxels.filter((hv) => hv.min.y >= body.head.min.y && boxes.some((b) => overlaps(hv, b))).length;
          expect(hitHair, `hair ${hair}`).toBe(0);
        }
      });
    }
  }
});
