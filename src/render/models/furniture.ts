import { FLOOR_FINISH, P, WALL_FINISH } from '../palette';
import { VoxelGrid } from '../voxel';

/**
 * Original voxel furniture defined in code (D-014, D-017). All sizes in voxels;
 * 12 voxels = 1 floor cell. Models are built with y up, z toward the viewer,
 * and their origin at the min corner on the floor.
 */

export const ROOM = { w: 60, d: 48, wallH: 36, wallT: 3, floorT: 3 } as const;

/** The room: floor, two walls and the window. `style` picks wall paint and floor (AW.C.3). */
export function buildRoomShell(style: { wall: string; floor: string } = { wall: 'cream', floor: 'oak' }, size: { w: number; d: number } = { w: ROOM.w, d: ROOM.d }): VoxelGrid {
  const { wallH, wallT, floorT } = ROOM;
  const { w, d } = size;
  const [wallBack, wallShade, wallSide] = WALL_FINISH[style.wall] ?? WALL_FINISH.cream!;
  const fl = FLOOR_FINISH[style.floor] ?? FLOOR_FINISH.oak!;
  // Grid includes the walls (behind / left of the floor area) and the base slab.
  const g = new VoxelGrid(w + wallT, wallH + floorT, d + wallT);
  const X = (x: number) => x + wallT; // floor-space -> grid-space
  const Z = (z: number) => z + wallT;

  // Diorama base slab with a darker rim.
  g.box(0, 0, 0, w + wallT, floorT - 1, d + wallT, P.baseSide);
  // Floor planks: run along x, 4 voxels wide, staggered seams.
  g.box(X(0), floorT - 1, Z(0), X(w), floorT, Z(d), (x, _y, z) => {
    const fx = x - wallT, fz = z - wallT;
    if (fl.tiles) return (Math.floor(fx / 6) + Math.floor(fz / 6)) % 2 === 0 ? fl.tiles[0] : fl.tiles[1];
    if (fl.carpet) return (fx * 7 + fz * 13) % 5 === 0 ? fl.carpet[1] : fl.carpet[0];
    const plank = Math.floor(fz / 4);
    const seam = ((fx + plank * 7) % 20) === 0;
    if (seam) return fl.seam ?? P.woodMid;
    return fl.planks![plank % 4] ?? P.woodLight;
  });
  // Back wall (z in [0, wallT)), spanning x.
  g.box(0, floorT - 1, 0, w + wallT, floorT + wallH - 1, wallT, wallBack);
  // Left wall (x in [0, wallT)), spanning z.
  g.box(0, floorT - 1, 0, wallT, floorT + wallH - 1, d + wallT, wallSide);
  // Two-tone wainscot on the back wall + skirting boards.
  g.box(wallT, floorT, wallT - 1, w + wallT, floorT + 12, wallT, wallShade);
  g.box(wallT, floorT, wallT - 1, w + wallT, floorT + 2, wallT, P.skirting);
  g.box(wallT - 1, floorT, wallT, wallT, floorT + 2, d + wallT, P.skirting);
  // Top trim on the wall edges (gives the cut-away diorama look).
  g.box(0, floorT + wallH - 2, 0, w + wallT, floorT + wallH - 1, wallT, P.woodDark);
  g.box(0, floorT + wallH - 2, 0, wallT, floorT + wallH - 1, d + wallT, P.woodDark);

  // Windows in the back wall (a bigger studio gets a second one).
  for (const wx of w >= 80 ? [40, 66] : [40]) {
    const wx0 = X(wx), wx1 = X(wx + 16), wy0 = floorT + 14, wy1 = floorT + 30;
    g.box(wx0, wy0, 0, wx1, wy1, wallT, P.woodDark); // frame
    g.box(wx0 + 1, wy0 + 1, 0, wx1 - 1, wy1 - 1, wallT, (x, y) => {
      // Sky gradient with a couple of soft clouds.
      const cloud = (y === wy0 + 9 && x > wx0 + 3 && x < wx0 + 8) || (y === wy0 + 10 && x > wx0 + 4 && x < wx0 + 7) || (y === wy0 + 5 && x > wx0 + 9 && x < wx0 + 13);
      if (cloud) return P.white;
      return y > wy0 + 8 ? P.sky : P.skyLight;
    });
    g.box(wx0 + 1, wy0 + 1, wallT - 1, wx1 - 1, wy1 - 1, wallT, 0); // recess glass 1 voxel
    g.box(wx0 + 7, wy0 + 1, wallT - 1, wx0 + 8, wy1 - 1, wallT, P.woodDark); // mullion
    g.box(wx0 + 1, wy0 + 8, wallT - 1, wx1 - 1, wy0 + 9, wallT, P.woodDark);
    g.box(wx0 - 1, wy0 - 1, wallT, wx1 + 1, wy0, wallT + 2, P.skirting); // sill
  }
  return g;
}

