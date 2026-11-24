import { ScreenDeck, type ScreenMode } from './screens';
import {
  Box3,
  BoxGeometry, BufferGeometry, CanvasTexture, Color, DirectionalLight, DynamicDrawUsage, Float32BufferAttribute, Group, HemisphereLight,
  InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, Object3D,
  OrthographicCamera, PCFSoftShadowMap, Plane, PlaneGeometry, PointLight, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { SimEvent } from '../sim/core/events';
import type { Activity, Appearance, GameState, Office, PlacedItem, Project, Rot } from '../sim/model/state';
import { blockedCells, founderDesk, getItemDef, rotatedSize, useSpot } from '../sim/systems/office';
import { OFFICE_GRID } from '../content/officeItems';
import { chairModel, computerModel, itemModel } from './models/catalogModels';
import { EmpirianView, VOXEL_MATERIAL, type Pose } from './empirianView';
import { BubbleSystem } from './bubbles';
import { buildCorkBoard, buildPoster, buildProductBox, buildRoomShell, ROOM } from './models/furniture';
import { CLOTH_COLORS, P, PALETTE_HEX } from './palette';
import { meshVoxels, VOXEL, type VoxelGrid } from './voxel';

export type CameraMode = 'iso' | 'dim';
export type TapTarget =
  | { kind: 'empirian'; id: string }
  | { kind: 'computer' | 'shelf' | 'poster' | 'plant' | 'window' | 'beanbag' | 'news' }
  | { kind: 'floor'; cell?: [number, number] }
  | { kind: 'item'; uid: string; cell?: [number, number] }
  | { kind: 'product'; id: string };

const CELL = OFFICE_GRID.cellVoxels;

const WALL = ROOM.wallT;
const FLOOR_Y = ROOM.floorT;
/** Floor-space voxel coordinates -> world position. */
const fw = (fx: number, fy: number, fz: number) => new Vector3((fx + WALL) * VOXEL, (fy + FLOOR_Y) * VOXEL, (fz + WALL) * VOXEL);

interface Poi {
  x: number;
  z: number;
  heading: number;
  pose: Pose;
}

const FIXED_POIS: Record<string, Poi> = {
  window: { x: 46, z: 15, heading: Math.PI, pose: 'think' },
  center: { x: 30, z: 31, heading: Math.PI * 0.25, pose: 'stand' },
};

/**
 * BFS over the office grid (1 cell = 6 voxels). The target cell may be blocked
 * (sofas, armchairs: you sit *in* them). Returns waypoints in floor voxels.
 */
export function findPath(from: [number, number], to: [number, number], blocked: Uint8Array, w: number, d: number): [number, number][] {
  const cell = (v: number, max: number) => Math.max(0, Math.min(max - 1, Math.floor(v / CELL)));
  const sx = cell(from[0], w), sz = cell(from[1], d), tx = cell(to[0], w), tz = cell(to[1], d);
  const idx = (x: number, z: number) => x + z * w;
  const prev = new Int32Array(w * d).fill(-2);
  prev[idx(sx, sz)] = -1;
  const queue = [idx(sx, sz)];
  for (let qi = 0; qi < queue.length; qi++) {
    const c = queue[qi]!;
    const x = c % w, z = Math.floor(c / w);
    if (x === tx && z === tz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue;
      const k = idx(nx, nz);
      if (prev[k] !== -2) continue;
      if (blocked[k] && !(nx === tx && nz === tz)) continue;
      prev[k] = c;
      queue.push(k);
    }
  }
  // Unreachable: no path at all (never walk through furniture or walls). Callers fall back safely.
  if (prev[idx(tx, tz)] === -2) return [];
  const path: [number, number][] = [];
  for (let c = idx(tx, tz); c !== -1; c = prev[c]!) path.unshift([(c % w) * CELL + CELL / 2, Math.floor(c / w) * CELL + CELL / 2]);
  path.shift(); // drop the starting cell center
  path.pop(); // replace the last cell center by the exact target
  path.push(to);
  return path;
}

/** Small stable number from an id (to spread habits in time without randomness). */
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const GHOST_MATERIAL = new MeshLambertMaterial({ color: 0x9ff0c8, transparent: true, opacity: 0.55, depthWrite: false });

/** What a tap on a piece of furniture means outside decoration mode. */
function tapKindFor(category: string): string {
  switch (category) {
    case 'desk': case 'computer': case 'chair': return 'computer';
    case 'storage': case 'awards': return 'shelf';
    case 'plant': return 'plant';
    case 'comfort': return 'beanbag';
    default: return 'item';
  }
}

export class EmpirianActor {
  pos: [number, number];
  path: [number, number][] = [];
  target: Poi;
  targetName = 'center';
  nextWander = 0;
  /** Cosmetic coffee break triggered by the sim's morning coffee (world time). */
  coffeeUntil = 0;
  /** Position before the editor brought it to the front. */
  savedPos?: [number, number];
  /** Last appearance applied (to notice edits). */
  appearanceKey = '';
  /** A break stays visible for a few world seconds (a 1-hour break is too short to walk at 1x). */
  breakVisual: { kind: 'drink' | 'rest' | 'chat'; until: number } | null = null;
  /** Curious: looking at a newly placed item until this world time. */
  inspectUntil = 0;
  inspectPoi: Poi | null = null;

  constructor(readonly view: EmpirianView, start: Poi) {
    this.pos = [start.x, start.z];
    this.target = start;
    this.view.heading = start.heading;
  }

  goTo(name: string, pois: Record<string, Poi>, blocked: Uint8Array, w: number, d: number, force = false): void {
    const poi = pois[name];
    if (!poi || (name === this.targetName && !force)) return;
    const path = findPath(this.pos, [poi.x, poi.z], blocked, w, d);
    const here = Math.hypot(poi.x - this.pos[0], poi.z - this.pos[1]) < 1;
    if (!path.length && !here) {
      // Safe fallback: no route → stay where we are, standing, and try again later.
      this.targetName = `stay:${name}`;
      this.target = { x: this.pos[0], z: this.pos[1], heading: this.view.heading, pose: 'stand' };
      this.path = [];
      return;
    }
    this.targetName = name;
    this.target = poi;
    this.path = path;
  }

  /**
   * Returns true while walking. With world time stopped (dt = 0, paused) nothing
   * changes — not even where they face: a waypoint reached in the last frame
   * before the pause used to turn the heading in the first paused frame (ML.1).
   */
  step(dt: number, speedFactor: number): boolean {
    if (dt <= 0) return this.path.length > 0;
    const next = this.path[0];
    if (!next) {
      this.view.heading = this.target.heading;
      return false;
    }
    const dx = next[0] - this.pos[0];
    const dz = next[1] - this.pos[1];
    const dist = Math.hypot(dx, dz);
    const v = 17 * Math.min(2.5, Math.max(1, speedFactor)) * dt;
    if (dist <= v) {
      this.pos = [next[0], next[1]];
      this.path.shift();
      // Face the next leg now (not in a later frame).
      const after = this.path[0];
      if (after && (after[0] !== this.pos[0] || after[1] !== this.pos[1])) this.view.heading = Math.atan2(after[0] - this.pos[0], after[1] - this.pos[1]);
    } else {
      this.pos = [this.pos[0] + (dx / dist) * v, this.pos[1] + (dz / dist) * v];
      this.view.heading = Math.atan2(dx, dz);
    }
    return true;
  }
}

/**
 * The living office (GDD §3). Reads simulation state and events; never mutates them.
 */
export class OfficeScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: OrthographicCamera;
  readonly bubbles: BubbleSystem;
  private lastProjectPace: string | null = null;
  private sun: DirectionalLight | null = null;
  private focusId: string | null = null;
  onTap: (t: TapTarget) => void = () => {};
  /** Mouse hover over the floor (decoration mode only): the cell under the cursor. */
  onHover: (cell: [number, number] | null) => void = () => {};
  /** Type of the pointer that produced the last tap ('mouse', 'touch', 'pen'). */
  lastPointerType = 'mouse';
  private actors = new Map<string, EmpirianActor>();
  private pickables: Object3D[] = [];
  /** Block 3.1: one texture per activity, shared by every monitor. */
  private screens = new ScreenDeck();
  private screenGeo = new PlaneGeometry(1, 1);
  /** Desk uid → its monitor's screen. */
  private deskScreens = new Map<string, Mesh>();
  private screenMode: ScreenMode = 'off';
  private screenTimer = 0;
  private screenLine = 0;
  private productBoxes = new Map<string, Mesh>();
  private confetti: InstancedMesh;
  private confettiState: { p: Vector3; v: Vector3; r: Vector3; life: number }[] = [];
  private camMode: CameraMode;
  private focus = false;
  private zoomLevel = 1;
  private lastState: GameState | null = null;
  private pois: Record<string, Poi> = { ...FIXED_POIS };
  private blocked: Uint8Array = new Uint8Array(OFFICE_GRID.w * OFFICE_GRID.d);
  private officeW: number = OFFICE_GRID.w;
  private officeD: number = OFFICE_GRID.d;
  private officeKey = '';
  private itemGroups = new Map<string, { key: string; group: Group; pick: Object3D[] }>();
  private screenMesh!: Mesh;
  private screenAnchor: Group | null = null;
  private showcase: Group | null = null;
  private rugRects: [number, number, number, number][] = [];
  private decorGrid: LineSegments | null = null;
  private ghost: Group | null = null;
  private ghostKey = '';
  decorMode = false;
  /** Debug/gallery only: frame a specific floor-voxel point at a given view height. */
  private shot: { x: number; y: number; z: number; viewH: number } | null = null;

  constructor(private container: HTMLElement, mode: CameraMode = 'dim') {
    this.camMode = mode;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.setCameraMode(mode);

    // Lighting: warm key light from the viewer side, soft sky fill, lamp + window glow.
    this.scene.add(new HemisphereLight(0xfff3e2, 0xb9a6e8, 1.9));
    const sun = new DirectionalLight(0xffe2bd, 1.9);
    this.sun = sun;
    sun.position.set(7.5, 9, 6.5);
    sun.target.position.set(2.6, 0, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    const windowGlow = new PointLight(0xcfe6ff, 0.9, 4, 1.5);
    windowGlow.position.copy(fw(48, 24, 6));
    this.scene.add(windowGlow);

    this.buildRoom();

    // The founder's monitor screen (tappable). Other monitors get their own screen in syncOffice.
    this.screenMesh = new Mesh(this.screenGeo, this.screens.material('off'));
    this.screenMesh.userData.kind = 'computer';
    this.pickables.push(this.screenMesh);

    // Confetti pool
    this.confetti = new InstancedMesh(new BoxGeometry(VOXEL * 0.9, VOXEL * 0.9, VOXEL * 0.2), new MeshLambertMaterial(), 80);
    this.confetti.instanceMatrix.setUsage(DynamicDrawUsage);
    this.confetti.count = 0;
    this.confetti.frustumCulled = false;
    const confettiColors = [P.coral, P.mint, P.mustard, P.sky, P.lavender];
    for (let i = 0; i < 80; i++) this.confetti.setColorAt(i, new Color(PALETTE_HEX[confettiColors[i % 5]!]!));
    this.scene.add(this.confetti);

    this.bubbles = new BubbleSystem(this.scene);
    this.installInput();
    this.resize();
  }

  // ---------------------------------------------------------------- building
  private place(grid: VoxelGrid, fx: number, fy: number, fz: number, kind?: string, jitter = 0.04): Mesh {
    const m = new Mesh(meshVoxels(grid, { jitter }), VOXEL_MATERIAL);
    m.position.copy(fw(fx, fy, fz));
    m.castShadow = true;
    m.receiveShadow = true;
    if (kind) {
      m.userData.kind = kind;
      this.pickables.push(m);
    }
    this.scene.add(m);
    return m;
  }

  private shell: Mesh | null = null;
  private shellKey = '';
  private shellDims = '';
  /** Decoration preview of a finish not bought yet (null = show the real one). */
  private stylePreview: { wall: string; floor: string } | null = null;
  private realStyle = { wall: 'cream', floor: 'oak' };

  /** Rebuilds the room shell when its finish changes (AW.C.3). */
  private applyRoomStyle(style: { wall: string; floor: string }): void {
    const key = `${style.wall}|${style.floor}`;
    const dimsKey = `${this.officeW}x${this.officeD}`;
    if (dimsKey !== this.shellDims) { this.shellDims = dimsKey; this.shellKey = ''; }
    if (key === this.shellKey && this.shell) return;
    this.shellKey = key;
    if (this.shell) {
      this.scene.remove(this.shell);
      this.pickables = this.pickables.filter((p) => p !== this.shell);
      this.shell.geometry.dispose();
    }
    const shell = new Mesh(meshVoxels(buildRoomShell(style, { w: this.officeW * CELL, d: this.officeD * CELL }), { jitter: 0.035, skipBottom: true }), VOXEL_MATERIAL);
    shell.receiveShadow = true;
    shell.userData.kind = 'floor';
    this.scene.add(shell);
    this.pickables.push(shell);
    this.shell = shell;
  }

  /** Sunlight and shadows cover the whole room, whatever its size. */
  private fitLight(): void {
    const sun = this.sun;
    if (!sun) return;
    const c = fw(this.officeW * CELL / 2, 0, this.officeD * CELL / 2);
    const half = Math.max(5, Math.max(this.officeW, this.officeD) * CELL * VOXEL * 0.6);
    sun.target.position.set(c.x, 0, c.z);
    sun.position.set(c.x + 4.9, 9, c.z + 4.3);
    sun.shadow.camera.left = -half; sun.shadow.camera.right = half;
    sun.shadow.camera.top = half; sun.shadow.camera.bottom = -half;
    sun.shadow.camera.updateProjectionMatrix();
  }

  /** Decoration mode: try a finish before paying for it (null restores the real one). */
  previewRoomStyle(style: { wall: string; floor: string } | null, applied?: { wall: string; floor: string }): void {
    this.stylePreview = style;
    if (applied) this.realStyle = applied; // just bought: no flash of the old finish
    this.applyRoomStyle(style ?? this.realStyle);
  }

  private buildRoom(): void {
    this.applyRoomStyle(this.realStyle);
    // Wall fixtures (not part of the catalog yet).
    this.place(buildPoster(), 2, 18, 0, 'poster', 0.01);
    this.place(buildCorkBoard(), 0, 16, 5, 'news', 0.01);
  }

  // ------------------------------------------------------------------ office
  /** World position of an office cell coordinate (cells may be fractional). */
  private cellToWorld(x: number, z: number, y = 0): Vector3 {
    return fw(x * CELL, y, z * CELL);
  }

  private buildItemGroup(item: PlacedItem, opts: { ghost?: boolean } = {}): { group: Group; pick: Object3D[]; screenAnchor?: Group } {
    const def = getItemDef(item.defId);
    const model = itemModel(def.model);
    const outer = new Group();
    const inner = new Group();
    outer.add(inner);
    const size = def.size;
    // Rotate around the footprint centre: inner holds the model at rot 0 centred on the origin.
    inner.position.set((-size.w * CELL * VOXEL) / 2, 0, (-size.d * CELL * VOXEL) / 2);
    const rs = rotatedSize(def, item.rot);
    outer.position.copy(this.cellToWorld(item.x + rs.w / 2, item.z + rs.d / 2));
    outer.rotation.y = (item.rot * Math.PI) / 2;
    const pick: Object3D[] = [];
    const material = opts.ghost ? GHOST_MATERIAL : VOXEL_MATERIAL;
    const addPart = (grid: VoxelGrid, at: [number, number, number], parent: Object3D) => {
      const m = new Mesh(meshVoxels(grid, { jitter: def.layer === 'floor' ? 0.02 : 0.04 }), material);
      m.position.set(at[0] * VOXEL, at[1] * VOXEL, at[2] * VOXEL);
      m.castShadow = !opts.ghost && def.layer !== 'floor';
      m.receiveShadow = !opts.ghost;
      m.userData.itemUid = item.uid;
      m.userData.kind = tapKindFor(def.category);
      parent.add(m);
      pick.push(m);
    };
    for (const part of model.parts) addPart(part.grid, part.at, inner);
    let screenAnchor: Group | undefined;
    if (model.anchor && item.mounts) {
      const mx = model.anchor.monitorX;
      if (item.mounts.computer) {
        const pc = computerModel(item.mounts.computer);
        for (const part of pc.parts) addPart(part.grid, [part.at[0] + mx, part.at[1], part.at[2]], inner);
        screenAnchor = new Group();
        screenAnchor.position.set((pc.screen.x + mx) * VOXEL, pc.screen.y * VOXEL, pc.screen.z * VOXEL);
        screenAnchor.scale.set(pc.screen.w * VOXEL, pc.screen.h * VOXEL, 1);
        inner.add(screenAnchor);
      }
      if (item.mounts.chair) for (const part of chairModel(item.mounts.chair)) addPart(part.grid, [part.at[0] + model.anchor.chairX, part.at[1], part.at[2]], inner);
    }
    if (model.light && !opts.ghost) {
      const light = new PointLight(0xffc670, 1.1, 3.2, 1.5);
      light.position.set(model.light[0] * VOXEL, model.light[1] * VOXEL, model.light[2] * VOXEL);
      inner.add(light);
    }
    return { group: outer, pick, screenAnchor };
  }

  /** Rebuilds the furniture that changed (cheap when nothing did). */
  syncOffice(office: Office): void {
    const key = `${office.w}x${office.d}|${JSON.stringify(office.items)}`;
    if (key === this.officeKey) return;
    this.officeKey = key;
    if (office.w !== this.officeW || office.d !== this.officeD) {
      // A bigger studio (AW.E.1): new walls and floor, grid and framing; furniture keeps its place.
      this.officeW = office.w;
      this.officeD = office.d;
      if (this.decorGrid) { this.scene.remove(this.decorGrid); this.decorGrid.geometry.dispose(); this.decorGrid = null; if (this.decorMode) this.setDecorMode(true); }
      this.applyRoomStyle(this.stylePreview ?? this.realStyle);
      this.fitLight();
      this.resize();
    }
    const desk = founderDesk(office);
    const seen = new Set<string>();
    for (const item of office.items) {
      seen.add(item.uid);
      const k = JSON.stringify(item) + (desk?.uid === item.uid ? '*' : '');
      const old = this.itemGroups.get(item.uid);
      if (old && old.key === k) continue;
      if (old) this.removeItemGroup(item.uid);
      const built = this.buildItemGroup(item);
      this.scene.add(built.group);
      this.pickables.push(...built.pick);
      this.itemGroups.set(item.uid, { key: k, group: built.group, pick: built.pick });
      if (desk?.uid === item.uid && built.screenAnchor) {
        this.screenAnchor = built.screenAnchor;
        built.screenAnchor.add(this.screenMesh);
        this.deskScreens.set(item.uid, this.screenMesh);
      } else if (built.screenAnchor) {
        // Every other monitor shows what its owner is doing too (block 3.1).
        const m = new Mesh(this.screenGeo, this.screens.material('off'));
        built.screenAnchor.add(m);
        this.deskScreens.set(item.uid, m);
      }
    }
    for (const uid of [...this.itemGroups.keys()]) if (!seen.has(uid)) this.removeItemGroup(uid);
    const showcaseItem = office.items.find((i) => getItemDef(i.defId).showcase);
    const showcaseGroup = showcaseItem ? this.itemGroups.get(showcaseItem.uid)?.group ?? null : null;
    if (showcaseGroup !== this.showcase) {
      this.showcase = showcaseGroup;
      for (const m of this.productBoxes.values()) m.removeFromParent();
      this.productBoxes.clear();
      if (this.lastState) this.syncProducts(this.lastState.projects);
    }
    // Walkability, rug areas and points of interest for the Empirians.
    this.blocked = blockedCells(office);
    this.rugRects = office.items
      .filter((i) => getItemDef(i.defId).layer === 'floor')
      .map((i) => { const rs = rotatedSize(getItemDef(i.defId), i.rot); return [i.x * CELL, i.z * CELL, (i.x + rs.w) * CELL, (i.z + rs.d) * CELL]; });
    this.computePois(office);
    for (const a of this.actors.values()) a.goTo(a.targetName, this.pois, this.blocked, this.officeW, this.officeD, true);
  }

  private removeItemGroup(uid: string): void {
    const g = this.itemGroups.get(uid);
    if (!g) return;
    if (this.screenAnchor && g.group.getObjectById(this.screenAnchor.id)) {
      this.screenMesh.removeFromParent();
      this.screenAnchor = null;
    }
    this.deskScreens.delete(uid);
    g.group.removeFromParent();
    g.group.traverse((o) => { if (o instanceof Mesh && o !== this.screenMesh && o.geometry !== this.screenGeo) o.geometry.dispose(); });
    this.pickables = this.pickables.filter((p) => !g.pick.includes(p));
    this.itemGroups.delete(uid);
  }

  private nearestFreeCell(vx: number, vz: number, exclude?: [number, number]): [number, number] {
    let best: [number, number] = [vx, vz];
    let bestD = Infinity;
    for (let z = 0; z < this.officeD; z++)
      for (let x = 0; x < this.officeW; x++) {
        if (this.blocked[x + z * this.officeW]) continue;
        const cx = x * CELL + CELL / 2, cz = z * CELL + CELL / 2;
        if (exclude && Math.abs(cx - exclude[0]) < CELL && Math.abs(cz - exclude[1]) < CELL) continue;
        const dd = (cx - vx) ** 2 + (cz - vz) ** 2;
        if (dd < bestD) { bestD = dd; best = [cx, cz]; }
      }
    return best;
  }

  private computePois(office: Office): void {
    const pois: Record<string, Poi> = {};
    const center = this.nearestFreeCell(30, 31);
    pois.center = { x: center[0], z: center[1], heading: Math.PI * 0.25, pose: 'stand' };
    const win = this.nearestFreeCell(46, 15);
    pois.window = { x: win[0], z: win[1], heading: Math.PI, pose: 'think' };
    const desk = founderDesk(office);
    const seat = desk ? useSpot(desk) : null;
    if (seat) {
      pois.seat = { x: seat.vx, z: seat.vz, heading: seat.heading, pose: 'sit' };
      const side = this.nearestFreeCell(seat.vx + 8, seat.vz + 4, [seat.vx, seat.vz]);
      pois.side = { x: side[0], z: side[1], heading: Math.PI * 0.25, pose: 'raise' };
    } else {
      pois.seat = pois.side = { ...pois.center, pose: 'raise' };
    }
    let bestRest = -1;
    let bestDrink = 0;
    for (const it of office.items) {
      const def = getItemDef(it.defId);
      const sp = useSpot(it);
      const e = def.effects ?? {};
      if (sp && e.rest !== undefined && e.rest > bestRest) {
        bestRest = e.rest;
        pois.beanbag = { x: sp.vx, z: sp.vz, heading: sp.heading + Math.PI, pose: 'lounge' };
      }
      if (sp && e.coffee) pois.coffee = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'stand' };
      // AW.B: the best drink source (coffee machine over water cooler).
      if (sp && e.drink && e.drink > bestDrink) { bestDrink = e.drink; pois.drink = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'stand' }; }
      if (sp && e.inspiration && e.inspiration > 1) pois.whiteboard = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'think' };
      if (sp && def.showcase) pois.shelf = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'think' };
      if (sp && def.id === 'arcade') pois.arcade = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'stand' };
      if (def.category === 'plant' && !pois.plant) {
        const rs = rotatedSize(def, it.rot);
        const c = this.nearestFreeCell((it.x + rs.w / 2) * CELL, (it.z + rs.d + 0.5) * CELL);
        const dx = (it.x + rs.w / 2) * CELL - c[0], dz = (it.z + rs.d / 2) * CELL - c[1];
        pois.plant = { x: c[0], z: c[1], heading: Math.atan2(dx, dz), pose: 'stand' };
      }
    }
    this.pois = pois;
  }

  // ----------------------------------------------------------- decor mode
  setDecorMode(on: boolean): void {
    this.decorMode = on;
    if (on && !this.decorGrid) {
      const pts: number[] = [];
      const y = (FLOOR_Y + 0.08) * VOXEL;
      for (let x = 0; x <= this.officeW; x++) { const a = fw(x * CELL, 0, 0), b = fw(x * CELL, 0, this.officeD * CELL); pts.push(a.x, y, a.z, b.x, y, b.z); }
      for (let z = 0; z <= this.officeD; z++) { const a = fw(0, 0, z * CELL), b = fw(this.officeW * CELL, 0, z * CELL); pts.push(a.x, y, a.z, b.x, y, b.z); }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
      this.decorGrid = new LineSegments(geo, new LineBasicMaterial({ color: 0x6e4530, transparent: true, opacity: 0.6 }));
      this.scene.add(this.decorGrid);
    }
    if (this.decorGrid) this.decorGrid.visible = on;
    if (!on) this.setGhost(null);
  }

  /** Shows a translucent preview of an item; tinted by validity. */
  setGhost(g: { defId: string; x: number; z: number; rot: Rot; valid: boolean; hideUid?: string } | null): void {
    const key = g ? `${g.defId}|${g.x}|${g.z}|${g.rot}|${g.valid}|${g.hideUid ?? ''}` : '';
    if (key === this.ghostKey) return;
    this.ghostKey = key;
    if (this.ghost) {
      this.ghost.removeFromParent();
      this.ghost.traverse((o) => { if (o instanceof Mesh) o.geometry.dispose(); });
      this.ghost = null;
    }
    for (const [uid, v] of this.itemGroups) v.group.visible = !(g?.hideUid && uid === g.hideUid);
    if (!g) return;
    const def = getItemDef(g.defId);
    const built = this.buildItemGroup({ uid: '__ghost', defId: g.defId, x: g.x, z: g.z, rot: g.rot, ...(def.category === 'desk' ? { mounts: { computer: 'pc_basic', chair: 'chair_basic' } } : {}) }, { ghost: true });
    GHOST_MATERIAL.color.setHex(g.valid ? 0x9ff0c8 : 0xff8a7a);
    // Footprint tile under the ghost.
    const rs = rotatedSize(def, g.rot);
    const tile = new Mesh(new PlaneGeometry(rs.w * CELL * VOXEL, rs.d * CELL * VOXEL), new MeshBasicMaterial({ color: g.valid ? 0x4fae95 : 0xe2675a, transparent: true, opacity: 0.45, depthWrite: false }));
    tile.rotation.x = -Math.PI / 2;
    tile.position.copy(this.cellToWorld(g.x + rs.w / 2, g.z + rs.d / 2, 0.15));
    this.ghost = new Group();
    this.ghost.add(built.group, tile);
    this.scene.add(this.ghost);
  }

  /** Screen position (CSS px) of the centre of an office cell (tests / debug). */
  cellScreenPos(x: number, z: number): { x: number; y: number } {
    return this.project(this.cellToWorld(x + 0.5, z + 0.5));
  }

  /** Office cell under a screen point (null if outside the floor). */
  floorCellAt(clientX: number, clientY: number): [number, number] | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new Vector3();
    if (!this.raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -FLOOR_Y * VOXEL), hit)) return null;
    const vx = hit.x / VOXEL - WALL, vz = hit.z / VOXEL - WALL;
    const cx = Math.floor(vx / CELL), cz = Math.floor(vz / CELL);
    if (cx < 0 || cz < 0 || cx >= this.officeW || cz >= this.officeD) return null;
    return [cx, cz];
  }

  // ------------------------------------------------------------------ camera
  setCameraMode(mode: CameraMode): void {
    this.camMode = mode;
    this.resize();
  }

  getCameraMode(): CameraMode {
    return this.camMode;
  }

  /** Founder creation: zoom on the Empirian. */
  /** Editor spot: the free floor cell closest to the camera (nothing in front of the character). */
  private focusSpot(): Poi {
    let best: [number, number] = [30, 31];
    let score = -1;
    for (let z = 1; z < this.officeD; z++) for (let x = 1; x < this.officeW; x++) {
      if (this.blocked[x + z * this.officeW]) continue;
      // Front-most, but not glued to the edge, and with free cells in front (towards the camera).
      const front = (x + 1 < this.officeW ? this.blocked[x + 1 + z * this.officeW] ?? 0 : 0) + (z + 1 < this.officeD ? this.blocked[x + (z + 1) * this.officeW] ?? 0 : 0);
      const sc = x + z - front * 3 - (x === this.officeW - 1 || z === this.officeD - 1 ? 1 : 0);
      if (sc > score) { score = sc; best = [x * CELL + CELL / 2, z * CELL + CELL / 2]; }
    }
    return { x: best[0], z: best[1], heading: Math.PI * 0.25, pose: 'stand' };
  }

  /** Founder creation / appearance editor: one Empirian alone at the front of the room (others hidden). */
  setFocus(on: boolean, id?: string): void {
    this.focus = on;
    this.focusId = on ? id ?? null : null;
    for (const [aid, a] of this.actors) {
      if (on && this.focusId && aid !== this.focusId) a.view.root.visible = false;
      else a.view.root.visible = true;
      if (on && (!this.focusId || aid === this.focusId)) {
        a.savedPos ??= [...a.pos] as [number, number];
        // Settle into a calm standing pose even while the world is paused.
        a.view.pose = 'stand';
        a.view.animate(0, 1, 'idle', 100, false, 1);
      } else if (!on && a.savedPos) {
        a.pos = a.savedPos;
        a.savedPos = undefined;
      }
    }
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const fs = this.focusId ? this.focusSpot() : null;
    // Room size relative to the starting room (10×8 cells): bigger studios are framed wider.
    const grow = Math.max(this.officeW / 10, this.officeD / 8);
    const roomCenter = fw(this.officeW * CELL / 2 - 2, 16, this.officeD * CELL / 2);
    const target = this.shot ? fw(this.shot.x, this.shot.y, this.shot.z) : fs ? fw(fs.x, 11, fs.z) : this.focus ? fw(30, 11, 31) : roomCenter;
    // Fit the diorama: by height in landscape, by width in portrait.
    let viewH = this.shot ? this.shot.viewH : this.focus ? 2.2 : 6.1 * grow;
    if (!this.focus && !this.shot && aspect < 1.35) viewH = Math.max(viewH, (7.7 * grow) / aspect);
    viewH /= this.zoomLevel;
    const viewW = viewH * aspect;
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    // True isometric: elevation ≈ 35.26°; dimetric: 30° (ART_DIRECTION §4.1).
    const elev = this.camMode === 'iso' ? Math.atan(1 / Math.SQRT2) : Math.PI / 6;
    const dist = 20;
    const horiz = Math.cos(elev) * dist;
    this.camera.position.set(target.x + horiz * Math.SQRT1_2, target.y + Math.sin(elev) * dist, target.z + horiz * Math.SQRT1_2);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------------- empirians
  ensureEmpirian(id: string, appearance: Appearance): EmpirianView {
    const existing = this.actors.get(id);
    if (existing) return existing.view;
    const view = new EmpirianView(appearance, id);
    const actor = new EmpirianActor(view, this.pois.center ?? FIXED_POIS.center!);
    this.actors.set(id, actor);
    this.scene.add(view.root);
    view.root.traverse((o) => {
      if (o instanceof Mesh) this.pickables.push(o);
    });
    return view;
  }

  removeEmpirian(id: string): void {
    const actor = this.actors.get(id);
    if (!actor) return;
    actor.view.root.traverse((o) => {
      this.pickables = this.pickables.filter((p) => p !== o);
    });
    this.scene.remove(actor.view.root);
    this.actors.delete(id);
  }

  setAppearance(id: string, a: Appearance): void {
    const actor = this.actors.get(id);
    if (!actor) return;
    actor.view.root.traverse((o) => {
      this.pickables = this.pickables.filter((p) => p !== o);
    });
    actor.view.setAppearance(a);
    actor.view.root.traverse((o) => {
      if (o instanceof Mesh) this.pickables.push(o);
    });
  }

  getView(id: string): EmpirianView | undefined {
    return this.actors.get(id)?.view;
  }

  /** Reads the latest simulation state. Cheap: call whenever state changes. */
  sync(state: GameState): void {
    this.lastState = state;
    this.realStyle = state.office.style ?? { wall: 'cream', floor: 'oak' };
    if (!this.stylePreview) this.applyRoomStyle(this.realStyle);
    this.lastProjectPace = state.projects.find((p) => p.id === state.activeProjectId)?.pace ?? null;
    this.syncOffice(state.office);
    for (const e of state.empirians) {
      this.ensureEmpirian(e.id, e.appearance);
      // Edited looks (AW.C): rebuild only that Empirian's model.
      const key = JSON.stringify(e.appearance);
      const actor = this.actors.get(e.id)!;
      if (actor.appearanceKey && actor.appearanceKey !== key) this.setAppearance(e.id, e.appearance);
      actor.appearanceKey = key;
    }
    // Employees who left the studio (GT.1).
    for (const id of [...this.actors.keys()]) {
      if (id.startsWith('stress-') || state.empirians.some((e) => e.id === id)) continue;
      this.removeEmpirian(id);
    }
    // Each employee works at their own desk; chatting pairs meet face to face (AW.B).
    for (const k of Object.keys(this.pois)) {
      if (k.startsWith('seat:')) delete this.pois[k];
      if (k.startsWith('chat:') && !this.actors.get(k.slice(5))?.breakVisual) delete this.pois[k];
    }
    for (const e of state.empirians) {
      if (e.activity !== 'chatting' || !e.chatWith || e.id > e.chatWith) continue;
      const c = this.pois.center ?? FIXED_POIS.center!;
      const a = this.nearestFreeCell(c.x - 4, c.z);
      const b = this.nearestFreeCell(a[0] + 7, a[1], a);
      const ha = Math.atan2(b[0] - a[0], b[1] - a[1]);
      this.pois[`chat:${e.id}`] = { x: a[0], z: a[1], heading: ha, pose: 'stand' };
      this.pois[`chat:${e.chatWith}`] = { x: b[0], z: b[1], heading: ha + Math.PI, pose: 'stand' };
    }
    for (const it of state.office.items) {
      if (!it.assignedTo) continue;
      const sp = useSpot(it);
      if (sp) this.pois[`seat:${it.assignedTo}`] = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'sit' };
    }
    this.syncProducts(state.projects);
  }

  /** Where to go in free time: tired → rest, thirsty → drink, curious → shelf/whiteboard, sociable → near others, low → plant/window. */
  private freeTimeSpot(e: GameState['empirians'][number] | undefined, id: string, t: number): string {
    const has = (k: string) => !!this.pois[k];
    const energy = e?.energy ?? 100, morale = e?.morale ?? 70;
    const slot = Math.floor(t / 9 + (hashId(id) % 7));
    const pick = (list: string[]) => list.filter(has)[slot % Math.max(1, list.filter(has).length)] ?? 'center';
    if (energy < 50 && has('beanbag')) return 'beanbag';
    if (energy < 70 && has('drink') && slot % 3 === 0) return 'drink';
    if (e?.trait === 'curious') return pick(['shelf', 'whiteboard', 'arcade', 'window']);
    if (e?.trait === 'sociable') return pick(['center', 'drink', 'coffee']);
    if (morale < 55) return pick(['plant', 'window']);
    return pick(['window', 'plant', 'shelf', 'center', 'arcade']);
  }

  private behaviourFor(activity: Activity): string | null {
    switch (activity) {
      case 'coding':
      case 'designing':
      case 'testing':
      case 'thinking':
        return 'seat';
      case 'raising_hand':
        return 'side';
      case 'celebrating':
        return 'center';
      case 'resting':
        return 'beanbag';
      default:
        return null; // wander
    }
  }

  // ------------------------------------------------------------------ events
  handleEvents(events: SimEvent[], now: number): void {
    // Relationship moments go last so routine work bubbles never push them out (E.3).
    const ordered = [...events.filter((e) => e.type !== 'relation'), ...events.filter((e) => e.type === 'relation')];
    for (const e of ordered) {
      const actor = 'empirianId' in e ? this.actors.get(e.empirianId) : this.actors.values().next().value;
      if (!actor) continue;
      const head = actor.view.head;
      const off = 1.05;
      switch (e.type) {
        case 'work':
          if (e.kind === 'tech') this.bubbles.spawn(head, off, 'code', now, { cooldown: 2.2 });
          else if (e.kind === 'design') this.bubbles.spawn(head, off, 'design', now, { cooldown: 2.2 });
          else if (e.kind === 'test') this.bubbles.spawn(head, off, 'test', now, { cooldown: 2.6 });
          else this.bubbles.spawn(head, off, 'star', now, { cooldown: 3.5 });
          break;
        case 'bug_created': {
          this.bubbles.spawn(head, off, 'bug', now, { cooldown: 0.9 });
          // Perfectionists take every bug personally.
          const perf = this.lastState?.empirians.find((x) => x.id === e.empirianId)?.trait === 'perfectionist';
          actor.view.flash('frustrated', perf ? 2.2 : 0.9, now);
          break;
        }
        case 'bug_found':
          this.bubbles.spawn(head, off, 'bug', now, { cooldown: 0.9 });
          actor.view.flash('surprised', 0.7, now);
          break;
        case 'bug_fixed':
          this.bubbles.spawn(head, off, 'check', now, { cooldown: 0.9 });
          actor.view.flash('happy', 0.8, now);
          break;
        case 'idea':
          this.bubbles.spawn(head, off, 'idea', now, { cooldown: 1.5 });
          break;
        case 'quality_up':
          this.bubbles.spawn(head, off, 'star', now, { cooldown: 1.5 });
          break;
        case 'energy_low':
          this.bubbles.spawn(head, off, 'sweat', now, { cooldown: 3 });
          break;
        case 'project_released': {
          // The team reacts to how it went (AW.B): a flop is felt, a hit is celebrated.
          const score = this.lastState?.projects.find((p) => p.id === e.projectId)?.result?.averageScore ?? 7;
          if (score >= 6.5) this.burstConfetti(actor);
          for (const a of this.actors.values()) {
            if (score >= 8) { a.view.flash('joyful', 3, now); this.bubbles.spawn(a.view.head, off, 'star', now, { cooldown: 0.2, life: 2.4 }); }
            else if (score < 5) { a.view.flash('frustrated', 3, now); this.bubbles.spawn(a.view.head, off, 'sweat', now, { cooldown: 0.2, life: 2.4 }); }
          }
          break;
        }
        case 'routine': {
          actor.breakVisual = { kind: e.kind, until: now + 4.5 };
          if (e.kind === 'chat' && e.partnerId && e.empirianId < e.partnerId) {
            const c = this.pois.center ?? FIXED_POIS.center!;
            const a = this.nearestFreeCell(c.x - 4, c.z);
            const b = this.nearestFreeCell(a[0] + 7, a[1], a);
            const ha = Math.atan2(b[0] - a[0], b[1] - a[1]);
            this.pois[`chat:${e.empirianId}`] = { x: a[0], z: a[1], heading: ha, pose: 'stand' };
            this.pois[`chat:${e.partnerId}`] = { x: b[0], z: b[1], heading: ha + Math.PI, pose: 'stand' };
          }
          // Mentoring (E.3) looks like a chat, with a book over the mentor and ideas over the learner.
          const mentor = e.mentoring && this.lastState?.relations?.some((r) => r.mentor === e.empirianId);
          const ic = e.kind === 'drink' ? 'cup' : e.kind === 'rest' ? 'zzz' : e.mentoring ? (mentor ? 'book' : 'idea') : 'chat';
          this.bubbles.spawn(head, off, ic, now, { cooldown: 0.5, life: 2.2 });
          if (e.kind === 'chat') actor.view.flash('happy', 2, now);
          break;
        }
        case 'unlock': {
          // Progression (D-062): a small celebration around the founder.
          const f = this.lastState ? this.actors.get(this.lastState.founderId) : actor;
          if (f) { this.burstConfetti(f); f.view.flash('joyful', 2.5, now); this.bubbles.spawn(f.view.head, off + 0.5, 'star', now, { cooldown: 0.2, life: 2.8 }); }
          break;
        }
        case 'fame': {
          // The studio's name changes (F3.8): everyone reacts — proud, or worried.
          const good = e.level !== 'poor';
          for (const a of this.actors.values()) { a.view.flash(good ? 'joyful' : 'frustrated', 2.5, now); this.bubbles.spawn(a.view.head, off + 0.5, good ? 'star' : 'sweat', now, { cooldown: 0.2, life: 2.6 }); }
          break;
        }
        case 'relation': {
          // A relationship changes (E.3): hearts, a little storm cloud, or a book — over both of them.
          const bad = e.kind === 'tension' || e.kind === 'rivals';
          const ic = bad ? 'storm' : e.kind === 'mentor' ? 'book' : e.kind === 'friends' ? 'heart' : 'star';
          for (const id of [e.a, e.b]) {
            const a = this.actors.get(id);
            if (!a) continue;
            a.view.flash(bad ? 'frustrated' : 'joyful', 2.2, now);
            // Higher than the usual bubbles, so it isn't hidden behind the chat bubble of the same moment.
            this.bubbles.spawn(a.view.head, off + 0.5, ic, now, { cooldown: 0.2, life: 3 });
          }
          break;
        }
        case 'office_expanded':
          // A new, bigger studio: everyone celebrates.
          this.burstConfetti(actor);
          for (const a of this.actors.values()) { a.view.flash('joyful', 3, now); this.bubbles.spawn(a.view.head, off, 'star', now, { cooldown: 0.2, life: 2.6 }); }
          break;
        case 'achievement':
          for (const a of this.actors.values()) { a.view.flash('joyful', 2.5, now); this.bubbles.spawn(a.view.head, off, 'star', now, { cooldown: 0.2, life: 2.4 }); }
          break;
        case 'hired':
          for (const [aid, a] of this.actors) if (aid !== e.empirianId) { a.view.flash('happy', 2, now); this.bubbles.spawn(a.view.head, off, 'heart', now, { cooldown: 0.2 }); }
          break;
        case 'fired':
          for (const a of this.actors.values()) { a.view.flash('frustrated', 2.5, now); this.bubbles.spawn(a.view.head, off, 'sweat', now, { cooldown: 0.2 }); }
          break;
        case 'office_changed': {
          // Curious Empirians who are free go and have a look at the newest thing.
          const st = this.lastState;
          const newest = st?.office.items[st.office.items.length - 1];
          if (!st || !newest) break;
          const sp = useSpot(newest);
          const rs = rotatedSize(getItemDef(newest.defId), newest.rot);
          const c = sp ? [sp.vx, sp.vz] : this.nearestFreeCell((newest.x + rs.w / 2) * CELL, (newest.z + rs.d + 0.5) * CELL);
          for (const emp of st.empirians) {
            const a = this.actors.get(emp.id);
            if (!a || emp.trait !== 'curious' || emp.activity !== 'idle') continue;
            a.inspectUntil = now + 5;
            a.inspectPoi = { x: c[0]!, z: c[1]!, heading: Math.atan2((newest.x + rs.w / 2) * CELL - c[0]!, (newest.z + rs.d / 2) * CELL - c[1]!), pose: 'think' };
          }
          break;
        }
        case 'sales_week':
          this.bubbles.spawn(head, off, 'coin', now, { cooldown: 0.5 });
          break;
        case 'coffee':
          if (this.pois.coffee) {
            actor.goTo('coffee', this.pois, this.blocked, this.officeW, this.officeD);
            actor.coffeeUntil = now + 4;
          }
          this.bubbles.spawn(head, off, 'sweat', now, { cooldown: 5 });
          break;
        case 'skill_up':
          this.bubbles.spawn(head, off, 'star', now, { cooldown: 0.3, life: 2.4 });
          actor.view.flash('joyful', 1.4, now);
          break;
      }
    }
  }

  private burstConfetti(actor: EmpirianActor): void {
    const origin = fw(actor.pos[0], 26, actor.pos[1]);
    this.confettiState = [];
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.8 + Math.random() * 1.6;
      this.confettiState.push({
        p: origin.clone(),
        v: new Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp),
        r: new Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        life: 2.2 + Math.random(),
      });
    }
  }

  // ---------------------------------------------------------------- products
  private syncProducts(projects: Project[]): void {
    if (!this.showcase) return;
    // Slots on the showcase shelf, item-local voxels (rot 0, front +z).
    const slots: [number, number, number][] = [[2.5, 25, 1.5], [7, 25, 1.5], [11.5, 25, 1.5], [11, 16, 1.5], [3, 32, 2.5], [8, 32, 2.5]];
    const inner = this.showcase.children[0];
    if (!inner) return;
    const released = projects.filter((p) => p.phase === 'released');
    released.forEach((p, i) => {
      if (this.productBoxes.has(p.id) || i >= slots.length) return;
      let h = 0;
      for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const cover = CLOTH_COLORS[h % CLOTH_COLORS.length]!;
      const accent = h % 2 ? P.white : P.ink;
      const box = buildProductBox(cover, accent, h);
      const m = new Mesh(meshVoxels(box, { jitter: 0.02 }), VOXEL_MATERIAL);
      const [x, y, z] = slots[i]!;
      // The box model faces +x: turn it to face the shelf front (+z).
      m.rotation.y = -Math.PI / 2;
      m.position.set(x * VOXEL, y * VOXEL, (z + 2) * VOXEL);
      m.castShadow = true;
      m.userData.kind = 'product';
      m.userData.productId = p.id;
      inner.add(m);
      this.pickables.push(m);
      this.productBoxes.set(p.id, m);
    });
  }

  // ----------------------------------------------------------------- screen
  /** Each monitor shows its owner's activity; only the patterns in use are redrawn. */
  private updateScreens(): void {
    const state = this.lastState;
    if (!state) return;
    const desk = founderDesk(state.office);
    const used = new Set<ScreenMode>();
    for (const [uid, mesh] of this.deskScreens) {
      const item = state.office.items.find((it) => it.uid === uid);
      const owner = desk?.uid === uid ? state.founderId : item?.assignedTo;
      const mode = owner ? this.modeFor(owner) : 'off';
      used.add(mode);
      const mat = this.screens.material(mode);
      if (mesh.material !== mat) mesh.material = mat;
    }
    for (const m of used) this.screens.draw(m, this.screenLine);
  }

  private modeFor(id: string): ScreenMode {
    const state = this.lastState!;
    const e = state.empirians.find((x) => x.id === id);
    const a = this.actors.get(id);
    if (!e || !a) return 'off';
    if (e.activity === 'celebrating') return 'party';
    const seated = a.path.length === 0 && a.targetName.startsWith('seat');
    if (!seated) return 'off';
    const p = state.projects.find((q) => q.id === state.activeProjectId);
    switch (e.activity) {
      case 'coding': return 'code';
      case 'designing': return 'design';
      // A patch (GT.6) is squashing bugs too.
      case 'testing': return (p && p.bugs.known > 0) || state.support?.kind === 'patch' ? 'fix' : 'test';
      case 'thinking': return 'think';
      default: return 'off';
    }
  }

  // ------------------------------------------------------------------ update
  /**
   * Places everyone at their current target in its final pose, without animating
   * (used when a game is loaded, possibly paused). World time is not advanced.
   */
  settle(): void {
    for (let i = 0; i < 40; i++) this.update(0.25, 0, 1, false);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * `dt`/`t` are WORLD time (render/worldClock.ts): both stop while the game is
   * paused, which freezes every world animation in place. Rendering, camera and
   * decoration preview keep working.
   */
  update(dt: number, t: number, speedFactor: number, render = true): void {
    const state = this.lastState;
    for (const [id, actor] of this.actors) {
      const e = state?.empirians.find((x) => x.id === id);
      const activity: Activity = e?.activity ?? 'idle';
      const energy = e?.energy ?? 100;
      const center = this.pois.center ?? FIXED_POIS.center!;
      const go = (name: string) => actor.goTo(name, this.pois, this.blocked, this.officeW, this.officeD);
      if (this.focus && (!this.focusId || id === this.focusId)) {
        const spot = this.focusId ? this.focusSpot() : center;
        actor.pos = [spot.x, spot.z];
        actor.path = [];
        actor.targetName = 'center';
        actor.target = { ...spot, heading: Math.PI * 0.25, pose: 'stand' };
        actor.view.heading = Math.PI * 0.25;
        // Paused world: show the preview facing the camera at once.
        if (dt === 0) actor.view.snap = true;
      } else if (actor.targetName.startsWith('pin:')) {
        // gallery/debug pin: stay
      } else if (t < actor.coffeeUntil && activity !== 'raising_hand' && activity !== 'celebrating') {
        go('coffee');
      } else {
        let wanted = this.behaviourFor(activity);
        // Employees sit at their own desk (GT.1); only the founder uses the founder's seat.
        if (wanted === 'seat' && id !== state?.founderId) wanted = this.pois[`seat:${id}`] ? `seat:${id}` : 'center';
        // Short breaks (AW.B): drink, rest, chat — each at its real place, visible for a few world seconds.
        if (actor.breakVisual && t >= actor.breakVisual.until) actor.breakVisual = null;
        const shown = actor.breakVisual ? ({ drink: 'drinking', rest: 'lounging', chat: 'chatting' } as const)[actor.breakVisual.kind] : activity;
        if (shown === 'drinking') wanted = this.pois.drink ? 'drink' : this.pois.coffee ? 'coffee' : 'window';
        else if (shown === 'lounging') wanted = this.pois.beanbag ? 'beanbag' : 'window';
        else if (shown === 'chatting') wanted = this.pois[`chat:${id}`] ? `chat:${id}` : 'center';
        // Curious Empirians go and look at something new when they're free (render only, world time).
        else if (!wanted && t < actor.inspectUntil && actor.inspectPoi) { this.pois[`inspect:${id}`] = actor.inspectPoi; wanted = `inspect:${id}`; }
        // Concept work at the whiteboard when there is one (visible effect of the item).
        if (activity === 'thinking' && this.pois.whiteboard) wanted = 'whiteboard';
        if (wanted) go(wanted);
        else if (t > actor.nextWander) {
          // Free time with a purpose (AW.B): what they do depends on how they feel and who they are.
          go(this.freeTimeSpot(e, id, t));
          actor.nextWander = t + 7 + (hashId(id) % 5);
        }
      }
      const moving = actor.step(dt, speedFactor);
      // Paused: the pose waits for the world to move again (except the editor's instant preview).
      if (dt > 0 || actor.view.snap) actor.view.pose = actor.target.pose;
      // Small, recognisable habits (AW.B) — world time only, so pause freezes them too.
      const seatedWork = !moving && actor.targetName.startsWith('seat') && ['coding', 'designing', 'testing'].includes(activity);
      actor.view.stretching = seatedWork && energy < 45 && (t + (hashId(id) % 20)) % 20 < 1.4;
      if (dt > 0 && e) {
        if (energy < 22 && activity !== 'lounging') this.bubbles.spawn(actor.view.head, 1.05, 'zzz', t, { cooldown: 9 });
        const crunch = this.lastProjectPace === 'crunch';
        if (e.trait === 'night_owl' && crunch && seatedWork) this.bubbles.spawn(actor.view.head, 1.05, 'star', t, { cooldown: 8 });
        if (e.trait === 'sociable' && activity === 'idle' && state && state.empirians.length > 1) this.bubbles.spawn(actor.view.head, 1.05, 'chat', t, { cooldown: 12 });
      }
      const animActivity: Activity = actor.breakVisual ? ({ drink: 'drinking', rest: 'lounging', chat: 'chatting' } as const)[actor.breakVisual.kind] : activity;
      actor.view.animate(t, dt, animActivity, energy, moving, speedFactor);
      const [px, pz] = actor.pos;
      const onRug = this.rugRects.some(([x0, z0, x1, z1]) => px >= x0 && px <= x1 && pz >= z0 && pz <= z1);
      actor.view.root.position.copy(fw(px, onRug && actor.target.pose !== 'lounge' && actor.target.pose !== 'sit' ? 1 : 0, pz));
      // Sticky bubble while waiting for the player.
      this.bubbles.setSticky(actor.view.head, 1.05, activity === 'raising_hand' ? 'alert' : null, t);
      if (id === state?.founderId) {
        const seated = !moving && actor.targetName === 'seat';
        if (actor.targetName === 'whiteboard' && !moving) actor.view.pose = 'think';
        this.screenMode = this.modeFor(id);
      }
    }

    this.screenTimer += dt * Math.max(1, Math.min(speedFactor, 3));
    if (this.screenTimer > 0.18) {
      this.screenTimer = 0;
      this.screenLine++;
      this.updateScreens();
    }

    // Confetti physics
    const m = new Matrix4();
    const q = new Object3D();
    let n = 0;
    for (const c of this.confettiState) {
      c.life -= dt;
      if (c.life <= 0) continue;
      c.v.y -= 6 * dt;
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < FLOOR_Y * VOXEL + 0.01) {
        c.p.y = FLOOR_Y * VOXEL + 0.01;
        c.v.set(0, 0, 0);
      }
      q.position.copy(c.p);
      q.rotation.set(c.r.x * c.life, c.r.y * c.life, c.r.z);
      q.updateMatrix();
      m.copy(q.matrix);
      this.confetti.setMatrixAt(n++, m);
    }
    this.confettiState = this.confettiState.filter((c) => c.life > 0);
    this.confetti.count = n;
    this.confetti.instanceMatrix.needsUpdate = true;

    this.bubbles.update(t);
    if (render) this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------------- input
  private installInput(): void {
    const el = this.renderer.domElement;
    let down: { x: number; y: number; t: number } | null = null;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let zoomStart = 1;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (ev) => {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 1) down = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        zoomStart = this.zoomLevel;
        down = null;
      }
    });
    let hoverQueued: PointerEvent | null = null;
    el.addEventListener('pointermove', (ev) => {
      // Desktop: in decoration mode the ghost follows the mouse (one pick per frame at most).
      if (ev.pointerType === 'mouse' && this.decorMode && ev.buttons === 0) {
        if (!hoverQueued) requestAnimationFrame(() => { const e = hoverQueued; hoverQueued = null; if (e) this.onHover(this.floorCellAt(e.clientX, e.clientY)); });
        hoverQueued = ev;
      }
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2 && pinchStart > 0) {
        const [a, b] = [...pointers.values()];
        this.setZoom(zoomStart * (Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinchStart));
      }
    });
    const end = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (!down) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      if (moved < 12 && performance.now() - down.t < 600) {
        this.lastPointerType = ev.pointerType || 'mouse';
        this.pick(ev.clientX, ev.clientY);
      }
      down = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', (ev) => {
      pointers.delete(ev.pointerId);
      down = null;
    });
    el.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.setZoom(this.zoomLevel * (ev.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  /** Debug/test helper: everything that moves with world time, to check that pause freezes it. */
  worldSnapshot(): string {
    const r = (n: number) => Math.round(n * 1e4) / 1e4;
    const actors = [...this.actors.entries()].map(([id, a]) => {
      const v = a.view;
      // Target heading AND the visible rotation, plus the target pose: nothing may change while paused.
      return [id, r(a.pos[0]), r(a.pos[1]), r(v.heading), r(v.root.rotation.y), v.pose, r(v.body.position.y), r(v.legL.rotation.x), r(v.armR.rotation.x), r(v.armR.rotation.z)];
    });
    return JSON.stringify({ actors, screen: this.screenLine, bubbles: this.bubbles.snapshot(), confetti: this.confetti.count });
  }

  /** Debug/gallery helper (not used by the game UI). Pass null to restore. */
  frameShot(shot: { x: number; y: number; z: number; viewH: number } | null): void {
    this.shot = shot;
    this.resize();
  }

  /** Debug/gallery helper: place an Empirian and keep it there, facing `heading`. */
  pinEmpirian(id: string, x: number, z: number, heading: number, pose: Pose = 'stand'): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.pos = [x, z];
    a.path = [];
    a.targetName = `pin:${x},${z}`;
    a.target = { x, z, heading, pose };
    a.nextWander = Number.POSITIVE_INFINITY;
  }

  setZoom(z: number): void {
    this.zoomLevel = Math.max(0.85, Math.min(2.2, z));
    this.resize();
  }

  private raycaster = new Raycaster();
  pick(clientX: number, clientY: number): TapTarget | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    let target: TapTarget | null = null;
    if (this.decorMode) {
      // Decoration: furniture is selectable; everything else means "this floor cell".
      const item = hits.find((h) => h.object.userData.itemUid);
      const cell = this.floorCellAt(clientX, clientY) ?? undefined;
      target = item ? { kind: 'item', uid: item.object.userData.itemUid as string, cell } : { kind: 'floor', cell };
      this.onTap(target);
      return target;
    }
    // Empirians are small: prefer them if hit at all.
    const emp = hits.find((h) => h.object.userData.empirianId);
    if (emp) target = { kind: 'empirian', id: emp.object.userData.empirianId as string };
    else {
      const h = hits[0];
      const kind = h?.object.userData.kind as string | undefined;
      if (kind === 'product') target = { kind: 'product', id: h!.object.userData.productId as string };
      else if (kind) target = { kind } as TapTarget;
    }
    if (target) this.onTap(target);
    return target;
  }

  /** Screen position (CSS px) of a world point, for HTML overlays. */
  project(world: Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  /** Screen position (CSS px) of the top of a placed item, for UI pointers (tutorial). */
  itemScreenPos(uid: string): { x: number; y: number } | null {
    const v = this.itemGroups.get(uid);
    if (!v) return null;
    const box = new Box3().setFromObject(v.group);
    if (box.isEmpty()) return null;
    const c = box.getCenter(new Vector3());
    c.y = box.max.y + 0.15;
    return this.project(c);
  }

  empirianScreenPos(id: string): { x: number; y: number } | null {
    const a = this.actors.get(id);
    if (!a) return null;
    const p = new Vector3();
    a.view.head.getWorldPosition(p);
    p.y += 0.95; // above the hair, not at the neck pivot
    return this.project(p);
  }

  stats(): { calls: number; triangles: number; geometries: number; textures: number } {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
  }
}

