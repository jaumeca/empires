import { P, PALETTE_HEX } from './palette';
import { VoxelGrid } from './voxel';
import type { Project } from '../sim/model/state';

/**
 * Each game's own look (0.19.0, "productos con identidad"): the same design for
 * its physical box on the shelf and for the cover shown in cards. Derived only
 * from the game itself — topic, size, score, name, updates — so old saves get
 * their boxes back too. Original designs made in code (ASSET_REGISTRY).
 */
export interface ProductArt {
  cover: number; // palette index
  band: number; // top band colour
  motif: number; // motif colour
  /** 4×4 motif drawn on the front (1 = motif colour). */
  pattern: number[];
  /** Gold seal for hits (≥ 8), a small star for good games (≥ 7). */
  seal: 'gold' | 'star' | null;
  /** Medium games come in a bigger box. */
  big: boolean;
  /** One sticker per content update (GT.6). */
  updates: number;
}

const TOPIC: Record<string, { covers: number[]; band: number; motif: number; pattern: number[] }> = {
  // Karts: a chequered flag.
  kart: { covers: [P.coral, P.coralDark], band: P.white, motif: P.ink, pattern: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1] },
  // Pirates: a little skull.
  pirates: { covers: [P.ink, P.woodDeep], band: P.mustard, motif: P.white, pattern: [0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0] },
  // Cooking: a pot with steam.
  cooking: { covers: [P.mustard, P.cream], band: P.coral, motif: P.terracottaDark, pattern: [0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0] },
  // Robots: a robot face.
  robots: { covers: [P.lavender, P.sky], band: P.metalDark, motif: P.mint, pattern: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0] },
};

const hashName = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

export function productArt(p: Pick<Project, 'topicId' | 'size' | 'name' | 'id'> & { result?: Pick<NonNullable<Project['result']>, 'averageScore' | 'support'> }): ProductArt {
  const t = TOPIC[p.topicId] ?? { covers: [P.mint, P.sky], band: P.white, motif: P.ink, pattern: [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0] };
  const h = hashName(p.name || p.id);
  const score = p.result?.averageScore ?? 0;
  return {
    cover: t.covers[h % t.covers.length]!,
    band: t.band,
    motif: t.motif,
    pattern: t.pattern,
    seal: score >= 8 ? 'gold' : score >= 7 ? 'star' : null,
    big: p.size === 'medium',
    updates: Math.min(2, p.result?.support?.updates ?? 0),
  };
}

/** The physical box (faces +x, like the old one): 2 deep, 6 tall, 4 wide (5 for medium games: fits every shelf). */
export function productBox(a: ProductArt): VoxelGrid {
  const H = 6, W = a.big ? 5 : 4;
  const g = new VoxelGrid(2, H, W);
  g.box(0, 0, 0, 2, H, W, a.cover);
  g.box(0, H - 1, 0, 2, H, W, a.band); // top band
  g.box(1, 0, 0, 2, 1, W, P.white); // label strip at the bottom of the front
  // Motif in the middle of the front (x = 1).
  const ox = Math.floor((W - 4) / 2), oy = 1 + Math.floor((H - 2 - 4) / 2);
  for (let i = 0; i < 16; i++) if (a.pattern[i]) g.set(1, oy + 3 - Math.floor(i / 4), ox + (i % 4), a.motif);
  if (a.seal) g.set(1, H - 2, W - 1, a.seal === 'gold' ? P.mustard : P.white);
  for (let u = 0; u < a.updates; u++) g.set(1, 0, u, P.mint); // update stickers
  return g;
}

const css = (i: number) => `#${(PALETTE_HEX[i] ?? 0).toString(16).padStart(6, '0')}`;

/** The cover, drawn in 2D for cards (same design as the box). */
export function drawCover(ctx: CanvasRenderingContext2D, a: ProductArt, name: string, w: number, hgt: number): void {
  const px = w / 8;
  ctx.fillStyle = css(a.cover); ctx.fillRect(0, 0, w, hgt);
  ctx.fillStyle = css(a.band); ctx.fillRect(0, 0, w, px * 1.4);
  const ox = px * 2, oy = px * 3;
  ctx.fillStyle = css(a.motif);
  for (let i = 0; i < 16; i++) if (a.pattern[i]) ctx.fillRect(ox + (i % 4) * px, oy + Math.floor(i / 4) * px, px, px);
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, hgt - px * 2.2, w, px * 2.2);
  ctx.fillStyle = '#2e2420';
  ctx.font = `900 ${Math.round(px * 1.2)}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 12), w / 2, hgt - px * 1.1, w - 4);
  if (a.seal) {
    ctx.fillStyle = a.seal === 'gold' ? css(P.mustard) : '#fffdf8';
    ctx.beginPath(); ctx.arc(w - px * 1.3, px * 2.8, px * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  for (let u = 0; u < a.updates; u++) { ctx.fillStyle = css(P.mint); ctx.fillRect(px * 0.4 + u * px * 1.2, hgt - px * 3.4, px, px); }
}
