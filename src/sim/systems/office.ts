import { getItemDef, ITEMS, OFFICE_GRID, STARTING_ITEMS, type ItemDef, type ItemEffects } from '../../content/officeItems';
import type { GameState, Office, PlacedItem, Rot } from '../model/state';

/**
 * Office layout, placement rules and effects (LS.2–LS.4). Pure simulation:
 * the renderer reads `state.office` and the UI sends buy/move/sell commands.
 */

export const SELL_REFUND = 0.5;

export function createStartingOffice(nextUid: () => string): Office {
  const items: PlacedItem[] = [];
  for (const s of STARTING_ITEMS) {
    const item: PlacedItem = { uid: nextUid(), defId: s.defId, x: s.x, z: s.z, rot: s.rot };
    if (s.mounts) item.mounts = { computer: s.mounts.computer, chair: s.mounts.chair };
    items.push(item);
  }
  return { w: OFFICE_GRID.w, d: OFFICE_GRID.d, items };
}

// ---------------------------------------------------------------- geometry

/** Footprint size after rotation. */
export function rotatedSize(def: ItemDef, rot: Rot): { w: number; d: number } {
  return rot % 2 === 0 ? { ...def.size } : { w: def.size.d, d: def.size.w };
}

/**
 * Maps a local cell/point (at rot 0, origin at the footprint corner) into office
 * coordinates for an item at (x, z) with rotation `rot`. Works for cells (integer,
 * pass +0.5 to address centers) and for fractional positions in cell units.
 * rot r turns the item by r·90° so that its front (+z at rot 0) faces:
 * 0 → +z, 1 → +x, 2 → −z, 3 → −x.
 */
export function toOffice(def: ItemDef, x: number, z: number, rot: Rot, lx: number, lz: number): [number, number] {
  const { w, d } = def.size;
  switch (rot) {
    case 0: return [x + lx, z + lz];
    case 1: return [x + lz, z + (w - lx)];
    case 2: return [x + (w - lx), z + (d - lz)];
    default: return [x + (d - lz), z + lx];
  }
}

/** Office cells (integer coords) covered by a local rectangle [lx0, lx0+w) × [lz0, lz0+d). */
function rectCells(def: ItemDef, x: number, z: number, rot: Rot, lx0: number, lz0: number, w: number, d: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < w; i++)
    for (let j = 0; j < d; j++) {
      const [cx, cz] = toOffice(def, x, z, rot, lx0 + i + 0.5, lz0 + j + 0.5);
      out.push([Math.floor(cx), Math.floor(cz)]);
    }
  return out;
}

export function footprintCells(def: ItemDef, x: number, z: number, rot: Rot): [number, number][] {
  if (def.layer === 'mount') return [];
  return rectCells(def, x, z, rot, 0, 0, def.size.w, def.size.d);
}

export function reserveCells(def: ItemDef, x: number, z: number, rot: Rot): [number, number][] {
  if (!def.reserve) return [];
  return rectCells(def, x, z, rot, def.reserve.x ?? 0, def.size.d, def.reserve.w, def.reserve.d);
}

/** Use spot in voxels relative to the office floor origin, plus facing angle (rotation.y). */
export function useSpot(item: PlacedItem): { vx: number; vz: number; heading: number; pose: 'sit' | 'stand' | 'lounge' } | null {
  const def = getItemDef(item.defId);
  if (!def.spot) return null;
  const cv = OFFICE_GRID.cellVoxels;
  const [ox, oz] = toOffice(def, item.x, item.z, item.rot, def.spot.x / cv, def.spot.z / cv);
  // At rot 0 a sitter at a desk faces the desk (−z); for sofas / standing spots, the item (−z) too.
  const heading = Math.PI + (item.rot * Math.PI) / 2;
  return { vx: ox * cv, vz: oz * cv, heading, pose: def.spot.pose };
}

// ---------------------------------------------------------------- validation

export type PlaceError = 'out_of_bounds' | 'overlap' | 'blocks_access' | 'unreachable' | 'locked' | 'not_placeable';

interface Grid {
  solid: Uint8Array; // 1 = solid furniture
  reserved: Uint8Array; // 1 = must stay walkable
  floor: Uint8Array; // 1 = rug
}

function buildGrid(office: Office, skipUid?: string): Grid {
  const n = office.w * office.d;
  const g: Grid = { solid: new Uint8Array(n), reserved: new Uint8Array(n), floor: new Uint8Array(n) };
  for (const it of office.items) {
    if (it.uid === skipUid) continue;
    const def = getItemDef(it.defId);
    for (const [cx, cz] of footprintCells(def, it.x, it.z, it.rot)) {
      if (cx < 0 || cz < 0 || cx >= office.w || cz >= office.d) continue;
      if (def.layer === 'floor') g.floor[cx + cz * office.w] = 1;
      else g.solid[cx + cz * office.w] = 1;
    }
    for (const [cx, cz] of reserveCells(def, it.x, it.z, it.rot)) {
      if (cx < 0 || cz < 0 || cx >= office.w || cz >= office.d) continue;
      g.reserved[cx + cz * office.w] = 1;
    }
  }
  return g;
}