export function buildDesk(): VoxelGrid {
  const g = new VoxelGrid(24, 10, 12);
  g.box(0, 8, 0, 24, 10, 12, P.woodMid); // top
  g.box(0, 9, 0, 24, 10, 12, P.woodLight);
  g.box(0, 0, 1, 2, 8, 3, P.woodDark); // legs
  g.box(0, 0, 9, 2, 8, 11, P.woodDark);
  g.box(22, 0, 1, 24, 8, 3, P.woodDark);
  g.box(22, 0, 9, 24, 8, 11, P.woodDark);
  // Drawer unit on the right
  g.box(16, 1, 1, 23, 8, 11, P.woodMid);
  g.box(16, 4, 11, 23, 5, 12, P.woodDark);
  g.box(19, 6, 11, 20, 7, 12, P.mustard);
  g.box(19, 2, 11, 20, 3, 12, P.mustard);
  return g;
}

export function buildMonitor(): VoxelGrid {
  const g = new VoxelGrid(12, 11, 4);
  g.box(4, 0, 0, 8, 1, 3, P.plastic); // foot
  g.box(5, 1, 1, 7, 3, 2, P.plastic); // neck
  g.box(0, 3, 1, 12, 11, 3, P.plastic); // body (screen is a separate plane)
  return g;
}

export function buildKeyboard(): VoxelGrid {
  const g = new VoxelGrid(8, 1, 3);
  g.box(0, 0, 0, 8, 1, 3, (x, _y, z) => ((x + z) % 2 === 0 ? P.plasticLight : P.white));
  return g;
}

export function buildMug(): VoxelGrid {
  const g = new VoxelGrid(3, 3, 3);
  g.box(0, 0, 0, 3, 3, 3, P.coral);
  g.set(1, 2, 1, P.woodDeep);
  return g;
}

export function buildChair(): VoxelGrid {
  const g = new VoxelGrid(9, 14, 9);
  g.box(4, 0, 4, 5, 4, 5, P.metalDark); // post
  g.box(1, 0, 4, 8, 1, 5, P.metalDark); // star base
  g.box(4, 0, 1, 5, 1, 8, P.metalDark);
  g.box(0, 4, 0, 9, 6, 9, P.fabricBlue); // seat
  g.box(0, 5, 0, 9, 6, 9, P.fabricBlue);
  // Backrest (behind the sitter: +z). Empirians have big heads: the seated head
  // starts at height ≈10 (≈9.3 tilted back), so the backrest stays below 9 (0.17.0).
  g.box(0, 6, 7, 9, 9, 9, P.fabricBlue);
  g.box(1, 6, 7, 8, 8, 8, P.fabricBlueDark);
  return g;
}

