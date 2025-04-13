import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'TypeScript PWA Template',
        short_name: 'TS-PWA',
        description: 'A TypeScript PWA template with GitHub Pages deployment',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      // Force ESM compliance for libraries that use CommonJS
      transformMixedEsModules: true,
      // Explicitly include the math-js library for proper bundling
      include: [/@uor-foundation\/math-js/],
    },
    rollupOptions: {
      // =====================================================
      // ESM/CommonJS Interoperability Configuration
      // =====================================================
      // The @uor-foundation/math-js library is distributed as CommonJS,
      // but our application uses ESM. This configuration ensures proper
      // interoperability between the two module systems.
      //
      // We handle this in multiple ways:
      // 1. Use the commonjsOptions.transformMixedEsModules flag to enable proper conversion
      // 2. Explicitly include the math-js library in the CommonJS processing
      // 3. Set the output format to ES modules
      // 4. Provide polyfills for Node.js-specific globals that might be referenced
      // 5. Transform any remaining 'require' statements in string literals
      //
      // Note: A better long-term solution would be for the library to provide
      // an ESM build, but this configuration serves as a reliable workaround.
      output: {
        format: 'es',
        // Provide minimal polyfills for Node.js globals that might be referenced
        // by the transitioned CommonJS code
        intro: `
          // Polyfill minimal Node.js environment for CommonJS modules
          const global = window; 
          const process = { env: {} };
        `,
      },

      // Plugin to handle any remaining 'require' references in string literals
      // This is needed because some modules might include require calls in
      // strings (like error messages or comments) that don't get transformed
      // by the commonjs plugin
      plugins: [
        {
          name: 'transform-require-statements',
          transform(code, _id) {
            // Skip files that don't contain 'require'
            if (!code.includes('require')) {
              return null;
            }

            // Replace 'require' in string literals only
            // This avoids breaking actual code while fixing string references
            const newCode = code.replace(/(['"`]).*?require.*?\1/g, (match) => {
              return match.replace('require', '/*import*/');
            });

            return {
              code: newCode,
              map: { mappings: '' }, // Empty mappings to avoid sourcemap warnings
            };
          },
        },
      ],
    },
  },
  test: {
    environment: 'jsdom',
    browser: {
      enabled: true,
      name: 'chrome',
      headless: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
  base: './',
});
