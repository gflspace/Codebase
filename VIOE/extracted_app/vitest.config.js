import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./src/test/setup.js'],

    // Globals (describe, it, expect without imports)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.js',
      ],
      include: ['src/**/*.{js,jsx}'],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },

    // Include patterns
    include: ['src/**/*.{test,spec}.{js,jsx}'],

    // Exclude patterns
    exclude: ['node_modules', 'dist'],

    // Watch mode exclude
    watchExclude: ['node_modules', 'dist'],

    // Reporter
    reporter: ['verbose'],

    // Timeout
    testTimeout: 10000,

    // CSS handling
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
