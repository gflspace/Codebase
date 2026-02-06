import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',

    // Setup files run before each test file
    setupFiles: ['./src/__tests__/setup.js'],

    // Global test APIs (describe, it, expect, etc.)
    globals: true,

    // Include patterns
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/__mocks__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.jsx',
        'src/main.jsx',
      ],
      // Minimum coverage thresholds (adjust as test coverage improves)
      thresholds: {
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Timeout for tests
    testTimeout: 10000,

    // Watch mode exclude
    watchExclude: ['node_modules', 'dist'],
  },

  // Path aliases (matching jsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
