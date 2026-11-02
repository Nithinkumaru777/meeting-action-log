import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'client',
    environment: 'node',
    retry: 0,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: { lines: 80 },
    },
  },
});
