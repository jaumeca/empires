import { hexToCss, PALETTE_HEX } from './palette';

/**
 * Face decals (ART_DIRECTION §3.2): a 10×10 pixel face painted on a plane in
 * front of the head. Expressions swap instantly at almost no cost.
 */
export type Expression =
  | 'neutral' | 'focused' | 'happy' | 'joyful' | 'tired' | 'frustrated' | 'surprised' | 'thinking' | 'blink';

// Legend: e eye, h eye highlight, b brow, m mouth, t tongue/open mouth, c cheek, z closed eye
const FACES: Record<Expression, string[]> = {
  neutral: [
    '..........', '..........', '.bb....bb.', '..........', '..eh...eh.',
    '..ee...ee.', '..........', '.c..mm..c.', '..........', '..........',
  ],
  focused: [
    '..........', '..........', '..bb..bb..', '...b..b...', '..eh...eh.',
    '..ee...ee.', '..........', '....mm....', '..........', '..........',
  ],
  happy: [
    '..........', '..........', '.bb....bb.', '..........', '..eh...eh.',
    '..ee...ee.', '..........', '.c.m..m.c.', '....mm....', '..........',
  ],
  joyful: [
    '..........', '.bb....bb.', '..........', '..........', '.z.z..z.z.',
    '..z....z..', '..........', '.cmmmmmmc.', '..mttttm..', '...mmmm...',
  ],
  tired: [
    '..........', '..........', '..........', '.bb....bb.', '..zzz.zzz.',
    '..ee...ee.', '..........', '....mm....', '..........', '..........',
  ],
  frustrated: [
    '..........', '..........', '..b....b..', '...b..b...', '..eh...eh.',
    '..ee...ee.', '..........', '...mmmm...', '..m....m..', '..........',
  ],
  surprised: [
    '..........', '.bb....bb.', '..........', '..ee...ee.', '..eh...eh.',
    '..ee...ee.', '..........', '....mm....', '....mm....', '..........',
  ],
  thinking: [
    '..........', '..........', '.bb.....bb', '........b.', '...eh...eh',
    '...ee...ee', '..........', '.....mmm..', '..........', '..........',
  ],
  blink: [
    '..........', '..........', '.bb....bb.', '..........', '..........',
    '..zz...zz.', '..........', '.c..mm..c.', '..........', '..........',
  ],
};

export function drawFace(ctx: CanvasRenderingContext2D, expr: Expression, skinIdx: number, scale = 4): void {
  const skin = hexToCss(PALETTE_HEX[skinIdx] ?? 0xf6cfa9);
  const rows = FACES[expr];
  ctx.clearRect(0, 0, 10 * scale, 10 * scale);
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 10 * scale, 10 * scale);
  const colors: Record<string, string> = {
    e: '#2e2420', z: '#2e2420', b: '#4a3328', m: '#7a3b33', t: '#ff8a7a', h: '#ffffff', c: 'rgba(255,120,120,0.45)',
  };
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = colors[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
}
