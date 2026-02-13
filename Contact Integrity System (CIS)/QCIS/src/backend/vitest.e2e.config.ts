import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 60000, // 60 seconds per test
    hookTimeout: 60000, // 60 seconds for setup/teardown
    fileParallelism: false, // Run test files sequentially
    pool: 'forks', // Use process isolation
    poolOptions: {
      forks: {
        singleFork: true, // Ensure sequential execution
      },
    },
    globalSetup: './tests/e2e/global-setup.ts',
    globalTeardown: './tests/e2e/global-teardown.ts',
  },
});
