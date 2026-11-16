import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/** Build identification (shown in the in-game menu). No network, no secrets. */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
function commit(): string {
  if (process.env.EMPIRES_COMMIT) return process.env.EMPIRES_COMMIT.slice(0, 12);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  // Relative asset paths: the build works from a domain root or any sub-folder.
  base: './',
  define: {
    __EMPIRES_VERSION__: JSON.stringify(pkg.version),
    __EMPIRES_COMMIT__: JSON.stringify(commit()),
    __EMPIRES_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 900, outDir: 'dist', emptyOutDir: true },
  test: {
    include: process.env.EMPIRES_REPORT ? ['tools/**/*.report.ts'] : ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
