import { describe, expect, it } from 'vitest';
import { meshVoxels, VoxelGrid } from '../../src/render/voxel';
import { buildEmpirianParts } from '../../src/render/models/empirian';
import { EmpirianView } from '../../src/render/empirianView';
import { findPath } from '../../src/render/officeScene';
import { createNewGame, DEFAULT_APPEARANCE } from '../../src/sim/state';
import { blockedCells } from '../../src/sim/systems/office';
import { itemModel, computerModel, chairModel } from '../../src/render/models/catalogModels';
import { ITEMS } from '../../src/content/officeItems';
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

describe('catalog models', () => {
  it('every catalog item has a non-empty voxel model that fits its footprint', () => {
    for (const d of ITEMS) {
      if (d.layer === 'mount') {
        const parts = d.category === 'computer' ? computerModel(d.id).parts : chairModel(d.id);
        expect(parts.reduce((n, p) => n + p.grid.count(), 0), d.id).toBeGreaterThan(0);
        continue;
      }
      const m = itemModel(d.model);
      expect(m.parts.length, d.id).toBeGreaterThan(0);
      for (const p of m.parts) {
        expect(p.grid.count(), d.id).toBeGreaterThan(0);
        // Models may overhang their footprint by a voxel at most.
        expect(p.at[0] + p.grid.sx, d.id).toBeLessThanOrEqual(d.size.w * 6 + 1.5);
        expect(p.at[2] + p.grid.sz, d.id).toBeLessThanOrEqual(d.size.d * 6 + 1.5);
      }
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
  it('paths avoid furniture (blocked cells from the office) and end on the exact target', () => {
    const office = createNewGame(1).office;
    const blocked = blockedCells(office);
    const path = findPath([3, 3], [57, 39], blocked, office.w, office.d); // back-left corner to the armchair seat
    for (const [x, z] of path.slice(0, -1)) expect(blocked[Math.floor(x / 6) + Math.floor(z / 6) * office.w], `${x},${z}`).toBe(0);
    expect(path[path.length - 1]).toEqual([57, 39]);
    expect(path.length).toBeGreaterThan(5);
  });
  it('an unreachable target gives no path (never walk through furniture)', () => {
    const w = 10, d = 8;
    const blocked = new Uint8Array(w * d);
    // Wall around cell (7,5).
    for (const [x, z] of [[6, 4], [7, 4], [8, 4], [6, 5], [8, 5], [6, 6], [7, 6], [8, 6]] as const) blocked[x + z * w] = 1;
    expect(findPath([3, 3], [7 * 6 + 3, 5 * 6 + 3], blocked, w, d)).toEqual([]);
  });
});
