/**
 * Custom Vitest Matchers for E2E Tests
 */

import { expect } from 'vitest';

interface CustomMatchers<R = unknown> {
  toBeOneOf(expected: unknown[]): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeOneOf(received: unknown, expected: unknown[]) {
    const pass = expected.includes(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of [${expected.join(', ')}]`
          : `expected ${received} to be one of [${expected.join(', ')}]`,
    };
  },
});

export {};
