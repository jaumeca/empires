import {
  CanvasTexture, Group, Mesh, MeshLambertMaterial, NearestFilter, PlaneGeometry, SRGBColorSpace, type Material,
} from 'three';
import type { Activity, Appearance } from '../sim/model/state';
import { drawFace, type Expression } from './face';
import { buildEmpirianParts, partColors, SKELETON, type PartDef } from './models/empirian';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { meshVoxels, VOXEL } from './voxel';

export const EMPIRIAN_SCALE = 0.78;
export const VOXEL_MATERIAL = new MeshLambertMaterial({ vertexColors: true });

function partMesh(def: PartDef, name: string): Mesh {
  const m = new Mesh(meshVoxels(def.grid, { origin: def.origin, jitter: 0.02 }), VOXEL_MATERIAL);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

import { applyGesture, GESTURE_DUR, gestureExpression, type Gesture } from './gestures';

export type Pose = 'stand' | 'walk' | 'sit' | 'cheer' | 'raise' | 'think' | 'lounge';

/**
 * Three.js representation of one Empirian: a rigid skeleton of groups with
 * voxel parts attached. Animation is procedural (ART_DIRECTION §3.5).
 * Purely visual: it reads simulation state and never changes it.
 */
export class EmpirianView {
  readonly root = new Group();
  readonly body = new Group();
  readonly hips = new Group();
  readonly torso = new Group();
  readonly head = new Group();
  readonly armL = new Group();
  readonly armR = new Group();
  readonly legL = new Group();
  readonly legR = new Group();
  private faceCanvas: HTMLCanvasElement | null = null;
  private faceTex: CanvasTexture | null = null;
  private faceMesh: Mesh | null = null;
  private expression: Expression = 'neutral';
  private flashExpr: { expr: Expression; until: number } | null = null;
  private nextBlink = 2;
  private appearance!: Appearance;
  pose: Pose = 'stand';
  /** Apply the next pose instantly (no easing). Cleared after one frame. */
  snap = false;
  /** The gesture being played (0.18.0), on world time. */
  private gesture: { g: Gesture; start: number; dur: number; yaw: number } | null = null;
  /** Facing angle (radians, 0 = +z). */
  heading = 0;
  private walkPhase = 0;

  constructor(appearance: Appearance, readonly id: string) {
    this.root.name = `empirian:${id}`;
    // Characters use a slightly smaller voxel than the set so the room reads as a
    // miniature (ART_DIRECTION §4.2, decision logged in DEVELOPMENT_LOG).
    this.root.scale.setScalar(EMPIRIAN_SCALE);
    this.root.add(this.body);
    this.body.add(this.hips);
    this.hips.position.y = SKELETON.hipsY * VOXEL;
    this.hips.add(this.legL, this.legR, this.torso);
    this.legL.position.x = -SKELETON.legX * VOXEL;
    this.legR.position.x = SKELETON.legX * VOXEL;
    this.torso.add(this.head, this.armL, this.armR);
    this.head.position.y = SKELETON.headY * VOXEL;
    this.armL.position.set(-SKELETON.armX * VOXEL, SKELETON.armY * VOXEL, 0);
    this.armR.position.set(SKELETON.armX * VOXEL, SKELETON.armY * VOXEL, 0);
    this.setAppearance(appearance);
  }

  setAppearance(a: Appearance): void {
    this.appearance = { ...a };
    for (const g of [this.head, this.torso, this.armL, this.armR, this.legL, this.legR]) {
      for (const child of [...g.children]) {
        if (child instanceof Mesh && child.name.startsWith('part:')) {
          g.remove(child);
          child.geometry.dispose();
        }
      }
    }
    const parts = buildEmpirianParts(a);
    // Head and hair share a bone: one merged mesh = one draw call less per Empirian.
    const headGeo = meshVoxels(parts.head.grid, { origin: parts.head.origin, jitter: 0.02 });
    const hairGeo = meshVoxels(parts.hair.grid, { origin: parts.hair.origin, jitter: 0.02 });
    const merged = mergeGeometries([headGeo, hairGeo]) ?? headGeo;
    if (merged !== headGeo) headGeo.dispose();
    hairGeo.dispose();
    const headMesh = new Mesh(merged, VOXEL_MATERIAL);
    headMesh.name = 'part:head';
    headMesh.castShadow = headMesh.receiveShadow = true;
    this.head.add(headMesh);
    this.torso.add(partMesh(parts.torso, 'part:torso'));
    this.armL.add(partMesh(parts.armL, 'part:armL'));
    this.armR.add(partMesh(parts.armR, 'part:armR'));
    this.legL.add(partMesh(parts.legL, 'part:legL'));
    this.legR.add(partMesh(parts.legR, 'part:legR'));
    // Every mesh points back to this Empirian for tap detection.
    this.root.traverse((o) => (o.userData.empirianId = this.id));
    this.ensureFace();
    this.redrawFace();
  }

  private ensureFace(): void {
    if (this.faceMesh || typeof document === 'undefined') return;
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = this.faceCanvas.height = 40;
    this.faceTex = new CanvasTexture(this.faceCanvas);
    this.faceTex.magFilter = NearestFilter;
    this.faceTex.minFilter = NearestFilter;
    this.faceTex.colorSpace = SRGBColorSpace;
    const mat = new MeshLambertMaterial({ map: this.faceTex });
    this.faceMesh = new Mesh(new PlaneGeometry(10 * VOXEL, 10 * VOXEL), mat);
    this.faceMesh.name = 'face';
    this.faceMesh.position.set(0, 5 * VOXEL, SKELETON.faceZ * VOXEL + 0.002);
    this.faceMesh.userData.empirianId = this.id;
    this.head.add(this.faceMesh);
  }

  private redrawFace(): void {
    if (!this.faceCanvas || !this.faceTex) return;
    const ctx = this.faceCanvas.getContext('2d');
    if (!ctx) return;
    drawFace(ctx, this.expression, partColors(this.appearance).skin, 4);
    this.faceTex.needsUpdate = true;
  }

  setExpression(e: Expression): void {
    if (e === this.expression) return;
    this.expression = e;
    this.redrawFace();
  }

  /** Plays a small gesture (stretch, eureka, wave…). `yaw` = where to look, relative to the body. */
  playGesture(g: Gesture, now: number, yaw = 0): void {
    this.gesture = { g, start: now, dur: GESTURE_DUR[g], yaw };
  }

  /** The gesture under way, if any (for tests and for not interrupting one with another). */
  currentGesture(now: number): Gesture | null {
    return this.gesture && now < this.gesture.start + this.gesture.dur ? this.gesture.g : null;
  }

  /** Temporarily shows an expression (e.g. frustration when a bug appears). */
  flash(expr: Expression, seconds: number, now: number): void {
    this.flashExpr = { expr, until: now + seconds };
  }

  baseExpression(activity: Activity, energy: number): Expression {
    if (energy < 25 && activity !== 'celebrating') return 'tired';
    switch (activity) {
      case 'coding':
      case 'testing':
        return 'focused';
      case 'designing':
        return 'happy';
      case 'thinking':
        return 'thinking';
      case 'raising_hand':
        return 'surprised';
      case 'celebrating':
        return 'joyful';
      case 'resting':
        return 'tired';
      default:
        return 'neutral';
    }
  }

  /** Per-frame animation. `t` = seconds since start, `dt` = frame delta. */
  animate(t: number, dt: number, activity: Activity, energy: number, moving: boolean, speedFactor: number): void {
    // Face
    let expr = this.baseExpression(activity, energy);
    const gst = this.gesture;
    const gp = gst ? (t - gst.start) / gst.dur : 1;
    if (gst && gp >= 1) this.gesture = null; // (p < 0: scheduled, not started yet)
    const gexpr = this.gesture ? gestureExpression(this.gesture.g, gp) : null;
    if (gexpr) expr = gexpr;
    if (this.flashExpr && t < this.flashExpr.until) expr = this.flashExpr.expr;
    if (t > this.nextBlink) {
      if (t < this.nextBlink + 0.12) expr = expr === 'joyful' ? expr : 'blink';
      else this.nextBlink = t + 2 + Math.random() * 3;
    }
    this.setExpression(expr);

    // Reset rotations toward neutral each frame (simple damped targets).
    const target = {
      bodyY: 0, legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: 0.06, armRz: -0.06,
      headX: 0, headY: 0, headZ: 0, torsoY: 0, headSquash: 1,
    };
    const s = Math.max(1, Math.min(speedFactor, 3));
    const pose: Pose = moving ? 'walk' : this.pose;

    switch (pose) {
      case 'walk': {
        this.walkPhase += dt * 11 * s;
        const w = Math.sin(this.walkPhase);
        target.legL = w * 0.6;
        target.legR = -w * 0.6;
        target.armLx = -w * 0.55;
        target.armRx = w * 0.55;
        target.bodyY = Math.abs(Math.cos(this.walkPhase)) * 0.8 * VOXEL;
        target.headSquash = 1 - Math.abs(Math.sin(this.walkPhase)) * 0.04;
        break;
      }
      case 'sit': {
        target.legL = target.legR = -Math.PI / 2;
        target.bodyY = 2.7 * VOXEL; // hips on the chair seat
        const typing = activity === 'coding' || activity === 'testing';
        if (typing) {
          const k = Math.sin(t * 14 * s);
          target.armLx = -1.15 + k * 0.1;
          target.armRx = -1.15 - k * 0.1;
          target.headX = activity === 'testing' ? 0.22 : 0.12;
          target.headY = activity === 'testing' ? Math.sin(t * 1.3) * 0.25 : 0;
        } else if (activity === 'designing') {
          target.armLx = -1.0;
          target.armRx = -1.1 + Math.sin(t * 3 * s) * 0.15;
          target.armRz = -0.2 + Math.cos(t * 3 * s) * 0.15;
          target.headZ = Math.sin(t * 0.8) * 0.08;
        } else if (activity === 'thinking') {
          target.armRx = -2.4;
          target.armRz = 0.35;
          target.headZ = 0.15;
          target.headX = -0.1;
        } else {
          target.armLx = target.armRx = -0.3;
          target.headX = energy < 25 ? 0.35 : 0.05;
        }
        break;
      }
      case 'lounge': {
        target.legL = target.legR = -1.35;
        target.bodyY = 2.2 * VOXEL; // sitting in the armchair
        target.armLz = 0.6;
        target.armRz = -0.6;
        target.headX = -0.25;
        target.headZ = Math.sin(t * 0.6) * 0.1;
        target.torsoY = Math.sin(t * 1.5) * 0.2 * VOXEL;
        break;
      }
      case 'raise': {
        target.armRx = -Math.PI + Math.sin(t * 6) * 0.08;
        target.armRz = -0.15 + Math.sin(t * 9) * 0.12;
        target.bodyY = Math.max(0, Math.sin(t * 4)) * 1.2 * VOXEL;
        target.headZ = 0.12;
        break;
      }
      case 'cheer': {
        const j = Math.abs(Math.sin(t * 7));
        target.bodyY = j * 4 * VOXEL;
        target.armLx = target.armRx = -Math.PI + 0.2;
        // Arms up and open (with the arm raised, the outward direction flips sign: 0.18.0 fix, they were hidden behind the head).
        target.armLz = -0.5 - j * 0.2;
        target.armRz = 0.5 + j * 0.2;
        target.legL = target.legR = -j * 0.3;
        target.headX = -0.15;
        break;
      }
      case 'think': {
        target.armRx = -2.4;
        target.armRz = 0.35;
        target.headZ = 0.15;
        target.torsoY = Math.sin(t * 2) * 0.25 * VOXEL;
        break;
      }
      default: {
        if (activity === 'chatting') {
          // Talking: nods and hand gestures.
          target.headX = Math.sin(t * 5) * 0.12;
          target.armRx = -0.9 + Math.sin(t * 4) * 0.35;
          target.armRz = -0.25;
          target.torsoY = Math.sin(t * 2.2) * 0.25 * VOXEL;
          break;
        }
        if (activity === 'drinking') {
          // Sip every few seconds.
          const sip = (t % 3) < 1.1;
          target.armRx = sip ? -2.3 : -0.9;
          target.armRz = -0.15;
          target.headX = sip ? -0.2 : 0;
          break;
        }
        // Idle: breathing and small look-arounds.
        target.torsoY = Math.sin(t * 2.2) * 0.25 * VOXEL;
        target.headY = Math.sin(t * 0.5) * 0.25;
        target.armLz = 0.06 + Math.sin(t * 2.2) * 0.03;
        target.armRz = -0.06 - Math.sin(t * 2.2) * 0.03;
      }
    }

    // Gestures on top of the pose (only head/arms when seated or lounging: no new chair collisions).
    if (this.gesture) {
      const g = this.gesture.g;
      const walkingOk = g === 'wave' || g === 'look' || g === 'nod';
      if (!moving || walkingOk) applyGesture(target, g, gp, t, pose === 'sit' || pose === 'lounge', this.gesture.yaw, VOXEL);
    }

    // `snap`: jump straight to the pose (editor preview while the world is paused).
    const k = this.snap ? 1 : 1 - Math.exp(-dt * 14);
    const lerp = (a: number, b: number) => a + (b - a) * k;
    this.body.position.y = lerp(this.body.position.y, target.bodyY);
    this.torso.position.y = lerp(this.torso.position.y, target.torsoY);
    this.legL.rotation.x = lerp(this.legL.rotation.x, target.legL);
    this.legR.rotation.x = lerp(this.legR.rotation.x, target.legR);
    this.armL.rotation.x = lerp(this.armL.rotation.x, target.armLx);
    this.armR.rotation.x = lerp(this.armR.rotation.x, target.armRx);
    this.armL.rotation.z = lerp(this.armL.rotation.z, target.armLz);
    this.armR.rotation.z = lerp(this.armR.rotation.z, target.armRz);
    this.head.rotation.x = lerp(this.head.rotation.x, target.headX);
    this.head.rotation.y = lerp(this.head.rotation.y, target.headY);
    this.head.rotation.z = lerp(this.head.rotation.z, target.headZ);
    this.head.scale.y = lerp(this.head.scale.y, target.headSquash);

    // Smooth turning
    let d = this.heading - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * (this.snap ? 1 : 1 - Math.exp(-dt * 10));
    this.snap = false;
  }

  /** Height of the top of the head in world units (for bubbles). */
  headTop(): number {
    return (SKELETON.hipsY + SKELETON.torsoTop + 10 + 3) * VOXEL * EMPIRIAN_SCALE;
  }

  dispose(): void {
    this.root.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        if (o.material !== VOXEL_MATERIAL) (o.material as Material).dispose();
      }
    });
    this.faceTex?.dispose();
  }
}
