/**
 * Original 8×8 pixel-art icons shared by in-world bubbles and the HTML UI
 * (ART_DIRECTION §5, §6). Drawn on canvas so they never depend on emoji fonts.
 */
export type IconName =
  | 'code' | 'design' | 'bug' | 'check' | 'idea' | 'star' | 'sweat' | 'test' | 'zzz' | 'alert' | 'coin' | 'heart'
  | 'pause' | 'play' | 'menu' | 'clock' | 'box' | 'rocket' | 'calendar';

const ICONS: Record<IconName, { px: string[]; colors: Record<string, string> }> = {
  code: { px: ['....b...', '..a.bc..', '.a..b.c.', 'a..b...c', '.a.b..c.', '..ab.c..', '...b....', '........'], colors: { a: '#3d9c84', b: '#2e2420', c: '#3d9c84' } },
  design: { px: ['......aa', '.....aaa', '....aaa.', '...aaa..', '..bba...', '.bbb....', '.bb.....', 'c.......'], colors: { a: '#b9a6e8', b: '#ff8a7a', c: '#8c5a3c' } },
  bug: { px: ['.a....a.', '..a..a..', '..bbbb..', 'abbccbba', '.bccccb.', 'abbccbba', '.bbbbbb.', 'a.b..b.a'], colors: { a: '#2e2420', b: '#e2675a', c: '#ff8a7a' } },
  check: { px: ['........', '.......a', '......aa', '.....aa.', 'a...aa..', 'aa.aa...', '.aaa....', '..a.....'], colors: { a: '#4fae95' } },
  idea: { px: ['..aaaa..', '.abbbba.', 'abbbbbba', 'abbbbbba', '.abbbba.', '..abba..', '..cccc..', '...cc...'], colors: { a: '#d4a33a', b: '#ffe08a', c: '#8c8580' } },
  star: { px: ['...aa...', '...aa...', 'aaabbaaa', '.abbbba.', '..abba..', '.abaaba.', '.aa..aa.', '........'], colors: { a: '#f2c14e', b: '#ffe08a' } },
  sweat: { px: ['....a...', '...aa...', '..abaa..', '.abbbaa.', '.abbbba.', '.aabbaa.', '..aaaa..', '........'], colors: { a: '#6ea5df', b: '#c9e4ff' } },
  test: { px: ['.aaaa...', 'abbbba..', 'abbbba..', 'abbbba..', '.aaaac..', '.....cc.', '......cc', '.......c'], colors: { a: '#5f5a57', b: '#c9e4ff', c: '#8c5a3c' } },
  zzz: { px: ['....aaaa', '.....a..', '....aaaa', 'aaa.....', '..a.....', '.a......', 'aaa.....', '........'], colors: { a: '#8a6ae6' } },
  alert: { px: ['...aa...', '...aa...', '...aa...', '...aa...', '...aa...', '........', '...aa...', '...aa...'], colors: { a: '#e2675a' } },
  coin: { px: ['..aaaa..', '.abbbba.', 'abbabbba', 'abbabbba', 'abbabbba', 'abbabbba', '.abbbba.', '..aaaa..'], colors: { a: '#d4a33a', b: '#f2c14e' } },
  heart: { px: ['........', '.aa..aa.', 'abbaabba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...', '........'], colors: { a: '#c9547d', b: '#ff8fb4' } },
  pause: { px: ['........', '.aa..aa.', '.aa..aa.', '.aa..aa.', '.aa..aa.', '.aa..aa.', '.aa..aa.', '........'], colors: { a: '#3b3a40' } },
  play: { px: ['........', '.a......', '.aaa....', '.aaaaa..', '.aaaaa..', '.aaa....', '.a......', '........'], colors: { a: '#3b3a40' } },
  menu: { px: ['........', '.aaaaaa.', '........', '.aaaaaa.', '........', '.aaaaaa.', '........', '........'], colors: { a: '#3b3a40' } },
  clock: { px: ['..aaaa..', '.abbbba.', 'abbabbba', 'abbabbba', 'abbaaaba', 'abbbbbba', '.abbbba.', '..aaaa..'], colors: { a: '#3b3a40', b: '#fff7e8' } },
  box: { px: ['........', '.aaaaaa.', '.abbbba.', '.abccba.', '.abccba.', '.abbbba.', '.aaaaaa.', '........'], colors: { a: '#8c5a3c', b: '#ff8a7a', c: '#fff7e8' } },
  rocket: { px: ['...aa...', '..abba..', '..abba..', '..aaaa..', '.aaaaaa.', '.a.cc.a.', '...cc...', '...c....'], colors: { a: '#ff8a7a', b: '#c9e4ff', c: '#f2c14e' } },
  calendar: { px: ['.a....a.', 'bbbbbbbb', 'cccccccc', 'cacacaca', 'cccccccc', 'cacacacc', 'cccccccc', '........'], colors: { a: '#3b3a40', b: '#ff8a7a', c: '#fff7e8' } },
};

export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number): void {
  const icon = ICONS[name];
  const s = size / 8;
  icon.px.forEach((row, r) =>
    [...row].forEach((ch, col) => {
      const color = icon.colors[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + col * s), Math.round(y + r * s), Math.ceil(s), Math.ceil(s));
    }),
  );
}

const urlCache = new Map<string, string>();

/** Data URL for use in <img> tags (UI). Browser only. */
export function iconUrl(name: IconName, size = 32): string {
  const key = `${name}:${size}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawIcon(ctx, name, 0, 0, size);
  const url = c.toDataURL();
  urlCache.set(key, url);
  return url;
}
