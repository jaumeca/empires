import {
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
  if (prev[idx(tx, tz)] === -2) return [to];
  const path: [number, number][] = [];
  for (let c = idx(tx, tz); c !== -1; c = prev[c]!) path.unshift([(c % w) * CELL + CELL / 2, Math.floor(c / w) * CELL + CELL / 2]);
  path.shift(); // drop the starting cell center
  path.pop(); // replace the last cell center by the exact target
  path.push(to);
  return path;
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

class EmpirianActor {
  pos: [number, number];
  path: [number, number][] = [];
  target: Poi;
  targetName = 'center';
  nextWander = 0;
  /** Cosmetic coffee break (real time) triggered by the sim's morning coffee. */
  coffeeUntil = 0;

  constructor(readonly view: EmpirianView, start: Poi) {
    this.pos = [start.x, start.z];
    this.target = start;
    this.view.heading = start.heading;
  }

  goTo(name: string, pois: Record<string, Poi>, blocked: Uint8Array, w: number, d: number, force = false): void {
    const poi = pois[name];
    if (!poi || (name === this.targetName && !force)) return;
    this.targetName = name;
    this.target = poi;
    this.path = findPath(this.pos, [poi.x, poi.z], blocked, w, d);
  }

  /** Returns true while walking. */
  step(dt: number, speedFactor: number): boolean {
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
  onTap: (t: TapTarget) => void = () => {};
  /** Mouse hover over the floor (decoration mode only): the cell under the cursor. */
  onHover: (cell: [number, number] | null) => void = () => {};
  /** Type of the pointer that produced the last tap ('mouse', 'touch', 'pen'). */
  lastPointerType = 'mouse';
  private actors = new Map<string, EmpirianActor>();
  private pickables: Object3D[] = [];
  private screenCanvas: HTMLCanvasElement;
  private screenCtx: CanvasRenderingContext2D;
  private screenTex: CanvasTexture;
  private screenMode: 'off' | 'code' | 'design' | 'test' | 'party' = 'off';
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

    // Monitor screen (animated canvas texture).
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 40;
    this.screenCanvas.height = 24;
    this.screenCtx = this.screenCanvas.getContext('2d')!;
    this.screenTex = new CanvasTexture(this.screenCanvas);
    this.screenTex.magFilter = NearestFilter;
    this.screenTex.minFilter = NearestFilter;
    this.screenTex.colorSpace = SRGBColorSpace;
    // The screen is attached to the founder's computer when the office syncs.
    this.screenMesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.screenTex }));
    this.screenMesh.userData.kind = 'computer';
    this.pickables.push(this.screenMesh);
    this.drawScreen();

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

  private buildRoom(): void {
    const shell = new Mesh(meshVoxels(buildRoomShell(), { jitter: 0.035, skipBottom: true }), VOXEL_MATERIAL);
    shell.receiveShadow = true;
    shell.userData.kind = 'floor';
    this.scene.add(shell);
    this.pickables.push(shell);
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
    const key = JSON.stringify(office.items);
    if (key === this.officeKey) return;
    this.officeKey = key;
    this.officeW = office.w;
    this.officeD = office.d;
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
    g.group.removeFromParent();
    g.group.traverse((o) => { if (o instanceof Mesh && o !== this.screenMesh) o.geometry.dispose(); });
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
    for (const it of office.items) {
      const def = getItemDef(it.defId);
      const sp = useSpot(it);
      const e = def.effects ?? {};
      if (sp && e.rest !== undefined && e.rest > bestRest) {
        bestRest = e.rest;
        pois.beanbag = { x: sp.vx, z: sp.vz, heading: sp.heading + Math.PI, pose: 'lounge' };
      }
      if (sp && e.coffee) pois.coffee = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'stand' };
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
  setFocus(on: boolean): void {
    this.focus = on;
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const target = this.shot ? fw(this.shot.x, this.shot.y, this.shot.z) : this.focus ? fw(30, 11, 31) : fw(28, 16, 24);
    // Fit the diorama: by height in landscape, by width in portrait.
    let viewH = this.shot ? this.shot.viewH : this.focus ? 2.2 : 6.1;
    if (!this.focus && !this.shot && aspect < 1.35) viewH = Math.max(viewH, 7.7 / aspect);
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
    this.syncOffice(state.office);
    for (const e of state.empirians) this.ensureEmpirian(e.id, e.appearance);
    // Employees who left the studio (GT.1).
    for (const id of [...this.actors.keys()]) {
      if (id.startsWith('stress-') || state.empirians.some((e) => e.id === id)) continue;
      this.removeEmpirian(id);
    }
    // Each employee works at their own desk.
    for (const k of Object.keys(this.pois)) if (k.startsWith('seat:')) delete this.pois[k];
    for (const it of state.office.items) {
      if (!it.assignedTo) continue;
      const sp = useSpot(it);
      if (sp) this.pois[`seat:${it.assignedTo}`] = { x: sp.vx, z: sp.vz, heading: sp.heading, pose: 'sit' };
    }
    this.syncProducts(state.projects);
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
    for (const e of events) {
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
        case 'bug_created':
          this.bubbles.spawn(head, off, 'bug', now, { cooldown: 0.9 });
          actor.view.flash('frustrated', 0.9, now);
          break;
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
        case 'project_released':
          this.burstConfetti(actor);
          break;
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
  private drawScreen(): void {
    const ctx = this.screenCtx;
    const W = 40, H = 24;
    const mode = this.screenMode;
    if (mode === 'off') {
      ctx.fillStyle = '#2b2f3a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#4fae95';
      ctx.fillRect(17, 9, 6, 6);
      ctx.fillStyle = '#b8ffe6';
      ctx.fillRect(18, 10, 4, 4);
    } else if (mode === 'code') {
      ctx.fillStyle = '#1f2633';
      ctx.fillRect(0, 0, W, H);
      const colors = ['#7fd1b9', '#ffd27a', '#8ec5ff', '#ff8a7a', '#b9a6e8', '#e8e3da'];
      for (let row = 0; row < 7; row++) {
        const seed = (row + this.screenLine) * 7919;
        const indent = (seed >> 3) % 4;
        const len = 6 + ((seed >> 5) % 22);
        ctx.fillStyle = colors[(seed >> 2) % colors.length]!;
        ctx.fillRect(2 + indent * 2, 2 + row * 3, Math.min(len, W - 4 - indent * 2), 2);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2 + ((this.screenLine * 3) % 30), 2 + 6 * 3, 1, 2);
    } else if (mode === 'design') {
      ctx.fillStyle = '#f3e6d3';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#b9a6e8';
      ctx.fillRect(0, 0, 6, H);
      const t = this.screenLine;
      ctx.fillStyle = '#ff8a7a';
      ctx.fillRect(10 + (t % 6), 4, 8, 8);
      ctx.fillStyle = '#7fd1b9';
      ctx.fillRect(22, 6 + (t % 4), 10, 6);
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(14, 15, 18 - (t % 5), 4);
    } else if (mode === 'test') {
      ctx.fillStyle = '#1f2633';
      ctx.fillRect(0, 0, W, H);
      for (let row = 0; row < 6; row++) {
        const ok = ((row + this.screenLine) * 13) % 5 !== 0;
        ctx.fillStyle = ok ? '#4fae95' : '#e2675a';
        ctx.fillRect(2, 2 + row * 3.5, 2, 2);
        ctx.fillStyle = '#e8e3da';
        ctx.fillRect(6, 2 + row * 3.5, 10 + ((row * 7) % 18), 2);
      }
    } else {
      const t = this.screenLine;
      ctx.fillStyle = ['#ff8a7a', '#7fd1b9', '#f2c14e', '#8ec5ff'][t % 4]!;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(14, 6, 12, 12);
    }
    this.screenTex.needsUpdate = true;
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
      if (this.focus) {
        actor.pos = [center.x, center.z];
        actor.path = [];
        actor.targetName = 'center';
        actor.target = { ...center, pose: 'stand' };
      } else if (actor.targetName.startsWith('pin:')) {
        // gallery/debug pin: stay
      } else if (t < actor.coffeeUntil && activity !== 'raising_hand' && activity !== 'celebrating') {
        go('coffee');
      } else {
        let wanted = this.behaviourFor(activity);
        // Employees sit at their own desk (GT.1); only the founder uses the founder's seat.
        if (wanted === 'seat' && id !== state?.founderId) wanted = this.pois[`seat:${id}`] ? `seat:${id}` : 'center';
        // Concept work at the whiteboard when there is one (visible effect of the item).
        if (activity === 'thinking' && this.pois.whiteboard) wanted = 'whiteboard';
        if (wanted) go(wanted);
        else if (t > actor.nextWander) {
          const options = Object.keys(this.pois).filter((k) => (!['side', 'center'].includes(k) || k === 'center') && !k.startsWith('seat:'));
          go(options[Math.floor(Math.random() * options.length)]!);
          actor.nextWander = t + 5 + Math.random() * 5;
        }
      }
      const moving = actor.step(dt, speedFactor);
      actor.view.pose = actor.target.pose;
      actor.view.animate(t, dt, activity, energy, moving, speedFactor);
      const [px, pz] = actor.pos;
      const onRug = this.rugRects.some(([x0, z0, x1, z1]) => px >= x0 && px <= x1 && pz >= z0 && pz <= z1);
      actor.view.root.position.copy(fw(px, onRug && actor.target.pose !== 'lounge' && actor.target.pose !== 'sit' ? 1 : 0, pz));
      // Sticky bubble while waiting for the player.
      this.bubbles.setSticky(actor.view.head, 1.05, activity === 'raising_hand' ? 'alert' : null, t);
      if (id === state?.founderId) {
        const seated = !moving && actor.targetName === 'seat';
        if (actor.targetName === 'whiteboard' && !moving) actor.view.pose = 'think';
        this.screenMode = activity === 'celebrating' ? 'party' : seated && activity === 'coding' ? 'code' : seated && activity === 'designing' ? 'design' : seated && activity === 'testing' ? 'test' : seated && activity === 'thinking' ? 'design' : 'off';
      }
    }

    this.screenTimer += dt * Math.max(1, Math.min(speedFactor, 3));
    if (this.screenTimer > 0.18) {
      this.screenTimer = 0;
      this.screenLine++;
      this.drawScreen();
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
      return [id, r(a.pos[0]), r(a.pos[1]), r(v.heading), r(v.body.position.y), r(v.legL.rotation.x), r(v.armR.rotation.x), r(v.armR.rotation.z)];
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

