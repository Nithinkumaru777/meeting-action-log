import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    retry: 0,
    passWithNoTests: true,
    // mongodb-memory-server may download/launch mongod in beforeAll.
    hookTimeout: 120_000,
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Process bootstrap (listen + process.exit); verified by the live smoke run in the step result.
      exclude: ['src/server.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
