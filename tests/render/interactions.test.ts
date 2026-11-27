import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { EmpirianView, type Pose } from '../../src/render/empirianView';
import { itemModel } from '../../src/render/models/catalogModels';
import { VOXEL } from '../../src/render/voxel';
import { ITEMS, OFFICE_GRID } from '../../src/content/officeItems';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';

/**
 * 0.22.0: Empirians really use things (play, read, browse, board, watch).
 * Real geometry: at each item's interaction point, in the pose of its use and
 * facing the item, neither the head nor the torso goes through the furniture,
 * and the point is in front of the item (outside its footprint, reachable).
 */
const POSE: Record<string, Pose> = { play: 'play', read: 'read', browse: 'think', board: 'think', watch: 'watch' };
const USERS = ITEMS.filter((d) => d.use && d.use !== 'meet' && d.spot);

function body(pose: Pose, spot: { x: number; z: number }) {
  const v = new EmpirianView({ ...DEFAULT_APPEARANCE, accessory: 0 }, 'E-1');
  v.pose = pose;
  for (let i = 0; i < 80; i++) v.animate(i * 0.05, 0.05, 'idle', 100, false, 1);
  v.root.position.set(spot.x * VOXEL, 0, spot.z * VOXEL);
  v.root.rotation.y = Math.PI; // facing the item (−z), as the scene does at rot 0
  v.root.updateMatrixWorld(true);
  const torsoMesh = v.torso.children.find((c) => (c as { isMesh?: boolean }).isMesh)!;
  return { headMatrix: v.head.matrixWorld.clone(), torso: new Box3().setFromObject(torsoMesh) };
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
/** Oriented: furniture voxel centres in the head's own space stay outside the 10×10×9 skull. */
function headHits(m: import('three').Matrix4, boxes: Box3[]): number {
  const inv = m.clone().invert();
  const scale = new Vector3().setFromMatrixScale(m).x;
  const half = 0.3 * VOXEL / scale;
  return boxes.filter((b) => { const c = b.getCenter(new Vector3()).applyMatrix4(inv); return Math.abs(c.x) < 5 * VOXEL + half && c.y > -half && c.y < 10 * VOXEL + half && Math.abs(c.z) < 4.5 * VOXEL + half; }).length;
}
const overlap = (a: Box3, b: Box3) => { const i = a.clone().intersect(b); if (i.isEmpty()) return false; const s = i.getSize(new Vector3()); return s.x > VOXEL * 0.2 && s.y > VOXEL * 0.2 && s.z > VOXEL * 0.2; };

describe('interaction points (0.22.0)', () => {
  it('every usable item has an interaction point', () => {
    expect(USERS.map((d) => d.id).sort()).toEqual(['arcade', 'bookshelf', 'game_cabinet', 'retro_console', 'tv_corner', 'whiteboard'].sort());
  });
  for (const def of USERS) {
    it(`${def.id} (${def.use}): in front of the item, head and torso out of the furniture`, () => {
      const cell = OFFICE_GRID.cellVoxels;
      expect(def.spot!.z, 'in front of the footprint').toBeGreaterThanOrEqual(def.size.d * cell);
      const b = body(POSE[def.use!]!, def.spot!);
      const boxes = itemBoxes(def.model);
      expect(headHits(b.headMatrix, boxes), 'head').toBe(0);
      expect(boxes.filter((x) => overlap(b.torso, x)).length, 'torso').toBe(0);
    });
  }
});
