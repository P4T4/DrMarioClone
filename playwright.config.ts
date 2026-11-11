import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm dev:game',
      url: 'http://127.0.0.1:2567/health',
      reuseExistingServer: false,
      env: {
        GAME_WAITING_ROOM_TTL_MS: '5000',
      },
    },
    {
      command: 'pnpm dev:web',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: !isCI,
    },
  ],
});
