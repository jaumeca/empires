import {
  BoxGeometry, CanvasTexture, Color, DirectionalLight, DynamicDrawUsage, HemisphereLight, InstancedMesh, Matrix4,
  Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, Object3D, OrthographicCamera, PCFSoftShadowMap,
  PlaneGeometry, PointLight, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { SimEvent } from '../sim/core/events';
import type { Activity, Appearance, GameState, Project } from '../sim/model/state';
import { EmpirianView, VOXEL_MATERIAL, type Pose } from './empirianView';
import { BubbleSystem } from './bubbles';
import {
  buildArmchair, buildBookshelf, buildChair, buildCorkBoard, buildDesk, buildDeskLamp, buildKeyboard, buildMonitor, buildMug,
  buildPlant, buildPoster, buildProductBox, buildRoomShell, buildRug, ROOM,
} from './models/furniture';
import { CLOTH_COLORS, P, PALETTE_HEX } from './palette';
import { meshVoxels, VOXEL, type VoxelGrid } from './voxel';

export type CameraMode = 'iso' | 'dim';
export type TapTarget =
  | { kind: 'empirian'; id: string }
  | { kind: 'computer' | 'shelf' | 'poster' | 'plant' | 'window' | 'beanbag' | 'floor' }
  | { kind: 'product'; id: string };

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

const POIS: Record<string, Poi> = {
  seat: { x: 24.5, z: 17.5, heading: Math.PI, pose: 'sit' },
  window: { x: 46, z: 17, heading: Math.PI, pose: 'think' },
  shelf: { x: 13, z: 28, heading: -Math.PI / 2, pose: 'think' },
  beanbag: { x: 51.5, z: 39, heading: 0, pose: 'lounge' },
  center: { x: 30, z: 31, heading: Math.PI * 0.25, pose: 'stand' },
  plant: { x: 44, z: 13, heading: Math.atan2(10, -7), pose: 'stand' },
  side: { x: 38, z: 22, heading: Math.PI * 0.25, pose: 'raise' },
};

// Walkable cell grid (12×12 voxels per cell).
const CELLS_X = 5, CELLS_Z = 4;
const BLOCKED = new Set(['1,0', '2,0', '4,0', '0,1', '0,2', '4,3']);

function cellOf(x: number, z: number): [number, number] {
  return [Math.max(0, Math.min(CELLS_X - 1, Math.floor(x / 12))), Math.max(0, Math.min(CELLS_Z - 1, Math.floor(z / 12)))];
}

/** BFS over free cells; returns waypoint centers (floor voxels). */
export function findPath(from: [number, number], to: [number, number]): [number, number][] {
  const [sx, sz] = cellOf(...from);
  const [tx, tz] = cellOf(...to);
  const key = (x: number, z: number) => `${x},${z}`;
  const prev = new Map<string, string | null>([[key(sx, sz), null]]);
  const queue: [number, number][] = [[sx, sz]];
  while (queue.length) {
    const [x, z] = queue.shift()!;
    if (x === tx && z === tz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      const k = key(nx, nz);
      if (nx < 0 || nz < 0 || nx >= CELLS_X || nz >= CELLS_Z || prev.has(k)) continue;
      if (BLOCKED.has(k) && !(nx === tx && nz === tz)) continue;
      prev.set(k, key(x, z));
      queue.push([nx, nz]);
    }
  }
  const path: [number, number][] = [];
  let cur: string | null | undefined = key(tx, tz);
  if (!prev.has(cur)) return [to];
  while (cur) {
    const [x, z] = cur.split(',').map(Number) as [number, number];
    path.unshift([x * 12 + 6, z * 12 + 6]);
    cur = prev.get(cur);
  }
  path.shift(); // drop the starting cell center
  path.push(to);
  return path;
}

class EmpirianActor {
  pos: [number, number];
  path: [number, number][] = [];
  target: Poi;
  targetName = 'center';
  nextWander = 0;

  constructor(readonly view: EmpirianView, start: Poi) {
    this.pos = [start.x, start.z];
    this.target = start;
    this.view.heading = start.heading;
  }

  goTo(name: string): void {
    const poi = POIS[name];
    if (!poi || name === this.targetName) return;
    this.targetName = name;
    this.target = poi;
    this.path = findPath(this.pos, [poi.x, poi.z]);
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
    const lamp = new PointLight(0xffc670, 1.2, 3.2, 1.5);
    lamp.position.copy(fw(16, 19, 4));
    this.scene.add(lamp);
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
    const screen = new Mesh(new PlaneGeometry(10 * VOXEL, 6 * VOXEL), new MeshBasicMaterial({ map: this.screenTex }));
    screen.position.copy(fw(24, 17, 6.02));
    screen.rotation.y = 0; // faces +z (toward the sitter and the camera)
    screen.userData.kind = 'computer';
    this.scene.add(screen);
    this.pickables.push(screen);
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
    this.place(buildRug(), 16, 0, 22, 'floor', 0.02).castShadow = false;
    this.place(buildDesk(), 12, 0, 1, 'computer');
    this.place(buildMonitor(), 18, 10, 3, 'computer');
    this.place(buildKeyboard(), 20, 10, 8, 'computer');
    this.place(buildMug(), 31, 10, 6);
    this.place(buildDeskLamp(), 13, 10, 2);
    this.place(buildChair(), 20, 0, 13);
    this.place(buildPlant(), 47, 0, 0, 'plant');
    this.place(buildBookshelf(), 0, 0, 20, 'shelf');
    this.place(buildPoster(), 2, 18, 0, 'poster', 0.01);
    this.place(buildCorkBoard(), 0, 16, 5, 'poster', 0.01);
    this.place(buildArmchair(), 45, 0, 33, 'beanbag');
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
    const actor = new EmpirianActor(view, POIS.center!);
    this.actors.set(id, actor);
    this.scene.add(view.root);
    view.root.traverse((o) => {
      if (o instanceof Mesh) this.pickables.push(o);
    });
    return view;
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
    for (const e of state.empirians) this.ensureEmpirian(e.id, e.appearance);
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
    const slots: [number, number, number][] = [[1.5, 25, 21.5], [1.5, 25, 26], [1.5, 25, 30.5], [1.5, 9 + 7, 30], [2.5, 32, 22], [2.5, 32, 27]];
    const released = projects.filter((p) => p.phase === 'released');
    released.forEach((p, i) => {
      if (this.productBoxes.has(p.id) || i >= slots.length) return;
      let h = 0;
      for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const cover = CLOTH_COLORS[h % CLOTH_COLORS.length]!;
      const accent = h % 2 ? P.white : P.ink;
      const [x, y, z] = slots[i]!;
      const m = this.place(buildProductBox(cover, accent, h), x, y, z, 'product', 0.02);
      m.userData.productId = p.id;
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
  update(dt: number, t: number, speedFactor: number): void {
    const state = this.lastState;
    for (const [id, actor] of this.actors) {
      const e = state?.empirians.find((x) => x.id === id);
      const activity: Activity = e?.activity ?? 'idle';
      const energy = e?.energy ?? 100;
      if (this.focus) {
        actor.pos = [POIS.center!.x, POIS.center!.z];
        actor.path = [];
        actor.targetName = 'center';
        actor.target = { ...POIS.center!, pose: 'stand' };
      } else {
        const wanted = this.behaviourFor(activity);
        if (wanted) actor.goTo(wanted);
        else if (t > actor.nextWander) {
          const options = ['window', 'shelf', 'center', 'plant', 'beanbag', 'seat'];
          actor.goTo(options[Math.floor(Math.random() * options.length)]!);
          actor.nextWander = t + 5 + Math.random() * 5;
        }
      }
      const moving = actor.step(dt, speedFactor);
      actor.view.pose = actor.target.pose;
      actor.view.animate(t, dt, activity, energy, moving, speedFactor);
      const onRug = actor.pos[0] >= 16 && actor.pos[0] <= 42 && actor.pos[1] >= 22 && actor.pos[1] <= 40;
      actor.view.root.position.copy(fw(actor.pos[0], onRug && actor.targetName !== 'beanbag' ? 1 : 0, actor.pos[1]));
      // Sticky bubble while waiting for the player.
      this.bubbles.setSticky(actor.view.head, 1.05, activity === 'raising_hand' ? 'alert' : null, t);
      if (id === state?.founderId) {
        const seated = !moving && actor.targetName === 'seat';
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
    this.renderer.render(this.scene, this.camera);
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
    el.addEventListener('pointermove', (ev) => {
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
      if (moved < 12 && performance.now() - down.t < 600) this.pick(ev.clientX, ev.clientY);
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
    // Empirians are small: prefer them if hit at all.
    const emp = hits.find((h) => h.object.userData.empirianId);
    let target: TapTarget | null = null;
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

