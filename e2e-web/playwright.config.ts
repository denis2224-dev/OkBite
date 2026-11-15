import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.', testMatch: '**/*.spec.ts', fullyParallel: true,
  retries: process.env.CI ? 1 : 0, reporter: 'list',
  // Specs start as a returning user; onboarding.spec.ts clears this to test first launch.
  use: { baseURL: 'http://127.0.0.1:18766', locale: 'ro-MD', trace: 'retain-on-failure',
    storageState: resolve(__dirname, 'onboarded.storage.json') },
  projects: [
    { name: 'iPhone Safari', use: { ...devices['iPhone 13'] } },
    { name: 'Android Chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'node e2e-web/server.mjs', cwd: resolve(__dirname, '..'),
    url: 'http://127.0.0.1:18766', reuseExistingServer: false },
});
