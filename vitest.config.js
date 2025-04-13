import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Running in JSDOM for simplicity, with custom element support
    setupFiles: ['./src/test-setup.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: ['**/tests/integration/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
      all: true, // Cover all source files, not just imported ones
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        statements: 70, // Project threshold for statement coverage
        branches: 50, // Project threshold for branch coverage
        functions: 85, // Project threshold for function coverage
        lines: 70, // Project threshold for line coverage
      },
      reportOnFailure: true, // Always produce a report even on test failure
      reportsDirectory: './coverage', // Standard location for reports
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
