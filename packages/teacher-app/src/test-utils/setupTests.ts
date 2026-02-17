import { afterAll, afterEach } from 'vitest';
import { cleanup } from './testing-library-react';

// Enable React act warnings handling in tests
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

afterEach(() => {
  cleanup();
});

afterAll(() => {
  if (typeof window !== 'undefined' && typeof window.close === 'function') {
    window.close();
  }
});
