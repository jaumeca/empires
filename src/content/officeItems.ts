/**
 * Office catalog (LS.2). Pure data: safe to import from sim/. Names and effect
 * descriptions are i18n keys `item.<id>.name` / `item.<id>.desc`.
 *
 * Grid: 1 cell = 6 voxels (half a floor tile). The starting room is 10 × 8 cells.
 * Orientation: at rot 0 an item's front faces +z (towards the viewer).
 * Effects are deliberately small and non-stacking (see systems/office.ts):
 *  - techSpeed / designSpeed / fatigue: only the founder's workstation counts.
 *  - inspiration (whiteboard), rest, coffee: only the best item of each kind counts.
 *  - ambiance: decoration adds up with strong diminishing returns.
 */
export type ItemCategory = 'desk' | 'computer' | 'chair' | 'plant' | 'light' | 'comfort' | 'creative' | 'storage' | 'decor' | 'tech' | 'awards';

export interface ItemEffects {
  /** Multiplier on technical work at this workstation (computer). */
  techSpeed?: number;
  /** Multiplier on design work at this workstation (computer). */
  designSpeed?: number;
  /** Multiplier on energy drain while working at this workstation (chair). */
  fatigue?: number;
  /** Multiplier on design / concept work while a whiteboard is in the office. */
  inspiration?: number;
  /** Extra overnight energy recovery and a place to rest (sofa, armchair). */
  rest?: number;
  /** Morning energy boost (coffee), paid every day through `upkeep`. */
  coffee?: number;
  /** Energy from a drink break during the day (AW.B): coffee machine, water cooler. */
  drink?: number;
  /** Contribution to the office atmosphere (morale), with diminishing returns. */
  ambiance?: number;
}

export interface ItemDef {
  id: string;
  category: ItemCategory;
  price: number;
  /** Recurring daily cost (electricity, coffee beans…). */
  upkeep?: number;
  /** Footprint in grid cells at rot 0 (computers/chairs mount on a desk: no footprint). */
  size: { w: number; d: number };
  /** 'floor' items (rugs) can be walked on and lie under furniture. */
  layer: 'solid' | 'floor' | 'mount';
  /** Cells in front of the item (at rot 0, +z side) that must stay free to use it. */
  reserve?: { w: number; d: number; x?: number };
  /** Where the Empirian stands/sits to use it, in voxels relative to the footprint corner (rot 0). */
  spot?: { x: number; z: number; pose: 'sit' | 'stand' | 'lounge' };
  /** Mount point for desks. */
  mount?: 'desk';
  effects?: ItemEffects;
  /** Not available yet (shown as a teaser in the catalog). */
  locked?: 'later';
  /** Holds the collectible product boxes. */
  showcase?: boolean;
  rotatable: boolean;
  /** Visual model id (src/render/models). */
  model: string;
}

