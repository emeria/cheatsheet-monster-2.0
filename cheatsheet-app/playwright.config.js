// Browser smoke tests in e2e/. Run with npm run test:e2e; they start the dev server themselves.
const { defineConfig, devices } = require('@playwright/test');

const base = 'http://localhost:3000/cheatsheet-monster-2.0/';

module.exports = defineConfig({
  testDir: 'e2e',
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: base, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm start',
    url: base,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
