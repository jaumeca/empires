import { CanvasTexture, MeshBasicMaterial, NearestFilter, SRGBColorSpace } from 'three';

/**
 * Expressive monitors (block 3.1, 0.17.0). One tiny canvas texture PER ACTIVITY
 * (not per monitor): every screen in the office just points at the texture of
 * what its owner is doing. Only the textures in use are redrawn, a few times per
 * second of world time (so the pause freezes them too). No text, just patterns.
 */
export type ScreenMode = 'off' | 'code' | 'design' | 'test' | 'fix' | 'think' | 'party';
export const SCREEN_MODES: readonly ScreenMode[] = ['off', 'code', 'design', 'test', 'fix', 'think', 'party'];
const W = 40;
const H = 24;

export class ScreenDeck {
  private readonly canvases = new Map<ScreenMode, CanvasRenderingContext2D>();
  private readonly textures = new Map<ScreenMode, CanvasTexture>();
  private readonly materials = new Map<ScreenMode, MeshBasicMaterial>();

  constructor() {
    for (const m of SCREEN_MODES) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const tex = new CanvasTexture(c);
      tex.magFilter = NearestFilter; tex.minFilter = NearestFilter; tex.colorSpace = SRGBColorSpace;
      this.canvases.set(m, c.getContext('2d')!);
      this.textures.set(m, tex);
      this.materials.set(m, new MeshBasicMaterial({ map: tex }));
      this.draw(m, 0);
    }
  }

  material(m: ScreenMode): MeshBasicMaterial {
    return this.materials.get(m)!;
  }

  /** Redraws one activity's pattern for animation frame `line`. */
  draw(mode: ScreenMode, line: number): void {
    const ctx = this.canvases.get(mode)!;
    const box = (c: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    switch (mode) {
      case 'off':
        box('#2b2f3a', 0, 0, W, H); box('#4fae95', 17, 9, 6, 6); box('#b8ffe6', 18, 10, 4, 4);
        break;
      case 'code': {
        box('#1f2633', 0, 0, W, H);
        const colors = ['#7fd1b9', '#ffd27a', '#8ec5ff', '#ff8a7a', '#b9a6e8', '#e8e3da'];
        for (let row = 0; row < 7; row++) {
          // Integer hash per source line (lines scroll up as `line` grows).
          let seed = Math.imul(row + line + 1, 2654435761) >>> 0;
          seed ^= seed >>> 13;
          const indent = seed % 4;
          const len = 6 + ((seed >>> 4) % 22);
          box(colors[(seed >>> 9) % colors.length]!, 2 + indent * 2, 2 + row * 3, Math.min(len, W - 4 - indent * 2), 2);
        }
        box('#ffffff', 2 + ((line * 3) % 30), 2 + 6 * 3, 1, 2);
        break;
      }
      case 'design':
        box('#f3e6d3', 0, 0, W, H); box('#b9a6e8', 0, 0, 6, H);
        box('#ff8a7a', 10 + (line % 6), 4, 8, 8); box('#7fd1b9', 22, 6 + (line % 4), 10, 6); box('#f2c14e', 14, 15, 18 - (line % 5), 4);
        break;
      case 'test':
        box('#1f2633', 0, 0, W, H);
        for (let row = 0; row < 6; row++) {
          const ok = ((row + line) * 13) % 5 !== 0;
          // Whole pixels only (fractional rows blur on a nearest-filtered texture).
          box(ok ? '#4fae95' : '#e2675a', 2, 2 + row * 4, 2, 2);
          box('#e8e3da', 6, 2 + row * 4, 10 + ((row * 7) % 18), 2);
        }
        break;
      case 'fix': {
        // Squashing bugs: red bugs turn green one by one.
        box('#2a1f26', 0, 0, W, H);
        for (let i = 0; i < 6; i++) {
          const fixed = (i + line) % 7 < 3;
          const x = 3 + (i % 3) * 12, y = 3 + Math.floor(i / 3) * 10;
          box(fixed ? '#4fae95' : '#e2675a', x, y, 6, 5);
          box('#1f2633', x + 1, y + 1, 1, 1); box('#1f2633', x + 4, y + 1, 1, 1);
        }
        break;
      }
      case 'think':
        // Research and ideas: sticky notes being moved around a board.
        box('#fdf3dc', 0, 0, W, H);
        box('#f2c14e', 3 + (line % 3), 3, 9, 7); box('#7fd1b9', 15, 5 + (line % 2), 9, 7); box('#ff8a7a', 27 - (line % 3), 3, 9, 7);
        box('#8ec5ff', 9, 14, 10, 6); box('#3b3a40', 22, 16, 12, 1); box('#3b3a40', 22, 19, 8, 1);
        break;
      case 'party': {
        box(['#ff8a7a', '#7fd1b9', '#f2c14e', '#8ec5ff'][line % 4]!, 0, 0, W, H);
        box('#fffdf8', 14, 6, 12, 12);
        break;
      }
    }
    this.textures.get(mode)!.needsUpdate = true;
  }

  dispose(): void {
    for (const t of this.textures.values()) t.dispose();
    for (const m of this.materials.values()) m.dispose();
  }
}