export const ITEMS: readonly ItemDef[] = [
  // --- Work
  { id: 'desk_basic', category: 'desk', price: 150, size: { w: 4, d: 2 }, layer: 'solid', reserve: { w: 4, d: 2 }, spot: { x: 12.5, z: 17.5, pose: 'sit' }, rotatable: true, model: 'desk_basic', effects: { ambiance: 0.2 } },
  { id: 'desk_wide', category: 'desk', price: 520, size: { w: 6, d: 2 }, layer: 'solid', reserve: { w: 4, d: 2, x: 1 }, spot: { x: 18.5, z: 17.5, pose: 'sit' }, rotatable: true, model: 'desk_wide', effects: { ambiance: 0.8 } },
  { id: 'pc_basic', category: 'computer', price: 300, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'pc_basic', effects: {} },
  { id: 'pc_dev', category: 'computer', price: 1400, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'pc_dev', effects: { techSpeed: 1.08, designSpeed: 1.06 } },
  { id: 'pc_workstation', category: 'computer', price: 3600, upkeep: 6, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'pc_workstation', effects: { techSpeed: 1.16, designSpeed: 0.98 } },
  { id: 'pc_creative', category: 'computer', price: 2600, upkeep: 3, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'pc_creative', effects: { techSpeed: 1.0, designSpeed: 1.14 } },
  { id: 'chair_basic', category: 'chair', price: 80, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'chair_basic', effects: {} },
  { id: 'chair_ergo', category: 'chair', price: 650, size: { w: 0, d: 0 }, layer: 'mount', mount: 'desk', rotatable: false, model: 'chair_ergo', effects: { fatigue: 0.85 } },
  // --- Comfort & creativity
  { id: 'armchair', category: 'comfort', price: 300, size: { w: 2, d: 2 }, layer: 'solid', reserve: { w: 2, d: 1 }, spot: { x: 6.5, z: 9, pose: 'lounge' }, rotatable: true, model: 'armchair', effects: { rest: 0, ambiance: 0.5 } },
  { id: 'sofa', category: 'comfort', price: 900, size: { w: 4, d: 2 }, layer: 'solid', reserve: { w: 4, d: 1 }, spot: { x: 12, z: 9, pose: 'lounge' }, rotatable: true, model: 'sofa', effects: { rest: 4, ambiance: 1 } },
  { id: 'coffee_machine', category: 'comfort', price: 350, upkeep: 5, size: { w: 2, d: 1 }, layer: 'solid', reserve: { w: 2, d: 1 }, spot: { x: 6, z: 9, pose: 'stand' }, rotatable: true, model: 'coffee_machine', effects: { coffee: 7, drink: 4 } },
  { id: 'water_cooler', category: 'comfort', price: 120, size: { w: 1, d: 1 }, layer: 'solid', reserve: { w: 1, d: 1 }, spot: { x: 3, z: 9, pose: 'stand' }, rotatable: true, model: 'water_cooler', effects: { drink: 2 } },
  { id: 'whiteboard', category: 'creative', price: 400, size: { w: 3, d: 1 }, layer: 'solid', reserve: { w: 3, d: 1 }, spot: { x: 9, z: 9, pose: 'stand' }, rotatable: true, model: 'whiteboard', effects: { inspiration: 1.1 } },
  // --- Decoration
  { id: 'plant_small', category: 'plant', price: 60, size: { w: 2, d: 2 }, layer: 'solid', rotatable: false, model: 'plant_small', effects: { ambiance: 1 } },
  { id: 'plant_tall', category: 'plant', price: 160, size: { w: 2, d: 2 }, layer: 'solid', rotatable: false, model: 'plant_tall', effects: { ambiance: 1.6 } },
  { id: 'lamp_floor', category: 'light', price: 120, size: { w: 1, d: 1 }, layer: 'solid', rotatable: false, model: 'lamp_floor', effects: { ambiance: 1 } },
  { id: 'beanbag', category: 'comfort', price: 160, size: { w: 2, d: 2 }, layer: 'solid', reserve: { w: 2, d: 1 }, spot: { x: 6, z: 8, pose: 'lounge' }, rotatable: true, model: 'beanbag', effects: { rest: 2, ambiance: 0.5 } },
  { id: 'rug_round', category: 'decor', price: 120, size: { w: 3, d: 3 }, layer: 'floor', rotatable: false, model: 'rug_round', effects: { ambiance: 1 } },
  { id: 'side_table', category: 'decor', price: 70, size: { w: 1, d: 1 }, layer: 'solid', rotatable: false, model: 'side_table', effects: { ambiance: 0.4 } },
  { id: 'rug_checker', category: 'decor', price: 90, size: { w: 4, d: 3 }, layer: 'floor', rotatable: true, model: 'rug_checker', effects: { ambiance: 1 } },
  { id: 'arcade', category: 'decor', price: 1100, size: { w: 2, d: 2 }, layer: 'solid', reserve: { w: 2, d: 1 }, spot: { x: 6, z: 15, pose: 'stand' }, rotatable: true, model: 'arcade', effects: { ambiance: 2 } },
  { id: 'bookshelf', category: 'storage', price: 200, size: { w: 3, d: 1 }, layer: 'solid', reserve: { w: 3, d: 1 }, spot: { x: 9, z: 10, pose: 'stand' }, rotatable: true, model: 'bookshelf', showcase: true, effects: { ambiance: 1 } },
  // --- Awards (ML.3): unlocked by achievements (systems/story.ts), purely decorative.
  { id: 'trophy_gold', category: 'awards', price: 120, size: { w: 1, d: 1 }, layer: 'solid', rotatable: false, model: 'trophy_gold', effects: { ambiance: 0.8 } },
  { id: 'plaque_five', category: 'awards', price: 150, size: { w: 1, d: 1 }, layer: 'solid', rotatable: true, model: 'plaque_five', effects: { ambiance: 0.8 } },
  { id: 'team_photo', category: 'awards', price: 80, size: { w: 1, d: 1 }, layer: 'solid', rotatable: true, model: 'team_photo', effects: { ambiance: 0.8 } },
  { id: 'bonsai', category: 'awards', price: 140, size: { w: 1, d: 1 }, layer: 'solid', rotatable: false, model: 'bonsai', effects: { ambiance: 1 } },
  { id: 'neon_sign', category: 'awards', price: 600, upkeep: 2, size: { w: 2, d: 1 }, layer: 'solid', rotatable: true, model: 'neon_sign', effects: { ambiance: 1.6 } },
  { id: 'lucky_cactus', category: 'awards', price: 50, size: { w: 1, d: 1 }, layer: 'solid', rotatable: false, model: 'lucky_cactus', effects: { ambiance: 0.6 } },
  // --- Later
  { id: 'server_rack', category: 'tech', price: 6000, upkeep: 20, size: { w: 2, d: 1 }, layer: 'solid', rotatable: true, model: 'server_rack', locked: 'later', effects: {} },
];

export function getItemDef(id: string): ItemDef {
  const d = ITEMS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}

export const OFFICE_GRID = { w: 10, d: 8, cellVoxels: 6 } as const;

/**
 * Starting room (= the bedroom of v0.1, now made of catalog items). Effects of
 * these items are the neutral baseline: the balance of v0.1 is unchanged.
 */
export const STARTING_ITEMS: { defId: string; x: number; z: number; rot: 0 | 1 | 2 | 3; mounts?: { computer: string; chair: string } }[] = [
  { defId: 'desk_basic', x: 2, z: 0, rot: 0, mounts: { computer: 'pc_basic', chair: 'chair_basic' } },
  { defId: 'plant_small', x: 8, z: 0, rot: 0 },
  { defId: 'bookshelf', x: 0, z: 3, rot: 1 },
  { defId: 'rug_checker', x: 3, z: 4, rot: 0 },
  { defId: 'armchair', x: 8, z: 5, rot: 0 },
];
