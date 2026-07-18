import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/visual/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      exclude: ['ts/**/*.d.ts'],
      thresholds: {
        statements: 58,
        branches: 55,
        functions: 68,
        lines: 58,
      },
    },
  },
});
