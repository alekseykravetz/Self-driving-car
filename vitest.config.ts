import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite cache directory (Vitest 4: replaces test.cache.dir)
  cacheDir: 'node_modules/.vitest',

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

    // Use forks pool with multiple workers
    pool: 'forks',
    // Vitest 4: pool options are top-level test options
    forks: {
      // Multiple forks for parallel execution
      singleFork: false,
      // Don't isolate forks (saves ~10% overhead)
      isolate: false,
    },
    threads: {
      singleThread: false,
      isolate: false,
    },

    // File change detection for --changed flag
    watch: {
      exclude: ['node_modules/**', 'js/**', 'coverage/**'],
    },
  },
});
