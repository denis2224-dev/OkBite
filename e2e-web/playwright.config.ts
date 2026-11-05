import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.', testMatch: '**/*.spec.ts', fullyParallel: true,
  retries: process.env.CI ? 1 : 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:18766', trace: 'retain-on-failure' },
  projects: [
    { name: 'iPhone Safari', use: { ...devices['iPhone 13'] } },
    { name: 'Android Chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'node e2e-web/server.mjs', cwd: resolve(__dirname, '..'),
    url: 'http://127.0.0.1:18766', reuseExistingServer: false },
});
