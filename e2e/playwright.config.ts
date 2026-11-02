import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.E2E_PORT ?? 5179);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: path.join(__dirname, 'specs'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    viewport: { width: 1366, height: 860 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
        viewport: { width: 1366, height: 860 },
      },
    },
  ],
  webServer: {
    command: `node "${path.resolve(__dirname, '../server/dist/server.js')}"`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(PORT),
      CLIENT_ORIGIN: BASE_URL,
      MONGODB_URI: 'mongodb://127.0.0.1:27099/meeting_action_log_e2e',
      RATE_LIMIT_PER_MIN: '10000',
    },
  },
});
