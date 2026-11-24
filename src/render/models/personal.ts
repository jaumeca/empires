import { P } from '../palette';
import { VoxelGrid } from '../voxel';
import type { TraitId } from '../../sim/model/state';

/**
 * Personal things on each desk (0.18.0, "la oficina como un pequeño mundo").
 * Purely decorative: what sits on someone's desk says who they are. Original
 * voxel models made in code (ASSET_REGISTRY).
 */

/** Perfectionist: a neat stack of papers with a pen lined up beside it. */
function paperStack(): VoxelGrid {
  const g = new VoxelGrid(5, 3, 4);
  g.box(0, 0, 0, 3, 1, 4, P.white);
  g.box(0, 1, 0, 3, 2, 4, P.cream);
  g.box(0, 2, 0, 3, 3, 4, P.white);
  g.box(4, 0, 0, 5, 1, 4, P.sky); // pen
  return g;
}

/** Curious: a tiny globe on its stand. */
function globe(): VoxelGrid {
  const g = new VoxelGrid(3, 5, 3);
  g.box(0, 0, 0, 3, 1, 3, P.woodDark);
  g.set(1, 1, 1, P.metalDark);
  g.box(0, 2, 0, 3, 5, 3, P.sky);
  g.set(0, 3, 1, P.leaf); g.set(1, 4, 0, P.leaf); g.set(2, 2, 2, P.leaf); g.set(1, 3, 2, P.leafDark);
  return g;
}

/** Sociable: a photo of friends in a little frame. */
function photoFrame(): VoxelGrid {
  const g = new VoxelGrid(4, 4, 2);
  g.box(0, 0, 0, 4, 4, 1, P.mustard);
  g.box(1, 1, 0, 3, 3, 1, P.skyLight);
  g.set(1, 1, 0, P.coral); g.set(2, 1, 0, P.mint);
  g.set(1, 0, 1, P.mustard); g.set(2, 0, 1, P.mustard); // foot
  return g;
}

/** Night owl: a can of something with far too much caffeine. */
function energyCan(): VoxelGrid {
  const g = new VoxelGrid(2, 4, 2);
  g.box(0, 0, 0, 2, 4, 2, P.lavender);
  g.box(0, 2, 0, 2, 3, 2, P.mustard);
  g.box(0, 3, 0, 2, 4, 2, P.metal);
  return g;
}

/** Everyone else (and the founder): a small cactus. */
function cactus(): VoxelGrid {
  const g = new VoxelGrid(3, 5, 3);
  g.box(0, 0, 0, 3, 2, 3, P.terracotta);
  g.box(1, 2, 1, 2, 5, 2, P.leaf);
  g.set(0, 3, 1, P.leafDark);
  g.set(2, 4, 1, P.leafDark);
  return g;
}

export function personalItem(trait: TraitId | undefined): VoxelGrid {
  switch (trait) {
    case 'perfectionist': return paperStack();
    case 'curious': return globe();
    case 'sociable': return photoFrame();
    case 'night_owl': return energyCan();
    default: return cactus();
  }
}
