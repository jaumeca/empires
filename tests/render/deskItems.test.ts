import { describe, expect, it } from 'vitest';
import { chairModel, computerModel, itemModel } from '../../src/render/models/catalogModels';
import { personalItem } from '../../src/render/models/personal';
import type { VoxelGrid } from '../../src/render/voxel';
import { ITEMS } from '../../src/content/officeItems';

/**
 * 0.18.0: the personal thing on each desk sits on the desktop and never
 * overlaps the monitor, keyboard, mug, lamp or chair, whatever computer is
 * mounted and whoever owns the desk.
 */
type Part = { grid: VoxelGrid; at: [number, number, number] };
const cells = (parts: Part[]) => {
  const set = new Set<string>();
  for (const { grid: g, at } of parts) for (let x = 0; x < g.sx; x++) for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) if (g.get(x, y, z)) set.add(`${x + at[0]},${y + at[1]},${z + at[2]}`);
  return set;
};
const DESKS = ITEMS.filter((d) => d.category === 'desk');
const PCS = ['pc_basic', 'pc_dev', 'pc_workstation', 'pc_creative'];
const TRAITS = [undefined, 'perfectionist', 'curious', 'sociable', 'night_owl'] as const;

describe('personal items on desks (0.18.0)', () => {
  for (const d of DESKS) {
    it(`${d.id}: fits next to every computer, for every owner`, () => {
      const model = itemModel(d.model);
      const a = model.anchor!;
      expect(a.personal).toBeDefined();
      expect(a.mug).toBeDefined();
      for (const pc of PCS) {
        const others = cells([
          ...model.parts,
          ...computerModel(pc).parts.map((p) => ({ grid: p.grid, at: [p.at[0] + a.monitorX, p.at[1], p.at[2]] as [number, number, number] })),
          ...chairModel('chair_ergo').map((p) => ({ grid: p.grid, at: [p.at[0] + a.chairX, p.at[1], p.at[2]] as [number, number, number] })),
        ]);
        for (const tr of TRAITS) {
          const mine = cells([{ grid: personalItem(tr), at: a.personal! }]);
          const clash = [...mine].filter((c) => others.has(c));
          expect(clash, `${d.id} + ${pc} + ${tr}`).toEqual([]);
          // Resting on the desktop: something directly under its lowest layer.
          const bottom = [...mine].filter((c) => Number(c.split(',')[1]) === a.personal![1]);
          expect(bottom.some((c) => { const [x, , z] = c.split(','); return others.has(`${x},${a.personal![1] - 1},${z}`); }), `${d.id} ${tr} floats`).toBe(true);
        }
      }
    });
  }
});
