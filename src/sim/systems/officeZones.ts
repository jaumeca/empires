import { getItemDef } from '../../content/officeItems';
import type { Office, PlacedItem } from '../model/state';
import { rotatedSize } from './office';

/**
 * Office identity (0.22.0, D-072): zones that emerge from the furniture and a
 * style the office has, made of what is in it and how the walls and floor are.
 * Purely descriptive (no effect on the economy: the existing effects already
 * reward furniture, and a "style bonus" would become the one right way to
 * decorate). The player sees their office described back to them.
 */
export type ZoneKind = 'games' | 'meeting' | 'library' | 'rest' | 'kitchen' | 'garden' | 'work';
export type OfficeVibe = 'industrial' | 'cozy' | 'retro' | 'modern' | 'minimal' | 'creative';

const ZONE_ITEMS: Record<ZoneKind, readonly string[]> = {
  games: ['arcade', 'retro_console', 'tv_corner', 'beanbag'],
  meeting: ['meeting_table', 'whiteboard'],
  library: ['bookshelf', 'book_stack', 'game_cabinet', 'tall_cabinet', 'figure_shelf'],
  rest: ['sofa', 'armchair', 'beanbag', 'rug_round', 'lamp_arc', 'lamp_floor', 'side_table'],
  kitchen: ['coffee_machine', 'water_cooler'],
  garden: ['plant_small', 'plant_tall', 'monstera', 'bonsai', 'lucky_cactus'],
  work: ['desk_basic', 'desk_wide', 'server_rack'],
};
/** How many things of a kind, close together, make a zone. */
const ZONE_MIN: Record<ZoneKind, number> = { games: 2, meeting: 2, library: 2, rest: 2, kitchen: 2, garden: 3, work: 3 };
/** Cells between two things of a zone (gap between their footprints). */
const NEAR = 3;

export interface OfficeZone { kind: ZoneKind; size: number; x: number; z: number }

function box(it: PlacedItem) {
  const rs = rotatedSize(getItemDef(it.defId), it.rot);
  return { x0: it.x, z0: it.z, x1: it.x + rs.w - 1, z1: it.z + rs.d - 1 };
}
const gap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => Math.max(0, b.x0 - a.x1, a.x0 - b.x1, b.z0 - a.z1, a.z0 - b.z1);

/** Zones: groups of related things close together (one zone per kind, the biggest group). */
export function officeZones(office: Office): OfficeZone[] {
  const out: OfficeZone[] = [];
  for (const kind of Object.keys(ZONE_ITEMS) as ZoneKind[]) {
    const items = office.items.filter((it) => ZONE_ITEMS[kind].includes(it.defId));
    // Connected groups by proximity (stable order: placement order).
    const seen = new Set<string>();
    let best: PlacedItem[] = [];
    for (const start of items) {
      if (seen.has(start.uid)) continue;
      const group: PlacedItem[] = [];
      const queue = [start];
      seen.add(start.uid);
      while (queue.length) {
        const cur = queue.shift()!;
        group.push(cur);
        for (const o of items) if (!seen.has(o.uid) && gap(box(cur), box(o)) <= NEAR) { seen.add(o.uid); queue.push(o); }
      }
      if (group.length > best.length) best = group;
    }
    // A zone needs some variety too (two arcades are not a games corner... well, they are; but two rugs are not a rest zone).
    const kinds = new Set(best.map((i) => i.defId)).size;
    if (best.length >= ZONE_MIN[kind] && (kinds >= 2 || kind === 'garden' || kind === 'work')) {
      const bs = best.map(box);
      out.push({ kind, size: best.length, x: (Math.min(...bs.map((b) => b.x0)) + Math.max(...bs.map((b) => b.x1)) + 1) / 2, z: (Math.min(...bs.map((b) => b.z0)) + Math.max(...bs.map((b) => b.z1)) + 1) / 2 });
    }
  }
  return out.sort((a, b) => b.size - a.size || (a.kind < b.kind ? -1 : 1));
}

const VIBE_ITEMS: Record<OfficeVibe, Record<string, number>> = {
  industrial: { tall_cabinet: 1, server_rack: 1.5, lamp_floor: 0.5, desk_wide: 0.5, pc_workstation: 0.5 },
  cozy: { sofa: 1.5, armchair: 1, beanbag: 1, rug_round: 1, lamp_arc: 1, plant_small: 0.5, plant_tall: 0.5, monstera: 0.7, side_table: 0.5, book_stack: 0.5 },
  retro: { arcade: 2, retro_console: 1.5, rug_checker: 1, neon_sign: 1, gold_cartridge: 0.5 },
  modern: { tv_corner: 1, chair_ergo: 1, pc_creative: 0.5, meeting_table: 1, desk_wide: 0.5 },
  minimal: {},
  creative: { whiteboard: 1.5, figure_shelf: 1, fan_board: 1, framed_cover: 0.7, pc_creative: 0.7, bookshelf: 0.5 },
};
const VIBE_WALL: Record<string, Partial<Record<OfficeVibe, number>>> = {
  brick: { industrial: 2, retro: 0.5 }, concrete: { industrial: 2.5 }, white: { modern: 1.5, minimal: 1.5 },
  forest: { cozy: 1, creative: 0.5 }, coral: { creative: 1.5, retro: 0.5 }, sand: { cozy: 1 }, cream: { cozy: 0.5 },
  lavender: { creative: 1 }, sky: { modern: 0.5 }, mint: { creative: 0.5 },
};
const VIBE_FLOOR: Record<string, Partial<Record<OfficeVibe, number>>> = {
  concrete: { industrial: 2 }, dark: { industrial: 1, modern: 1 }, whitetile: { modern: 1.5, minimal: 1 }, checker: { retro: 2 },
  parquet: { cozy: 1, creative: 0.5 }, walnut: { cozy: 1 }, carpet: { cozy: 1.5 }, oak: { cozy: 0.5 }, tiles: { modern: 0.5 },
};

/** The office's style: up to two vibes, strongest first (styles combine: "cosy and industrial"). Empty = none yet. */
export function officeVibes(office: Office): OfficeVibe[] {
  const score: Record<OfficeVibe, number> = { industrial: 0, cozy: 0, retro: 0, modern: 0, minimal: 0, creative: 0 };
  for (const it of office.items) for (const v of Object.keys(score) as OfficeVibe[]) score[v] += VIBE_ITEMS[v][it.defId] ?? 0;
  const style = office.style;
  if (style) {
    for (const [v, n] of Object.entries(VIBE_WALL[style.wall] ?? {})) score[v as OfficeVibe] += n;
    for (const [v, n] of Object.entries(VIBE_FLOOR[style.floor] ?? {})) score[v as OfficeVibe] += n;
  }
  // Minimal: lots of free floor, few decorative things.
  const deco = office.items.filter((it) => !['desk', 'computer', 'chair'].includes(getItemDef(it.defId).category)).length;
  const area = office.w * office.d;
  if (deco * 12 < area) score.minimal += 2.5;
  else if (deco * 8 < area) score.minimal += 1;
  const ranked = (Object.keys(score) as OfficeVibe[]).filter((v) => score[v] >= 2.5).sort((a, b) => score[b] - score[a] || (a < b ? -1 : 1));
  if (!ranked.length) return [];
  // The second only if it is really there too (not a trace).
  return ranked.length > 1 && score[ranked[1]!] >= score[ranked[0]!] * 0.6 ? ranked.slice(0, 2) : ranked.slice(0, 1);
}
