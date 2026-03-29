import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/model/**', 'src/clues/**', 'src/grids/**', 'src/save/**'],
      exclude: ['src/view/**'],
      thresholds: {
        branches: 100,
      },
    },
  },
});
