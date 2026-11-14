import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['src/**/*.test.ts', 'tests/**/*.test.ts'], environment: 'node' },
});
