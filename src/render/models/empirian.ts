import type { Appearance } from '../../sim/model/state';
import {
  CLOTH_COLORS, CLOTH_SHADES, HAIR_COLORS, HAIR_SHADES, P, PANTS_COLORS, SKIN_SHADES, SKIN_TONES,
} from '../palette';
import { VoxelGrid } from '../voxel';

/**
 * Modular Empirian (ART_DIRECTION §3, §8.1): rigid skeleton + interchangeable
 * voxel parts + palette. Proportions: head 10×10×9, torso 8×6×5, arms 2×5×2,
 * legs 3×4×3 + shoes. Total height ≈ 21 voxels, head ≈ 45 %.
 */

export interface PartDef {
  grid: VoxelGrid;
  /** Pivot inside the grid, in voxels. */
  origin: [number, number, number];
}

export interface EmpirianParts {
  head: PartDef;
  hair: PartDef; // also holds hats, glasses, beards, headphones
  torso: PartDef;
  armL: PartDef;
  armR: PartDef;
  legL: PartDef;
  legR: PartDef;
}

/** Skeleton offsets in voxels (child relative to parent pivot). */
export const SKELETON = {
  hipsY: 5,
  legX: 2.5,
  torsoTop: 6,
  armX: 5,
  armY: 6,
  headY: 6,
  faceZ: 4.5,
} as const;

const pickIdx = (list: number[], i: number) => list[((i % list.length) + list.length) % list.length] ?? list[0]!;

export function partColors(a: Appearance) {
  return {
    skin: pickIdx(SKIN_TONES, a.skin),
    skinShade: pickIdx(SKIN_SHADES, a.skin),
    hair: pickIdx(HAIR_COLORS, a.hairColor),
    hairShade: pickIdx(HAIR_SHADES, a.hairColor),
    cloth: pickIdx(CLOTH_COLORS, a.topColor),
    clothShade: pickIdx(CLOTH_SHADES, a.topColor),
    pants: pickIdx(PANTS_COLORS, a.pantsColor),
  };
}

export function buildEmpirianParts(a: Appearance): EmpirianParts {
  const c = partColors(a);

  // Head: a slightly shaded cube; the face is a separate decal plane.
  const head = new VoxelGrid(10, 10, 9);
  head.box(0, 0, 0, 10, 10, 9, (x, y, z) => ((y === 0 && (x === 0 || x === 9)) || (z === 0 && y === 0) ? c.skinShade : c.skin));

  // Torso varies with the top.
  const torso = new VoxelGrid(8, 7, 5);
  torso.box(0, 0, 0, 8, 6, 5, c.cloth);
  torso.box(0, 0, 0, 8, 1, 5, c.clothShade); // hem
  const top = ((a.top % 5) + 5) % 5;
  if (top === 0) {
    torso.box(3, 5, 4, 5, 6, 5, c.skin); // neckline
  } else if (top === 1) {
    torso.box(1, 6, 0, 7, 7, 2, c.clothShade); // hood bump behind the neck
    torso.box(2, 1, 4, 6, 3, 5, c.clothShade); // front pocket
    torso.box(3, 3, 4, 4, 5, 5, P.cream); // drawstrings
    torso.box(4, 3, 4, 5, 5, 5, P.cream);
  } else if (top === 2) {
    torso.box(2, 5, 4, 6, 6, 5, P.white); // collar
    torso.box(4, 1, 4, 5, 5, 5, P.cream); // buttons line
  } else if (top === 3) {
    torso.box(0, 1, 0, 8, 6, 5, (_x, y) => (y % 2 === 0 ? c.cloth : P.cream));
    torso.box(3, 5, 4, 5, 6, 5, c.skin);
  } else {
    torso.box(3, 0, 4, 5, 6, 5, P.cream); // open jacket, inner shirt
    torso.box(0, 0, 4, 1, 6, 5, c.clothShade);
    torso.box(7, 0, 4, 8, 6, 5, c.clothShade);
  }
  torso.set(1, 4, 4, P.mustard); // tiny badge (role pin)

  const shortSleeves = top === 0 || top === 3;
  const arm = (): VoxelGrid => {
    const g = new VoxelGrid(2, 5, 2);
    g.box(0, 0, 0, 2, 5, 2, (_x, y) => {
      if (y === 0) return c.skin; // hand
      if (shortSleeves) return y >= 3 ? (top === 3 ? P.cream : c.cloth) : c.skin;
      return y === 1 ? c.clothShade : c.cloth;
    });
    return g;
  };

  const leg = (): VoxelGrid => {
    const g = new VoxelGrid(3, 5, 4);
    g.box(0, 0, 0, 3, 1, 4, P.ink); // shoe, sticks out to the front (+z)
    g.box(0, 0, 3, 3, 1, 4, P.white);
    g.box(0, 1, 0, 3, 5, 3, c.pants);
    return g;
  };

  return {
    head: { grid: head, origin: [5, 0, 4.5] },
    hair: { grid: buildHair(a, c), origin: [7, 4, 6.5] },
    torso: { grid: torso, origin: [4, 0, 2.5] },
    armL: { grid: arm(), origin: [1, 5, 1] },
    armR: { grid: arm(), origin: [1, 5, 1] },
    legL: { grid: leg(), origin: [1.5, 5, 1.5] },
    legR: { grid: leg(), origin: [1.5, 5, 1.5] },
  };
}

/**
 * Hair + head accessories. Grid 14×19×13; the head occupies x 2..12, y 4..14,
 * z 2..11 (face plane at z = 11). Helpers below use head-relative coordinates.
 */