export function buildPlant(): VoxelGrid {
  const g = new VoxelGrid(13, 22, 13);
  // Pot (offset so leaves can spill over the rim)
  g.box(4, 0, 4, 9, 6, 9, P.terracotta);
  g.box(3, 5, 3, 10, 7, 10, P.terracottaDark);
  g.box(4, 6, 4, 9, 7, 9, P.woodDeep);
  // Stems
  g.box(6, 7, 6, 7, 15, 7, P.leafDark);
  // Broad leaves radiating outwards at different heights (monstera-like plates).
  const leaf = (x0: number, y: number, z0: number, w: number, d: number, droop: [number, number]) => {
    for (let dz = 0; dz < d; dz++)
      for (let dx = 0; dx < w; dx++) {
        const edge = (dx === 0 || dx === w - 1) && (dz === 0 || dz === d - 1);
        if (edge) continue; // rounded corners
        const tipDrop = Math.round((droop[0] * dx) / Math.max(1, w - 1) + (droop[1] * dz) / Math.max(1, d - 1));
        const mid = w > d ? dz === Math.floor(d / 2) : dx === Math.floor(w / 2);
        g.set(x0 + dx, y - tipDrop, z0 + dz, mid ? P.leafDark : (dx + dz) % 4 === 0 ? P.leafLight : P.leaf);
      }
  };
  leaf(7, 12, 5, 6, 3, [2, 0]);   // +x
  leaf(0, 13, 5, 6, 3, [-2, 0]);  // -x (droop handled by sign below)
  leaf(5, 15, 7, 3, 6, [0, 2]);   // +z
  leaf(5, 11, 0, 3, 6, [0, -1]);  // -z
  leaf(4, 18, 4, 5, 5, [0, 0]);   // crown
  leaf(8, 16, 8, 4, 4, [1, 1]);
  leaf(1, 17, 1, 4, 4, [0, 0]);
  return g;
}

export function buildDeskLamp(): VoxelGrid {
  const g = new VoxelGrid(6, 10, 5);
  g.box(0, 0, 0, 5, 1, 4, P.ink); // base
  g.box(2, 1, 2, 3, 7, 3, P.metal); // arm
  g.box(2, 7, 1, 6, 8, 3, P.metal);
  g.box(3, 7, 0, 6, 10, 4, P.mustard); // shade
  g.box(4, 6, 1, 5, 7, 3, P.amberGlow); // bulb
  return g;
}

export function buildBookshelf(): VoxelGrid {
  // Stands against the left wall: depth along x (6), width along z (16).
  const g = new VoxelGrid(6, 32, 16);
  g.box(0, 0, 0, 6, 32, 16, 0);
  g.box(0, 0, 0, 6, 32, 1, P.woodDark); // sides
  g.box(0, 0, 15, 6, 32, 16, P.woodDark);
  g.box(0, 0, 0, 1, 32, 16, P.woodDeep); // back
  const shelves = [0, 8, 16, 24, 31];
  for (const y of shelves) g.box(0, y, 0, 6, y + 1, 16, P.woodMid);
  // Books on the two lower shelves; top shelf left for product boxes.
  const bookColors = [P.coral, P.mint, P.sky, P.mustard, P.lavender, P.leaf, P.cream, P.coralDark, P.fabricBlue];
  let ci = 0;
  for (const y of [1, 9]) {
    let z = 1;
    while (z < 15) {
      const wdt = 1 + ((z * 7 + y) % 2);
      const h = 5 + ((z * 3 + y) % 3);
      const c = bookColors[ci++ % bookColors.length] ?? P.coral;
      g.box(1, y, z, 5, y + h, Math.min(15, z + wdt), c);
      g.box(4, y + h - 2, z, 5, y + h - 1, Math.min(15, z + wdt), P.cream); // spine label
      z += wdt;
      if (z === 9 && y === 9) z += 2; // small gap
    }
  }
  // A leaning book and a tiny globe on the middle shelf area.
  g.box(1, 17, 2, 5, 18, 8, P.sky);
  g.box(2, 17, 10, 5, 20, 13, P.mint);
  g.box(3, 20, 11, 4, 21, 12, P.woodDark);
  return g;
}

