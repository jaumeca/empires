import { P } from '../palette';
import { VoxelGrid } from '../voxel';
import { productBox, type ProductArt } from '../productArt';

/**
 * New decoration and physical memories (0.19.0). Original voxel models made in
 * code (ASSET_REGISTRY). Front is +z at rot 0. A floor cell is 6 voxels.
 */

/** A retro console under a small CRT TV on a low cabinet. 2×1 cells (12×6). */
export function retroConsole(): VoxelGrid {
  const g = new VoxelGrid(12, 14, 5);
  g.box(0, 0, 0, 12, 5, 5, P.woodDark); // low cabinet
  g.box(1, 1, 4, 5, 4, 5, P.woodMid); g.box(7, 1, 4, 11, 4, 5, P.woodMid); // doors
  g.box(1, 5, 0, 9, 13, 4, P.plastic); // TV body
  g.box(2, 6, 3, 8, 12, 4, P.ink); // screen
  g.box(3, 8, 3, 5, 11, 4, P.sky); g.box(5, 7, 3, 7, 9, 4, P.mint); // a game on it
  g.box(8, 13, 1, 9, 14, 2, P.metalDark); // antenna
  g.box(9, 5, 1, 12, 6, 4, P.lavender); // console beside the TV
  g.set(10, 6, 3, P.coral); g.set(11, 6, 3, P.mint);
  return g;
}

/** A little shelf of figures (a robot, a pirate, a kart). 1×1 cell (6×6). */
export function figureShelf(): VoxelGrid {
  const g = new VoxelGrid(6, 14, 4);
  g.box(0, 0, 0, 6, 1, 4, P.woodDark);
  g.box(0, 0, 0, 1, 14, 4, P.woodDark); g.box(5, 0, 0, 6, 14, 4, P.woodDark);
  g.box(0, 0, 0, 6, 14, 1, P.woodDeep); // back
  g.box(0, 6, 0, 6, 7, 4, P.woodMid); g.box(0, 13, 0, 6, 14, 4, P.woodMid);
  g.box(1, 7, 1, 3, 9, 3, P.metal); g.box(1, 9, 1, 3, 11, 3, P.lavender); g.set(2, 10, 3 - 1, P.mint); // robot
  g.box(3, 7, 1, 5, 9, 3, P.coral); g.box(3, 9, 1, 5, 11, 3, P.cream); g.box(3, 11, 1, 5, 12, 3, P.ink); // pirate
  g.box(1, 1, 1, 5, 3, 4, P.coral); g.set(1, 1, 3, P.ink); g.set(4, 1, 3, P.ink); g.box(2, 3, 2, 3, 5, 3, P.mustard); // kart
  return g;
}

/** A pile of books on the floor, with a mug on top. 1×1 cell. */
export function bookStack(): VoxelGrid {
  const g = new VoxelGrid(5, 9, 4);
  const colors = [P.coral, P.sky, P.mustard, P.leaf];
  let y = 0;
  for (let i = 0; i < 4; i++) {
    const inset = i % 2;
    g.box(inset, y, 0, 5 - (1 - inset), y + 2, 4, colors[i]!);
    g.box(inset, y, 3, 5 - (1 - inset), y + 2, 4, P.cream); // page edges
    y += 2;
  }
  g.box(2, 8, 1, 3, 9, 2, P.white); // mug
  return g;
}

/** A big monstera in a wicker basket. 2×2 cells (12×12). */
export function monstera(): VoxelGrid {
  const g = new VoxelGrid(12, 22, 12);
  g.box(3, 0, 3, 9, 6, 9, P.woodPale);
  for (let x = 3; x < 9; x += 2) g.box(x, 1, 3, x + 1, 5, 4, P.woodMid); // weave
  const leaf = (cx: number, y: number, cz: number, r: number) => {
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const gx = cx + x, gz = cz + z;
      if (gx < 0 || gz < 0 || gx > 11 || gz > 11) continue;
      if (x * x + z * z <= r * r && (x + z) % 3 !== 0) g.set(gx, y, gz, (x + z) % 2 ? P.leaf : P.leafDark);
    }
  };
  for (let y = 6; y < 16; y++) g.set(6, y, 6, P.leafDark);
  leaf(3, 12, 4, 3); leaf(9, 15, 5, 3); leaf(5, 18, 9, 3); leaf(8, 20, 3, 2); leaf(3, 16, 2, 2);
  return g;
}

/** First release (achievement): the cover of the studio's very first game, framed. 1×1 cell. */
export function framedCover(art: ProductArt | null): VoxelGrid {
  const g = new VoxelGrid(6, 13, 3);
  g.box(1, 0, 0, 5, 2, 3, P.woodDark); // stand
  g.box(0, 2, 1, 6, 13, 2, P.mustard); // gold frame
  g.box(1, 3, 1, 5, 12, 2, P.cream);
  if (art) {
    // The real box front, fitted into the frame (4 wide, 9 tall).
    const box = productBox(art);
    const W = box.sz, H = box.sy;
    for (let y = 0; y < 9; y++) for (let x = 0; x < 4; x++) {
      const c = box.get(1, Math.min(H - 1, Math.floor(((y + 0.5) / 9) * H)), Math.min(W - 1, Math.floor(((x + 0.5) / 4) * W)));
      if (c) g.set(1 + x, 3 + y, 1, c);
    }
  }
  return g;
}

