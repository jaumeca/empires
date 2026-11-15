import { P } from '../palette';
import { VoxelGrid } from '../voxel';
import {
  buildArmchair, buildBookshelf, buildChair, buildDesk, buildDeskLamp, buildKeyboard, buildMonitor, buildMug, buildPlant,
} from './furniture';

/**
 * Voxel models for the office catalog (LS.2), built at rot 0: origin at the
 * footprint corner, front facing +z. Original, code-defined (D-014, D-017),
 * same palette and scale as the starting room (D-032).
 */
export interface ModelPart {
  grid: VoxelGrid;
  /** Offset of the grid inside the item, in voxels. */
  at: [number, number, number];
}

export interface ItemModel {
  parts: ModelPart[];
  /** Desks: where computers/chairs attach (voxels, item-local). */
  anchor?: { monitorX: number; chairX: number };
  /** Point light (voxels, item-local), e.g. a lamp. */
  light?: [number, number, number];
}

/** Swaps x and z (turns a model built with its front on +x into one facing +z). */
function transposeXZ(g: VoxelGrid): VoxelGrid {
  const out = new VoxelGrid(g.sz, g.sy, g.sx);
  for (let z = 0; z < g.sz; z++) for (let y = 0; y < g.sy; y++) for (let x = 0; x < g.sx; x++) out.set(z, y, x, g.get(x, y, z));
  return out;
}

function deskWide(): VoxelGrid {
  const g = new VoxelGrid(36, 10, 12);
  g.box(0, 8, 0, 36, 10, 12, P.woodDark);
  g.box(0, 9, 0, 36, 10, 12, P.woodMid);
  for (const x of [0, 34]) { g.box(x, 0, 1, x + 2, 8, 3, P.woodDeep); g.box(x, 0, 9, x + 2, 8, 11, P.woodDeep); }
  g.box(2, 1, 1, 10, 8, 11, P.woodDark); // left drawers
  g.box(5, 4, 11, 7, 5, 12, P.mustard);
  g.box(26, 1, 1, 34, 8, 11, P.woodDark); // right drawers
  g.box(29, 4, 11, 31, 5, 12, P.mustard);
  g.box(28, 10, 3, 33, 13, 8, P.leaf); // small cactus pot on the desk
  g.box(29, 10, 4, 32, 11, 7, P.terracotta);
  return g;
}

function dualMonitor(): VoxelGrid {
  const g = new VoxelGrid(24, 11, 4);
  for (const x0 of [0, 12]) {
    g.box(x0 + 4, 0, 0, x0 + 8, 1, 3, P.plastic);
    g.box(x0 + 5, 1, 1, x0 + 7, 3, 2, P.plastic);
    g.box(x0, 3, 1, x0 + 12, 11, 3, P.plastic);
  }
  return g;
}

function tower(): VoxelGrid {
  const g = new VoxelGrid(5, 11, 9);
  g.box(0, 0, 0, 5, 11, 9, P.plastic);
  g.box(0, 2, 8, 5, 3, 9, P.mint); // light strip
  g.box(0, 6, 8, 5, 7, 9, P.lavender);
  g.box(1, 8, 8, 4, 10, 9, P.metalDark);
  return g;
}

function bigMonitor(): VoxelGrid {
  const g = new VoxelGrid(16, 13, 4);
  g.box(6, 0, 0, 10, 1, 3, P.plasticLight);
  g.box(7, 1, 1, 9, 3, 2, P.plasticLight);
  g.box(0, 3, 1, 16, 13, 3, P.plasticLight);
  return g;
}

function tablet(): VoxelGrid {
  const g = new VoxelGrid(7, 1, 5);
  g.box(0, 0, 0, 7, 1, 5, P.plastic);
  g.box(1, 0, 1, 6, 1, 4, P.ink);
  g.set(6, 0, 4, P.coral); // stylus
  return g;
}

function chairErgo(): VoxelGrid {
  const g = new VoxelGrid(9, 18, 9);
  g.box(4, 0, 4, 5, 4, 5, P.metal);
  g.box(1, 0, 4, 8, 1, 5, P.metal);
  g.box(4, 0, 1, 5, 1, 8, P.metal);
  g.box(0, 4, 0, 9, 6, 9, P.plastic);
  g.box(1, 5, 1, 8, 6, 8, P.mintDark);
  g.box(0, 6, 7, 9, 15, 9, P.plastic); // tall back
  g.box(1, 7, 7, 8, 14, 8, P.mintDark);
  g.box(2, 15, 7, 7, 18, 9, P.plastic); // headrest
  g.box(0, 7, 2, 1, 8, 7, P.metalDark); // armrests
  g.box(8, 7, 2, 9, 8, 7, P.metalDark);
  return g;
}