function buildHair(a: Appearance, c: ReturnType<typeof partColors>): VoxelGrid {
  const g = new VoxelGrid(14, 19, 13);
  const H = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: number) =>
    g.box(x0, y0 + 4, z0, x1, y1 + 4, z1, col);
  const hc = c.hair, hs = c.hairShade;
  const style = ((a.hairStyle % 8) + 8) % 8;
  const acc = ((a.accessory % 6) + 6) % 6;
  const hasCap = acc === 3;

  const cap = (yTop: number) => {
    H(1, 10, 1, 13, yTop, 12, hc);
    H(1, 10, 1, 13, 11, 2, hs); // darker band at the back for depth
  };

  if (!hasCap) {
    switch (style) {
      case 0: // short, side part
        cap(12);
        H(1, 7, 1, 2, 10, 10, hc); H(12, 7, 1, 13, 10, 10, hc); H(1, 5, 1, 13, 10, 2, hc);
        H(2, 9, 11, 9, 10, 12, hc); H(2, 10, 11, 12, 11, 12, hc);
        break;
      case 1: // bowl fringe
        cap(12);
        H(1, 5, 1, 2, 10, 11, hc); H(12, 5, 1, 13, 10, 11, hc); H(1, 3, 1, 13, 10, 2, hc);
        H(2, 8, 11, 12, 11, 12, hc); H(2, 8, 11, 12, 9, 12, hs);
        break;
      case 2: // spikes
        cap(11);
        H(1, 7, 1, 2, 10, 9, hc); H(12, 7, 1, 13, 10, 9, hc); H(1, 6, 1, 13, 10, 2, hc);
        for (let i = 0; i < 5; i++) H(2 + i * 2, 11, 3 + (i % 2) * 3, 4 + i * 2, 13 + (i % 2), 5 + (i % 2) * 3, i % 2 ? hc : hs);
        H(2, 9, 11, 12, 10, 12, hc);
        break;
      case 3: // long
        cap(12);
        H(1, -3, 1, 2, 10, 11, hc); H(12, -3, 1, 13, 10, 11, hc); H(1, -4, 0, 13, 10, 2, hc);
        H(2, 9, 11, 12, 11, 12, hc); H(5, 8, 11, 7, 9, 12, hc);
        break;
      case 4: // bun
        cap(12);
        H(1, 6, 1, 2, 10, 10, hc); H(12, 6, 1, 13, 10, 10, hc); H(1, 4, 1, 13, 10, 2, hc);
        H(5, 12, 3, 9, 15, 7, hc); H(5, 12, 3, 9, 13, 7, P.coral);
        H(2, 10, 11, 12, 11, 12, hc);
        break;
      case 5: // afro
        H(0, 6, 0, 14, 15, 11, hc);
        H(1, 15, 1, 13, 15, 10, hs);
        H(0, 14, 0, 1, 15, 1, 0); H(13, 14, 0, 14, 15, 1, 0);
        H(1, 9, 11, 13, 13, 12, hc); H(0, 6, 11, 2, 12, 12, hc); H(12, 6, 11, 14, 12, 12, hc);
        H(2, 6, 2, 12, 10, 11, 0); // keep the head space empty
        H(2, 10, 2, 12, 11, 11, hc);
        break;
      case 6: // buzz cut
        H(1, 10, 1, 13, 11, 12, hs);
        H(1, 8, 1, 2, 10, 10, hs); H(12, 8, 1, 13, 10, 10, hs); H(1, 7, 1, 13, 10, 2, hs);
        break;
      case 7: // ponytail
        cap(12);
        H(1, 7, 1, 2, 10, 10, hc); H(12, 7, 1, 13, 10, 10, hc); H(1, 5, 1, 13, 10, 2, hc);
        H(6, 3, 0, 8, 9, 1, hc); H(6, 9, 0, 8, 10, 1, P.mint);
        H(2, 10, 11, 12, 11, 12, hc);
        break;
    }
  } else {
    // Cap: hair only peeks out on the sides/back.
    if (style !== 6) { H(1, 6, 1, 2, 9, 9, hc); H(12, 6, 1, 13, 9, 9, hc); H(1, 5, 1, 13, 9, 2, hc); }
    H(1, 9, 1, 13, 12, 12, P.coral);
    H(1, 12, 2, 13, 13, 11, P.coral);
    H(5, 13, 5, 7, 14, 7, P.white);
    H(2, 9, 12, 12, 10, 13, P.coralDark); // visor
  }

  // Face accessories in front of the face plane (z = 11).
  if (acc === 1 || acc === 5) {
    const frame = (x0: number) => {
      H(x0, 3, 11, x0 + 4, 4, 12, P.ink); H(x0, 6, 11, x0 + 4, 7, 12, P.ink);
      H(x0, 3, 11, x0 + 1, 7, 12, P.ink); H(x0 + 3, 3, 11, x0 + 4, 7, 12, P.ink);
    };
    frame(2); frame(8);
    H(6, 5, 11, 8, 6, 12, P.ink);
  }
  if (acc === 4 || acc === 5) {
    H(2, 0, 11, 12, 3, 12, hc);
    H(5, 1, 11, 9, 2, 12, 0); // mouth gap
    H(1, 0, 4, 2, 6, 11, hc); H(12, 0, 4, 13, 6, 11, hc);
  }
  if (acc === 2) {
    H(1, 13, 5, 13, 14, 7, P.plastic);
    H(0, 4, 4, 2, 9, 8, P.coral); H(12, 4, 4, 14, 9, 8, P.coral);
    H(0, 9, 5, 1, 13, 7, P.plastic); H(13, 9, 5, 14, 13, 7, P.plastic);
  }
  return g;
}
