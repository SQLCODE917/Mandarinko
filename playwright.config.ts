import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:3014', trace: 'retain-on-failure' },
  webServer: {
    command:
      'pnpm --filter @mandarinko/core build && pnpm --filter @mandarinko/server build && pnpm --filter @mandarinko/teacher-app exec vite --host 127.0.0.1 --port 3014 --strictPort',
    url: 'http://127.0.0.1:3014',
    reuseExistingServer: false,
  },
});