/** Walkable cells = not solid. Returns how many walkable cells are reachable from `start`. */
function reachable(office: Office, solid: Uint8Array, start: number): Uint8Array {
  const seen = new Uint8Array(solid.length);
  const q = [start];
  seen[start] = 1;
  while (q.length) {
    const c = q.pop()!;
    const x = c % office.w, z = Math.floor(c / office.w);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= office.w || nz >= office.d) continue;
      const k = nx + nz * office.w;
      if (seen[k] || solid[k]) continue;
      seen[k] = 1;
      q.push(k);
    }
  }
  return seen;
}

/**
 * Checks whether `defId` can be placed at (x, z, rot). `ignoreUid` lets an item
 * be moved onto (part of) its own old position.
 */
export function canPlace(office: Office, defId: string, x: number, z: number, rot: Rot, ignoreUid?: string): PlaceError | null {
  const def = getItemDef(defId);
  if (def.locked) return 'locked';
  if (def.layer === 'mount') return 'not_placeable';
  const g = buildGrid(office, ignoreUid);
  const inside = ([cx, cz]: [number, number]) => cx >= 0 && cz >= 0 && cx < office.w && cz < office.d;
  const cells = footprintCells(def, x, z, rot);
  const reserve = reserveCells(def, x, z, rot);
  if (!cells.every(inside) || !reserve.every(inside)) return 'out_of_bounds';
  for (const [cx, cz] of cells) {
    const k = cx + cz * office.w;
    if (def.layer === 'floor') {
      if (g.floor[k]) return 'overlap';
    } else if (g.solid[k]) return 'overlap';
    else if (g.reserved[k]) return 'blocks_access';
  }
  for (const [cx, cz] of reserve) if (g.solid[cx + cz * office.w]) return 'blocks_access';

  // Connectivity: every walkable cell must stay reachable (no closed-off pockets,
  // every reserved cell usable).
  const solid = Uint8Array.from(g.solid);
  if (def.layer === 'solid') for (const [cx, cz] of cells) solid[cx + cz * office.w] = 1;
  let start = -1;
  let walkable = 0;
  for (let k = 0; k < solid.length; k++) if (!solid[k]) { walkable++; if (start < 0) start = k; }
  if (start < 0) return 'unreachable';
  const seen = reachable(office, solid, start);
  let count = 0;
  for (let k = 0; k < seen.length; k++) if (seen[k]) count++;
  return count === walkable ? null : 'unreachable';
}

/** Walkable map for the renderer's path finding (1 = blocked). */
export function blockedCells(office: Office): Uint8Array {
  return buildGrid(office).solid;
}

// ---------------------------------------------------------------- effects

export interface OfficeEffects {
  techSpeed: number;
  designSpeed: number;
  fatigue: number;
  inspiration: number;
  rest: number;
  coffee: number;
  ambiance: number;
  upkeep: number;
}

/** The founder works at the desk with the best computer (ties: first placed), among desks no employee uses. */
export function founderDesk(office: Office): PlacedItem | null {
  let best: PlacedItem | null = null;
  let bestScore = -1;
  for (const it of office.items) {
    if (getItemDef(it.defId).category !== 'desk' || it.assignedTo) continue;
    const pc = it.mounts?.computer ? getItemDef(it.mounts.computer).effects ?? {} : {};
    const score = (pc.techSpeed ?? 1) + (pc.designSpeed ?? 1) + (it.mounts?.computer ? 1 : 0);
    if (score > bestScore) { best = it; bestScore = score; }
  }
  return best;
}

export function officeEffects(office: Office): OfficeEffects {
  const fx: OfficeEffects = { techSpeed: 1, designSpeed: 1, fatigue: 1, inspiration: 1, rest: 0, coffee: 0, ambiance: 0, upkeep: 0 };
  const desk = founderDesk(office);
  const eff = (id?: string): ItemEffects => (id ? getItemDef(id).effects ?? {} : {});
  if (desk) {
    const pc = eff(desk.mounts?.computer);
    const chair = eff(desk.mounts?.chair);
    fx.techSpeed = pc.techSpeed ?? 1;
    fx.designSpeed = pc.designSpeed ?? 1;
    fx.fatigue = chair.fatigue ?? 1;
  } else {
    // No desk at all (should not happen: the last desk can't be sold).
    fx.techSpeed = fx.designSpeed = 0.5;
  }
  let ambianceRaw = 0;
  for (const it of office.items) {
    const def = getItemDef(it.defId);
    const e = def.effects ?? {};
    fx.inspiration = Math.max(fx.inspiration, e.inspiration ?? 1); // best one counts
    fx.rest = Math.max(fx.rest, e.rest ?? 0);
    fx.coffee = Math.max(fx.coffee, e.coffee ?? 0);
    ambianceRaw += e.ambiance ?? 0;
    fx.upkeep += def.upkeep ?? 0;
    for (const m of [it.mounts?.computer, it.mounts?.chair]) if (m) fx.upkeep += getItemDef(m).upkeep ?? 0;
  }
  fx.ambiance = ambianceRaw;
  return fx;
}

/** 0..1 with strong diminishing returns: the 10th plant adds very little. */
export function ambianceLevel(raw: number): number {
  return 1 - Math.exp(-raw / 3);
}

export function catalog(): readonly ItemDef[] {
  return ITEMS;
}

export { getItemDef };
