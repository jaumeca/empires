import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Enforces the sim/presentation boundary (D-004) and determinism rules (D-018). */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const simFiles = files('src/sim');

describe('architecture boundaries', () => {
  it('sim/ never imports render, ui, platform, app or three', () => {
    for (const f of simFiles) {
      const src = readFileSync(f, 'utf8');
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const i of imports) {
        expect(i, `${f} imports ${i}`).not.toMatch(/(^three|\/render\/|\/ui\/|\/platform\/|\/app\/)/);
        if (i.startsWith('..')) expect(i, `${f} imports ${i}`).not.toMatch(/^\.\.\/\.\.\/(?!content)/);
      }
    }
  });
  it('sim/ uses no wall clock, Math.random or DOM globals', () => {
    for (const f of simFiles) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now|window\.|document\.|localStorage/);
    }
  });
});