function sofa(): VoxelGrid {
  const g = new VoxelGrid(24, 11, 11);
  g.box(1, 0, 1, 2, 2, 2, P.woodDeep); g.box(22, 0, 1, 23, 2, 2, P.woodDeep);
  g.box(1, 0, 9, 2, 2, 10, P.woodDeep); g.box(22, 0, 9, 23, 2, 10, P.woodDeep);
  g.box(0, 2, 0, 24, 5, 11, P.fabricBlueDark);
  g.box(2, 5, 3, 12, 6, 11, P.fabricBlue); // two seat cushions
  g.box(12, 5, 3, 22, 6, 11, P.fabricBlue);
  g.box(12, 5, 3, 13, 6, 11, P.fabricBlueDark);
  g.box(0, 2, 0, 24, 11, 3, P.fabricBlue); // back
  g.box(1, 10, 0, 23, 11, 2, P.fabricBlueDark);
  g.box(0, 2, 0, 2, 8, 11, P.fabricBlue); g.box(22, 2, 0, 24, 8, 11, P.fabricBlue); // arms
  g.box(3, 6, 3, 8, 9, 4, P.coral); g.box(16, 6, 3, 21, 9, 4, P.mustard); // pillows
  return g;
}

function coffeeMachine(): VoxelGrid {
  const g = new VoxelGrid(12, 17, 6);
  g.box(0, 0, 0, 12, 9, 6, P.woodMid); // cabinet
  g.box(0, 8, 0, 12, 9, 6, P.woodLight);
  g.box(1, 1, 5, 11, 7, 6, P.woodDark);
  g.box(5, 3, 5, 7, 4, 6, P.mustard);
  g.box(2, 9, 1, 8, 16, 5, P.metalDark); // machine
  g.box(3, 10, 4, 7, 15, 5, P.metal);
  g.box(4, 10, 4, 6, 11, 5, P.ink); // spout area
  g.set(5, 9, 4, P.white); // cup
  g.box(9, 9, 2, 11, 11, 4, P.coral); // mug
  g.box(2, 16, 2, 4, 17, 4, P.mint); // light
  return g;
}

function whiteboard(): VoxelGrid {
  const g = new VoxelGrid(18, 26, 4);
  g.box(1, 0, 1, 2, 26, 2, P.metal); g.box(16, 0, 1, 17, 26, 2, P.metal); // stand
  g.box(0, 0, 0, 4, 1, 4, P.metalDark); g.box(14, 0, 0, 18, 1, 4, P.metalDark);
  g.box(0, 9, 2, 18, 26, 3, P.metal); // frame
  g.box(1, 10, 2, 17, 25, 3, P.white); // board
  // Original doodles: a flow chart and a tiny robot.
  g.box(3, 21, 2, 7, 23, 3, P.sky); g.box(9, 21, 2, 13, 23, 3, P.coral); g.box(7, 22, 2, 9, 23, 3, P.ink);
  g.box(5, 16, 2, 6, 21, 3, P.ink); g.box(3, 14, 2, 7, 16, 3, P.mint);
  g.box(11, 13, 2, 14, 17, 3, P.lavender); g.set(12, 15, 2, P.ink); g.set(13, 15, 2, P.ink);
  g.box(2, 9, 3, 16, 10, 4, P.metalDark); // marker tray
  g.set(4, 10, 3, P.coral); g.set(6, 10, 3, P.sky);
  return g;
}

function plantTall(): VoxelGrid {
  const g = new VoxelGrid(12, 30, 12);
  g.box(3, 0, 3, 9, 8, 9, P.cream);
  g.box(2, 7, 2, 10, 9, 10, P.wallShade);
  g.box(3, 8, 3, 9, 9, 9, P.woodDeep);
  g.box(5, 9, 5, 7, 22, 7, P.woodDark); // trunk
  const leaves: [number, number, number, number, number, number][] = [
    [2, 18, 2, 10, 24, 10], [0, 22, 3, 5, 27, 8], [7, 21, 4, 12, 27, 9], [3, 24, 0, 9, 29, 5], [3, 24, 7, 9, 30, 12], [4, 27, 4, 8, 30, 8],
  ];
  leaves.forEach(([x0, y0, z0, x1, y1, z1], i) =>
    g.box(x0, y0, z0, x1, y1, z1, (x, y, z) => ((x + y + z + i) % 3 === 0 ? P.leafDark : (x * z + y) % 4 === 0 ? P.leafLight : P.leaf)),
  );
  return g;
}

function lampFloor(): VoxelGrid {
  const g = new VoxelGrid(6, 27, 6);
  g.box(0, 0, 0, 6, 1, 6, P.woodDeep);
  g.box(2, 1, 2, 4, 21, 4, P.woodDark);
  g.box(0, 20, 0, 6, 27, 6, P.cream); // shade
  g.box(1, 19, 1, 5, 20, 5, P.amberGlow); // glow underneath
  g.box(0, 26, 0, 6, 27, 6, P.wallShade);
  return g;
}

