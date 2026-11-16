import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174/fitnes-test/';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    locale: 'ru-RU',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    env: { PAGES_BASE_PATH: '/fitnes-test/' },
    url: baseURL,
  },
});
