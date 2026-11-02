import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    retry: 0,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
