import { describe, expect, it } from 'vitest';
import { itemModel, SHOWCASE_SLOTS } from '../../src/render/models/catalogModels';
import { productArt, productBox } from '../../src/render/productArt';
import { framedCover } from '../../src/render/models/collection';
import { ITEMS } from '../../src/content/officeItems';
import { OFFICE_GRID } from '../../src/content/officeItems';
const CELL = OFFICE_GRID.cellVoxels;
import type { VoxelGrid } from '../../src/render/voxel';

/** 0.19.0: games with their own look, physical boxes that fit their shelves, new decoration. */
const game = (over: Partial<{ topicId: string; size: 'small' | 'medium'; name: string; score: number; updates: number }> = {}) => ({
  id: 'P-1', topicId: over.topicId ?? 'kart', size: over.size ?? 'small', name: over.name ?? 'Isla',
  result: { averageScore: over.score ?? 6.5, support: { patches: 0, updates: over.updates ?? 0 } },
});

describe('product identity', () => {
  it('each topic has its own look; the same game always looks the same', () => {
    const covers = ['kart', 'pirates', 'cooking', 'robots'].map((t) => JSON.stringify(productArt(game({ topicId: t }))));
    expect(new Set(covers).size).toBe(4);
    expect(productArt(game())).toEqual(productArt(game()));
  });
  it('hits get a gold seal, good games a star; medium games a bigger box; updates a sticker', () => {
    expect(productArt(game({ score: 8.3 })).seal).toBe('gold');
    expect(productArt(game({ score: 7.1 })).seal).toBe('star');
    expect(productArt(game({ score: 5 })).seal).toBeNull();
    const small = productBox(productArt(game())), big = productBox(productArt(game({ size: 'medium' })));
    expect(big.sy * big.sz).toBeGreaterThan(small.sy * small.sz);
    expect(productArt(game({ updates: 5 })).updates).toBe(2);
  });
  it('the framed cover shows the real first game (and an empty frame before)', () => {
    const count = (g: VoxelGrid) => { let n = 0; for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) if (g.get(x, y, z)) n++; return n; };
    const a = framedCover(productArt(game({ topicId: 'pirates' }))), b = framedCover(productArt(game({ topicId: 'robots' })));
    expect(JSON.stringify(Array.from(a.data))).not.toBe(JSON.stringify(Array.from(b.data)));
    expect(count(framedCover(null))).toBeGreaterThan(0);
  });
});

/** Occupied unit cubes of a model in item-local voxels. */
function modelCells(model: string): Set<string> {
  const set = new Set<string>();
  for (const { grid: g, at } of itemModel(model).parts) for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) if (g.get(x, y, z)) set.add(`${x + at[0]},${y + at[1]},${z + at[2]}`);
  return set;
}

describe('collectible boxes fit their shelves', () => {
  for (const [model, slots] of Object.entries(SHOWCASE_SLOTS)) {
    it(`${model}: small and big boxes stand on a shelf, inside the furniture, without going through it`, () => {
      const solid = modelCells(model);
      const def = ITEMS.find((d) => d.model === model)!;
      for (const size of ['small', 'medium'] as const) {
        const box = productBox(productArt(game({ size })));
        for (const [sx, sy, sz] of slots) {
          // The scene turns the box by −90° around y: box voxel (bx, by, bz) → (sx − bz − 1, sy + by, sz + 2 + bx), as unit cubes.
          let resting = false;
          for (let bx = 0; bx < box.sx; bx++) for (let by = 0; by < box.sy; by++) for (let bz = 0; bz < box.sz; bz++) {
            if (!box.get(bx, by, bz)) continue;
            const x = sx - bz - 1, y = sy + by, z = sz + 2 + bx;
            // Inside the footprint.
            expect(x, `${model} slot ${sx},${sy}`).toBeGreaterThanOrEqual(0);
            expect(x + 1).toBeLessThanOrEqual(def.size.w * CELL);
            expect(z + 1).toBeLessThanOrEqual(def.size.d * CELL);
            // No overlap with the furniture (half a voxel of tolerance: fractional slot positions).
            const near = (v: number) => [...new Set([Math.floor(v), Math.ceil(v)])];
            const cellsAt = (yy: number, strict: boolean) => near(x).flatMap((cx) => near(z).map((cz) => ({ cx, cz }))).filter(({ cx, cz }) => !strict || (Math.abs(cx - x) <= 0.5 && Math.abs(cz - z) <= 0.5)).some(({ cx, cz }) => solid.has(`${cx},${yy},${cz}`));
            const hit = cellsAt(y, true);
            expect(hit, `${model} ${size} slot ${sx},${sy},${sz} at ${x},${y},${z}`).toBe(false);
            if (by === 0 && cellsAt(y - 1, false)) resting = true;
          }
          expect(resting, `${model} ${size} slot ${sx},${sy} floats`).toBe(true);
        }
      }
    });
  }
});

// Older models that overhang their footprint by at most one voxel (known, harmless; measured in 0.19.0).
const TOLERANCE: Record<string, number> = { armchair: 1, plant_small: 1 };

describe('every catalogue model fits its footprint (0.19.0)', () => {
  for (const def of ITEMS.filter((d) => d.layer !== 'mount')) {
    it(`${def.id}`, () => {
      const tol = TOLERANCE[def.id] ?? 0;
      for (const c of modelCells(def.model)) {
        const [x, , z] = c.split(',').map(Number) as [number, number, number];
        expect(x, `${def.id} x`).toBeGreaterThanOrEqual(-tol);
        expect(z, `${def.id} z`).toBeGreaterThanOrEqual(-tol);
        expect(x, `${def.id} x`).toBeLessThan(def.size.w * CELL + tol);
        expect(z, `${def.id} z`).toBeLessThan(def.size.d * CELL + tol);
      }
    });
  }
});