function arcade(): VoxelGrid {
  const g = new VoxelGrid(12, 28, 12);
  g.box(1, 0, 1, 11, 28, 11, P.lavender);
  g.box(1, 0, 10, 11, 12, 12, P.lavender); // control panel base sticks out
  g.box(2, 12, 9, 10, 14, 12, P.ink); // control deck
  g.set(4, 14, 10, P.coral); g.set(7, 14, 10, P.mint); g.set(8, 14, 10, P.mustard);
  g.box(2, 15, 10, 10, 24, 11, P.ink); // screen frame
  g.box(3, 16, 10, 9, 23, 11, (x, y) => ((x + y) % 3 === 0 ? P.mint : y > 20 ? P.sky : P.fabricBlueDark));
  g.box(1, 24, 9, 11, 28, 11, P.coral); // marquee
  g.box(3, 25, 10, 9, 27, 11, P.mustard);
  g.box(1, 0, 1, 2, 28, 11, P.fabricBlueDark); g.box(10, 0, 1, 11, 28, 11, P.fabricBlueDark); // side art
  return g;
}

function serverRack(): VoxelGrid {
  const g = new VoxelGrid(12, 26, 6);
  g.box(0, 0, 0, 12, 26, 6, P.plastic);
  for (let y = 2; y < 25; y += 4) { g.box(1, y, 5, 11, y + 3, 6, P.metalDark); g.set(2, y + 1, 5, P.mint); g.set(4, y + 1, 5, y % 8 ? P.coral : P.mint); }
  return g;
}

function rug(): VoxelGrid {
  const g = new VoxelGrid(24, 1, 18);
  g.box(0, 0, 0, 24, 1, 18, (x, _y, z) => {
    if (x === 0 || z === 0 || x === 23 || z === 17) return P.rugA;
    if (x === 2 || z === 2 || x === 21 || z === 15) return P.rugC;
    return (Math.floor(x / 3) + Math.floor(z / 3)) % 2 === 0 ? P.rugB : P.cream;
  });
  return g;
}

/** Desk mounts: computer models (desk-local, relative to `anchor.monitorX`). */
export function computerModel(id: string): { parts: ModelPart[]; screen: { x: number; y: number; z: number; w: number; h: number } } {
  switch (id) {
    case 'pc_dev':
      return { parts: [{ grid: dualMonitor(), at: [-6, 10, 2] }, { grid: buildKeyboard(), at: [2, 10, 7] }], screen: { x: 0, y: 17, z: 5.02, w: 10, h: 6 } };
    case 'pc_workstation':
      return { parts: [{ grid: buildMonitor(), at: [0, 10, 2] }, { grid: buildKeyboard(), at: [2, 10, 7] }, { grid: tower(), at: [13, 10, 1] }], screen: { x: 6, y: 17, z: 5.02, w: 10, h: 6 } };
    case 'pc_creative':
      return { parts: [{ grid: bigMonitor(), at: [-2, 10, 2] }, { grid: tablet(), at: [3, 10, 7] }], screen: { x: 6, y: 18, z: 5.02, w: 14, h: 8 } };
    default:
      return { parts: [{ grid: buildMonitor(), at: [0, 10, 2] }, { grid: buildKeyboard(), at: [2, 10, 7] }], screen: { x: 6, y: 17, z: 5.02, w: 10, h: 6 } };
  }
}

export function chairModel(id: string): ModelPart[] {
  return [{ grid: id === 'chair_ergo' ? chairErgo() : buildChair(), at: [0, 0, 12] }];
}

let shelfCache: VoxelGrid | null = null;

export function itemModel(model: string): ItemModel {
  switch (model) {
    case 'desk_basic':
      return { parts: [{ grid: buildDesk(), at: [0, 0, 0] }, { grid: buildDeskLamp(), at: [1, 10, 1] }, { grid: buildMug(), at: [19, 10, 5] }], anchor: { monitorX: 6, chairX: 8 }, light: [4, 19, 3] };
    case 'desk_wide':
      return { parts: [{ grid: deskWide(), at: [0, 0, 0] }, { grid: buildDeskLamp(), at: [1, 10, 1] }, { grid: buildMug(), at: [24, 10, 6] }], anchor: { monitorX: 12, chairX: 14 }, light: [4, 19, 3] };
    case 'armchair':
      return { parts: [{ grid: buildArmchair(), at: [0, 0, 0] }] };
    case 'sofa':
      return { parts: [{ grid: sofa(), at: [0, 0, 0] }] };
    case 'coffee_machine':
      return { parts: [{ grid: coffeeMachine(), at: [0, 0, 0] }] };
    case 'whiteboard':
      return { parts: [{ grid: whiteboard(), at: [0, 0, 1] }] };
    case 'plant_small':
      return { parts: [{ grid: buildPlant(), at: [-0.5, 0, -0.5] }] };
    case 'plant_tall':
      return { parts: [{ grid: plantTall(), at: [0, 0, 0] }] };
    case 'lamp_floor':
      return { parts: [{ grid: lampFloor(), at: [0, 0, 0] }], light: [3, 20, 3] };
    case 'rug_checker':
      return { parts: [{ grid: rug(), at: [0, 0, 0] }] };
    case 'arcade':
      return { parts: [{ grid: arcade(), at: [0, 0, 0] }] };
    case 'bookshelf':
      shelfCache ??= transposeXZ(buildBookshelf());
      return { parts: [{ grid: shelfCache, at: [1, 0, 0] }] };
    case 'server_rack':
      return { parts: [{ grid: serverRack(), at: [0, 0, 0] }] };
    default:
      return { parts: [] };
  }
}

