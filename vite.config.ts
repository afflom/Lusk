import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'offline-image.png'],
      manifest: {
        name: 'Universal Number Coordinates Calculator',
        short_name: 'Math Calc',
        description:
          'Advanced mathematical application with universal coordinate calculations and offline capabilities',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        lang: 'en',
        dir: 'ltr',
        start_url: './?source=pwa',
        scope: './',
        categories: ['education', 'utilities', 'productivity'],
        shortcuts: [
          {
            name: 'Calculator',
            short_name: 'Calc',
            description: 'Open the calculator page',
            url: './calculator?source=shortcut',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        iarc_rating_id: '', // Can be populated if app gets a content rating
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            label: 'Calculator Interface',
            platform: 'wide',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            label: 'Home Screen',
            platform: 'wide',
          },
        ],
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
        related_applications: [],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      // Add iOS meta tags for better Apple device integration
      apple: {
        icon: 'apple-touch-icon.png',
        statusBarStyle: 'black-translucent',
      },
      // Configuration for generated service worker
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
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
