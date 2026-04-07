import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/model/**', 'src/clues/**', 'src/grids/**', 'src/save/**', 'src/solver/**'],
      exclude: ['src/view/**', 'src/save/storage.ts'],
      thresholds: {
        // 6 defensive guard branches are provably dead code (see docs/tracking/test-coverage-exceptions.md)
        branches: 99,
      },
    },
  },
});
