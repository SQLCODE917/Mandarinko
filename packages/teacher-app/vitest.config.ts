import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@testing-library/react': resolve(__dirname, 'src/test-utils/testing-library-react.ts'),
      '@testing-library/user-event': resolve(
        __dirname,
        'src/test-utils/testing-library-user-event.ts'
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules/', 'dist/'],
    setupFiles: [resolve(__dirname, 'src/test-utils/setupTests.ts')],
  },
});
