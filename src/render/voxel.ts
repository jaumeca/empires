import { BufferAttribute, BufferGeometry, Color } from 'three';
import { PALETTE_HEX } from './palette';

/** World units per voxel: one floor cell (1 unit) = 12 voxels (ART_DIRECTION §4.2). */
export const VOXEL = 1 / 12;

/** Dense voxel grid storing palette indices (0 = empty). */
export class VoxelGrid {
  readonly data: Uint8Array;
  constructor(
    readonly sx: number,
    readonly sy: number,
    readonly sz: number,
  ) {
    this.data = new Uint8Array(sx * sy * sz);
  }
  private idx(x: number, y: number, z: number): number {
    return x + this.sx * (y + this.sy * z);
  }
  inside(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }
  get(x: number, y: number, z: number): number {
    return this.inside(x, y, z) ? (this.data[this.idx(x, y, z)] ?? 0) : 0;
  }
  set(x: number, y: number, z: number, c: number): this {
    if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = c;
    return this;
  }
  /** Fills the half-open box [x0,x1) × [y0,y1) × [z0,z1). */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number | ((x: number, y: number, z: number) => number)): this {
    for (let z = z0; z < z1; z++)
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) this.set(x, y, z, typeof c === 'number' ? c : c(x, y, z));
    return this;
  }
  count(): number {
    let n = 0;
    for (const v of this.data) if (v) n++;
    return n;
  }
}

// Face definitions: normal, and 4 corner offsets (CCW seen from outside).
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const;

const AO_CURVE = [1.0, 0.8, 0.66, 0.52];

export interface MeshOptions {
  /** Voxel-space point that becomes the local origin (pivot). */
  origin?: [number, number, number];
  /** Per-voxel brightness jitter (0..1) for a hand-made look. */
  jitter?: number;
  /** Skip faces pointing in these directions (e.g. never-visible undersides). */
  skipBottom?: boolean;
}

const tmpColor = new Color();

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Builds a BufferGeometry with face culling, per-vertex ambient occlusion and
 * vertex colors. Simple (non-greedy) meshing: our models are small and AO looks
 * best per voxel. See ARCHITECTURE §6.2.
 */
export function meshVoxels(grid: VoxelGrid, opts: MeshOptions = {}): BufferGeometry {
  const [ox, oy, oz] = opts.origin ?? [0, 0, 0];
  const jitter = opts.jitter ?? 0.04;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const solid = (x: number, y: number, z: number) => grid.get(x, y, z) !== 0;

  for (let z = 0; z < grid.sz; z++)
    for (let y = 0; y < grid.sy; y++)
      for (let x = 0; x < grid.sx; x++) {
        const c = grid.get(x, y, z);
        if (!c) continue;
        tmpColor.setHex(PALETTE_HEX[c] ?? 0xff00ff);
        const j = 1 + (hash3(x, y, z) - 0.5) * 2 * jitter;
        for (const f of FACES) {
          const [nx, ny, nz] = f.n;
          if (opts.skipBottom && ny === -1) continue;
          if (solid(x + nx, y + ny, z + nz)) continue;
          const base = pos.length / 3;
          const ao: number[] = [];
          for (const [cx, cy, cz] of f.c) {
            // Neighbors in the plane in front of the face, around this corner.
            const px = x + nx, py = y + ny, pz = z + nz;
            const dx = cx === 1 ? 1 : -1, dy = cy === 1 ? 1 : -1, dz = cz === 1 ? 1 : -1;
            let s1: boolean, s2: boolean, cr: boolean;
            if (nx !== 0) {
              s1 = solid(px, py + dy, pz); s2 = solid(px, py, pz + dz); cr = solid(px, py + dy, pz + dz);
            } else if (ny !== 0) {
              s1 = solid(px + dx, py, pz); s2 = solid(px, py, pz + dz); cr = solid(px + dx, py, pz + dz);
            } else {
              s1 = solid(px + dx, py, pz); s2 = solid(px, py + dy, pz); cr = solid(px + dx, py + dy, pz);
            }
            const level = s1 && s2 ? 3 : (s1 ? 1 : 0) + (s2 ? 1 : 0) + (cr ? 1 : 0);
            const a = (AO_CURVE[level] ?? 1) * j;
            ao.push(a);
            pos.push((x + cx - ox) * VOXEL, (y + cy - oy) * VOXEL, (z + cz - oz) * VOXEL);
            nor.push(nx, ny, nz);
            col.push(tmpColor.r * a, tmpColor.g * a, tmpColor.b * a);
          }
          // Flip the quad diagonal to avoid AO anisotropy artifacts.
          if ((ao[0] ?? 0) + (ao[2] ?? 0) > (ao[1] ?? 0) + (ao[3] ?? 0)) {
            idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          } else {
            idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          }
        }
      }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
