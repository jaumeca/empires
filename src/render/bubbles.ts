import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial, SRGBColorSpace, type Object3D, type Scene } from 'three';
import { drawIcon, type IconName } from './icons';

const textureCache = new Map<IconName, CanvasTexture>();

/** Voxel-style speech bubble (cube with a pointed corner) with a pixel icon. */
function bubbleTexture(icon: IconName): CanvasTexture {
  const hit = textureCache.get(icon);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // Pixel-art bubble body (rounded by trimming corner pixels) + tail.
  const u = 4;
  ctx.fillStyle = '#2e2420';
  ctx.fillRect(2 * u, 1 * u, 12 * u, 11 * u);
  ctx.fillRect(1 * u, 2 * u, 14 * u, 9 * u);
  ctx.fillRect(5 * u, 12 * u, 3 * u, 1 * u);
  ctx.fillRect(5 * u, 13 * u, 1 * u, 2 * u);
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(2 * u, 2 * u, 12 * u, 9 * u);
  ctx.fillRect(3 * u, 1.5 * u, 10 * u, 10 * u);
  ctx.fillRect(6 * u, 11 * u, 1 * u, 2 * u);
  ctx.fillStyle = '#e9d6bd';
  ctx.fillRect(2 * u, 10 * u, 12 * u, 1 * u);
  drawIcon(ctx, icon, 4 * u, 2.5 * u, 8 * u);
  const tex = new CanvasTexture(c);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.colorSpace = SRGBColorSpace;
  textureCache.set(icon, tex);
  return tex;
}

interface Bubble {
  sprite: Sprite;
  born: number;
  life: number;
  rise: number;
  anchor: Object3D;
  offsetY: number;
  sticky: boolean;
}

/**
 * Floating bubbles over Empirians, driven by simulation events (ART_DIRECTION §5).
 * Max one sticky + a few short-lived bubbles per anchor; per-kind cooldowns
 * avoid spam at high game speeds.
 */
export class BubbleSystem {
  private bubbles: Bubble[] = [];
  private cooldowns = new Map<string, number>();

  constructor(private scene: Scene) {}

  spawn(anchor: Object3D, offsetY: number, icon: IconName, now: number, opts: { cooldown?: number; life?: number; sticky?: boolean } = {}): void {
    const key = `${anchor.uuid}:${icon}`;
    if (!opts.sticky && (this.cooldowns.get(key) ?? 0) > now) return;
    this.cooldowns.set(key, now + (opts.cooldown ?? 1.0));
    const transient = this.bubbles.filter((b) => b.anchor === anchor && !b.sticky);
    if (!opts.sticky && transient.length >= 3) this.remove(transient[0]!);
    const mat = new SpriteMaterial({ map: bubbleTexture(icon), transparent: true, depthTest: false });
    const sprite = new Sprite(mat);
    sprite.renderOrder = 10;
    sprite.scale.set(0.42, 0.42, 1);
    sprite.userData.bubbleIcon = icon;
    this.scene.add(sprite);
    this.bubbles.push({ sprite, born: now, life: opts.life ?? 1.6, rise: opts.sticky ? 0 : 0.55, anchor, offsetY, sticky: !!opts.sticky });
  }

  setSticky(anchor: Object3D, offsetY: number, icon: IconName | null, now: number): void {
    const current = this.bubbles.find((b) => b.anchor === anchor && b.sticky);
    if (current && current.sprite.userData.bubbleIcon === icon) return;
    if (current) this.remove(current);
    if (icon) this.spawn(anchor, offsetY, icon, now, { sticky: true, life: Infinity });
  }

  private remove(b: Bubble): void {
    this.scene.remove(b.sprite);
    b.sprite.material.dispose();
    this.bubbles = this.bubbles.filter((x) => x !== b);
  }

  update(now: number): void {
    for (const b of [...this.bubbles]) {
      const age = now - b.born;
      if (age > b.life) {
        this.remove(b);
        continue;
      }
      const p = b.anchor.getWorldPosition(b.sprite.position);
      const lift = b.sticky ? Math.sin(now * 3) * 0.03 : (age / b.life) * b.rise;
      const stackShift = b.sticky ? 0.12 : 0.28;
      p.y += b.offsetY + lift + stackShift;
      const pop = Math.min(1, age / 0.15);
      const s = 0.42 * (0.6 + 0.4 * pop);
      b.sprite.scale.set(s, s, 1);
      b.sprite.material.opacity = b.sticky ? 1 : Math.min(1, (b.life - age) / 0.4);
    }
  }

  activeIcons(): string[] {
    return this.bubbles.map((b) => b.sprite.userData.bubbleIcon as string);
  }
}
