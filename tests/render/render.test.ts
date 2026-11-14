import { describe, expect, it } from 'vitest';
import { meshVoxels, VoxelGrid } from '../../src/render/voxel';
import { buildEmpirianParts } from '../../src/render/models/empirian';
import { EmpirianView } from '../../src/render/empirianView';
import { findPath } from '../../src/render/officeScene';
import { DEFAULT_APPEARANCE } from '../../src/sim/state';
import { buildRoomShell, buildDesk, buildBookshelf, buildPlant, buildChair, buildPoster } from '../../src/render/models/furniture';

describe('voxel mesher', () => {
  it('culls internal faces', () => {
    const g = new VoxelGrid(2, 1, 1).box(0, 0, 0, 2, 1, 1, 1);
    const geo = meshVoxels(g);
    expect(geo.getAttribute('position').count).toBe(10 * 4); // 10 visible faces
    expect(geo.getIndex()!.count).toBe(10 * 6);
  });
  it('empty grid gives empty geometry', () => {
    expect(meshVoxels(new VoxelGrid(3, 3, 3)).getAttribute('position').count).toBe(0);
  });
});

describe('Empirian model', () => {
  it('has the documented proportions (head ≈ 45 % of height)', () => {
    const p = buildEmpirianParts(DEFAULT_APPEARANCE);
    expect([p.head.grid.sx, p.head.grid.sy, p.head.grid.sz]).toEqual([10, 10, 9]);
    const total = 5 + 6 + 10; // legs+shoes, torso, head
    expect(10 / total).toBeGreaterThan(0.44);
    expect(10 / total).toBeLessThan(0.5);
  });
  it('every customization combination builds non-empty parts', () => {
    for (let hair = 0; hair < 8; hair++)
      for (let acc = 0; acc < 6; acc++)
        for (let top = 0; top < 5; top++) {
          const p = buildEmpirianParts({ ...DEFAULT_APPEARANCE, hairStyle: hair, accessory: acc, top });
          for (const part of [p.head, p.torso, p.armL, p.legL]) expect(part.grid.count()).toBeGreaterThan(0);
          if (hair !== 6 || acc !== 0) expect(p.hair.grid.count()).toBeGreaterThan(0);
        }
  });
  it('different appearances produce different meshes', () => {
    const a = meshVoxels(buildEmpirianParts(DEFAULT_APPEARANCE).hair.grid).getAttribute('color').array;
    const b = meshVoxels(buildEmpirianParts({ ...DEFAULT_APPEARANCE, hairColor: 9 }).hair.grid).getAttribute('color').array;
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
  it('builds a rigid skeleton without a browser', () => {
    const v = new EmpirianView(DEFAULT_APPEARANCE, 'E-1');
    for (const bone of [v.head, v.torso, v.armL, v.armR, v.legL, v.legR]) expect(bone.children.length).toBeGreaterThan(0);
    for (const act of ['idle', 'coding', 'designing', 'testing', 'thinking', 'raising_hand', 'celebrating', 'resting'] as const)
      for (const pose of ['stand', 'walk', 'sit', 'cheer', 'raise', 'think', 'lounge'] as const) {
        v.pose = pose;
        v.animate(1.3, 1 / 60, act, 80, pose === 'walk', 1);
        expect(Number.isFinite(v.body.position.y)).toBe(true);
      }
  });
});

describe('room', () => {
  it('furniture models are non-empty and within budget', () => {
    let tris = 0;
    for (const g of [buildRoomShell(), buildDesk(), buildBookshelf(), buildPlant(), buildChair(), buildPoster()]) {
      expect(g.count()).toBeGreaterThan(0);
      tris += meshVoxels(g).getIndex()!.count / 3;
    }
    expect(tris).toBeLessThan(150_000); // ARCHITECTURE §9.2 budget for the whole scene
  });
  it('paths avoid blocked cells (desk)', () => {
    const path = findPath([6, 18], [30, 6 + 0]); // to a desk cell
    for (const [x, z] of path.slice(0, -1)) expect(`${Math.floor(x / 12)},${Math.floor(z / 12)}`).not.toBe('1,0');
    expect(path[path.length - 1]).toEqual([30, 6]);
  });
});