/** Ten games released (achievement): a golden game cartridge on a plinth. 1×1 cell. */
export function goldCartridge(): VoxelGrid {
  const g = new VoxelGrid(6, 13, 4);
  g.box(0, 0, 0, 6, 3, 4, P.woodDeep);
  g.box(1, 3, 1, 5, 12, 3, P.mustard);
  g.box(2, 8, 1, 4, 11, 2, P.cream); // label
  g.box(2, 3, 1, 4, 4, 2, P.amberGlow); // contacts
  g.set(2, 9, 1, P.coral); g.set(3, 10, 1, P.mint);
  return g;
}

/** First content update (achievement): a cork board full of fan letters and drawings. 2×1 cells. */
export function fanBoard(): VoxelGrid {
  const g = new VoxelGrid(12, 17, 3);
  g.box(1, 0, 1, 2, 7, 2, P.woodDark); g.box(10, 0, 1, 11, 7, 2, P.woodDark); // legs
  g.box(0, 7, 0, 12, 17, 2, P.woodMid);
  g.box(1, 8, 1, 11, 16, 2, P.terracotta);
  const notes: [number, number, number][] = [[2, 9, P.white], [5, 12, P.mustard], [8, 9, P.sky], [8, 13, P.white], [2, 13, P.coral], [5, 9, P.mint]];
  for (const [x, y, c] of notes) { g.box(x, y, 1, x + 2, y + 2, 2, c); g.set(x, y + 1, 2, P.coralDark); }
  return g;
}

/** The game cabinet (0.19.0): three shelves for game boxes, a mustard trim. 4×1 cells (24×6). */
export function gameCabinet(): VoxelGrid {
  const g = new VoxelGrid(22, 30, 5);
  g.box(0, 0, 0, 22, 30, 1, P.woodDeep); // back
  g.box(0, 0, 0, 1, 30, 5, P.woodDark); // sides
  g.box(21, 0, 0, 22, 30, 5, P.woodDark);
  for (const y of [0, 10, 20]) g.box(0, y, 0, 22, y + 1, 5, P.woodMid); // shelves
  g.box(0, 29, 0, 22, 30, 5, P.mustard); // top trim
  return g;
}

// ---------------------------------------------------------------- 0.22.0: functional furniture

/** A round-cornered meeting table with two stools at the short ends. 3×2 cells (18×12). */
export function meetingTable(): VoxelGrid {
  const g = new VoxelGrid(18, 9, 12);
  g.box(3, 7, 2, 15, 8, 10, P.woodMid); // top
  g.box(4, 8, 3, 14, 9, 9, P.woodLight);
  g.box(8, 0, 5, 10, 7, 7, P.woodDark); // central leg
  g.box(6, 0, 4, 12, 1, 8, P.woodDark); // foot
  // a laptop and some sticky notes on it
  g.box(5, 9, 4, 8, 9 + 0, 6, P.metalDark);
  g.set(11, 8, 6, P.mustard); g.set(12, 8, 4, P.coral);
  // stools at both ends
  for (const x of [0, 16]) { g.box(x, 0, 5, x + 2, 4, 7, P.metalDark); g.box(x, 4, 4, x + 2, 5, 8, P.fabricBlue); }
  return g;
}

/** A corner TV on a low unit with a games console. 2×1 cells. */
export function tvCorner(): VoxelGrid {
  const g = new VoxelGrid(12, 13, 5);
  g.box(0, 0, 0, 12, 4, 5, P.woodPale);
  g.box(1, 1, 4, 11, 3, 5, P.woodMid);
  g.box(1, 5, 1, 11, 12, 2, P.ink); // flat screen
  g.box(2, 6, 1, 10, 11, 2, P.skyLight); g.box(3, 7, 1, 6, 9, 2, P.mint); // a nature documentary
  g.box(5, 4, 1, 7, 5, 2, P.metalDark); // stand
  g.box(8, 4, 2, 11, 5, 4, P.white); // console
  return g;
}

/** A tall arc lamp. 1×1 cell. */
export function arcLamp(): VoxelGrid {
  const g = new VoxelGrid(6, 20, 6);
  g.box(1, 0, 1, 5, 1, 5, P.metalDark);
  g.box(2, 1, 2, 3, 16, 3, P.metal);
  g.box(2, 16, 2, 5, 17, 3, P.metal);
  g.box(3, 13, 2, 6, 16, 4, P.mustard); // shade
  g.box(4, 12, 3, 5, 13, 4, P.amberGlow);
  return g;
}

/** A tall cupboard with two doors and a plant on top. 2×1 cells. */
export function tallCabinet(): VoxelGrid {
  const g = new VoxelGrid(12, 24, 5);
  g.box(0, 0, 0, 12, 20, 5, P.woodMid);
  g.box(1, 1, 4, 6, 19, 5, P.woodLight); g.box(6, 1, 4, 11, 19, 5, P.woodLight);
  g.set(5, 10, 4, P.metalDark); g.set(6, 10, 4, P.metalDark);
  g.box(4, 20, 1, 8, 22, 4, P.terracotta); g.box(5, 22, 2, 7, 24, 3, P.leaf);
  return g;
}