export function buildPoster(): VoxelGrid {
  // Original pixel art: a small voxel rocket leaving a tiny planet. Flat on the back wall.
  const art = [
    '..........',
    '...s..*...',
    '.....rr...',
    '....rwwr..',
    '*...rwbr..',
    '....rwwr..',
    '...rrwwrr.',
    '...r.oo.r.',
    '.....yy...',
    '..s...y...',
    '.gggg.....',
    'ggmggg..s.',
    'gggggg....',
  ];
  const map: Record<string, number> = {
    '.': P.fabricBlueDark, s: P.cream, '*': P.mustard, r: P.coral, w: P.white, b: P.sky,
    o: P.mustard, y: P.amberGlow, g: P.mint, m: P.mintDark,
  };
  const W = art[0]!.length + 2, H = art.length + 2;
  const g = new VoxelGrid(W, H, 1);
  g.box(0, 0, 0, W, H, 1, P.cream); // white border
  art.forEach((row, r) => {
    [...row].forEach((ch, c) => g.set(c + 1, H - 2 - r, 0, map[ch] ?? P.ink));
  });
  return g;
}

export function buildRug(): VoxelGrid {
  const g = new VoxelGrid(26, 1, 18);
  g.box(0, 0, 0, 26, 1, 18, (x, _y, z) => {
    const border = x === 0 || z === 0 || x === 25 || z === 17;
    if (border) return P.rugA;
    const inner = x === 2 || z === 2 || x === 23 || z === 15;
    if (inner) return P.rugC;
    return (Math.floor(x / 3) + Math.floor(z / 3)) % 2 === 0 ? P.rugB : P.cream;
  });
  return g;
}

export function buildArmchair(): VoxelGrid {
  // Small cozy armchair facing +z (towards the viewer). Backrest at low z, armrests on x sides.
  const g = new VoxelGrid(13, 11, 11);
  g.box(1, 0, 1, 2, 2, 2, P.woodDeep); // feet
  g.box(11, 0, 1, 12, 2, 2, P.woodDeep);
  g.box(1, 0, 9, 2, 2, 10, P.woodDeep);
  g.box(11, 0, 9, 12, 2, 10, P.woodDeep);
  g.box(0, 2, 0, 13, 5, 11, P.coralDark); // base
  g.box(2, 5, 3, 11, 6, 11, P.coral); // seat cushion
  g.box(2, 5, 10, 11, 6, 11, P.coralDark); // cushion piping
  g.box(0, 2, 0, 13, 11, 3, P.coral); // backrest
  g.box(1, 10, 0, 12, 11, 2, P.coralDark);
  g.box(0, 2, 0, 2, 8, 11, P.coral); // armrests
  g.box(11, 2, 0, 13, 8, 11, P.coral);
  g.box(0, 8, 1, 2, 8, 11, P.coralDark);
  g.box(4, 6, 3, 9, 9, 4, P.mustard); // throw pillow
  g.box(5, 7, 3, 8, 8, 4, P.cream);
  return g;
}

export function buildCorkBoard(): VoxelGrid {
  const g = new VoxelGrid(1, 9, 13);
  g.box(0, 0, 0, 1, 9, 13, P.woodDark);
  g.box(0, 1, 1, 1, 8, 12, P.woodPale);
  const notes: [number, number, number][] = [[5, 2, P.mustard], [3, 6, P.mint], [6, 8, P.coral], [2, 9, P.skyLight]];
  for (const [y, z, c] of notes) g.box(0, y, z, 1, y + 2, z + 2, c);
  return g;
}

/** Product box (collectible). `hue` picks the cover color; `seed` the pixel logo. */
export function buildProductBox(cover: number, accent: number, seed: number): VoxelGrid {
  const g = new VoxelGrid(2, 6, 4);
  g.box(0, 0, 0, 2, 6, 4, cover);
  for (let i = 0; i < 4; i++) {
    const y = 2 + ((seed >> i) & 1) * 2 + (i % 2);
    const z = i;
    g.set(1, Math.min(5, y), z, accent);
  }
  g.box(1, 0, 0, 2, 1, 4, P.white);
  return g;
}
