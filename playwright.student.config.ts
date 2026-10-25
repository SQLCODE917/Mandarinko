import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/student',
  outputDir: './test-results/student-browser',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/student-browser/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:3015/Mandarinko/', trace: 'retain-on-failure' },
  webServer: {
    command:
      'STUDENT_BASE=/Mandarinko/ pnpm --filter @mandarinko/student-app... build && STUDENT_BASE=/Mandarinko/ pnpm --filter @mandarinko/student-app preview',
    url: 'http://127.0.0.1:3015/Mandarinko/',
    reuseExistingServer: false,
  },
});
