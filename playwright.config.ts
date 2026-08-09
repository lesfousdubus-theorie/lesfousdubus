import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_TEST_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: externalBaseURL ?? 'http://localhost:4321',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        port: 4321,
        reuseExistingServer: false,
      },
});
