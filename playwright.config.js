import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'node viewer.mjs',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:8000' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile',  use: { viewport: { width: 375,  height: 812 } } },
  ],
});
