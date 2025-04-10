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
    exclude: ['**/tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        statements: 40,
        branches: 70,
        functions: 80,
        lines: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
