/**
 * Tests for the config module
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';

// Store original environment variables to restore later
const originalEnv = { ...process.env };

describe('config', () => {
  // Before each test, reset environment variables
  beforeEach(() => {
    // Clean up environment variables that might affect tests
    vi.resetModules();

    // Reset environment variables to clean state
    process.env = { ...originalEnv };
  });

  // After all tests, restore original environment
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getPackageVersion', () => {
    it('should use npm_package_version when valid', async () => {
      // Set valid version in env
      process.env.npm_package_version = '2.3.4';

      // Import the module after setting env vars
      const { swConfig } = await import('./config');

      // Cache names should use the version from env
      expect(swConfig.cacheNames.static).toBe('ts-pwa-static-v2.3.4');
    });

    it('should fall back to default version when npm_package_version is invalid', async () => {
      // Set invalid version format
      process.env.npm_package_version = 'invalid';

      // Import the module
      const { swConfig } = await import('./config');

      // Should use default version (1.0.0)
      expect(swConfig.cacheNames.static).toBe('ts-pwa-static-v1.0.0');
    });

    it('should fall back to default version when npm_package_version is missing', async () => {
      // Ensure package version is not set
      delete process.env.npm_package_version;

      // Import the module
      const { swConfig } = await import('./config');

      // Should use default version (1.0.0)
      expect(swConfig.cacheNames.static).toBe('ts-pwa-static-v1.0.0');
    });
  });

  describe('getNodeEnv', () => {
    it('should use NODE_ENV when valid', async () => {
      // Set to production
      process.env.NODE_ENV = 'production';

      // Import the module
      const { appConfig } = await import('./config');

      // Should reflect production environment
      expect(appConfig.environment).toBe('production');
      expect(appConfig.isProduction).toBe(true);
    });

    it('should accept development as valid environment', async () => {
      process.env.NODE_ENV = 'development';

      const { appConfig } = await import('./config');

      expect(appConfig.environment).toBe('development');
      expect(appConfig.isProduction).toBe(false);
    });

    it('should accept test as valid environment', async () => {
      process.env.NODE_ENV = 'test';

      const { appConfig } = await import('./config');

      expect(appConfig.environment).toBe('test');
      expect(appConfig.isProduction).toBe(false);
    });

    it('should fall back to development when NODE_ENV is invalid', async () => {
      // Set invalid environment
      process.env.NODE_ENV = 'invalid';

      // Import the module
      const { appConfig } = await import('./config');

      // Should use default environment (development)
      expect(appConfig.environment).toBe('development');
      expect(appConfig.isProduction).toBe(false);
    });

    it('should fall back to development when NODE_ENV is missing', async () => {
      // Ensure NODE_ENV is not set
      delete process.env.NODE_ENV;

      // Import the module
      const { appConfig } = await import('./config');

      // Should use default environment (development)
      expect(appConfig.environment).toBe('development');
      expect(appConfig.isProduction).toBe(false);
    });
  });

  describe('appConfig', () => {
    it('should use APP_TITLE when valid', async () => {
      // Set valid app title
      process.env.APP_TITLE = 'Custom App Title';

      // Import the module
      const { appConfig } = await import('./config');

      // Should use title from env
      expect(appConfig.defaultTitle).toBe('Custom App Title');
    });

    it('should trim whitespace from APP_TITLE', async () => {
      // Set title with whitespace
      process.env.APP_TITLE = '  Trimmed Title  ';

      // Import the module
      const { appConfig } = await import('./config');

      // Should be trimmed
      expect(appConfig.defaultTitle).toBe('Trimmed Title');
    });

    it('should fall back to default title when APP_TITLE is empty', async () => {
      // Set empty title
      process.env.APP_TITLE = '';

      // Import the module
      const { appConfig } = await import('./config');

      // Should use default title
      expect(appConfig.defaultTitle).toBe('Prime Math Library Explorer');
    });

    it('should fall back to default title when APP_TITLE is whitespace', async () => {
      // Set whitespace title
      process.env.APP_TITLE = '   ';

      // Import the module
      const { appConfig } = await import('./config');

      // Should use default title
      expect(appConfig.defaultTitle).toBe('Prime Math Library Explorer');
    });

    it('should fall back to default title when APP_TITLE is missing', async () => {
      // Ensure APP_TITLE is not set
      delete process.env.APP_TITLE;

      // Import the module
      const { appConfig } = await import('./config');

      // Should use default title
      expect(appConfig.defaultTitle).toBe('Prime Math Library Explorer');
    });
  });

  describe('swConfig', () => {
    it('should construct proper cache names with version', async () => {
      // Set version
      process.env.npm_package_version = '3.2.1';

      // Import the module
      const { swConfig } = await import('./config');

      // Check all cache names
      expect(swConfig.cacheNames.static).toBe('ts-pwa-static-v3.2.1');
      expect(swConfig.cacheNames.dynamic).toBe('ts-pwa-dynamic-v3.2.1');
      expect(swConfig.cacheNames.documents).toBe('ts-pwa-documents-v3.2.1');
      expect(swConfig.cacheNames.images).toBe('ts-pwa-images-v3.2.1');
      expect(swConfig.cacheNames.fonts).toBe('ts-pwa-fonts-v3.2.1');
      expect(swConfig.cacheNames.offline).toBe('ts-pwa-offline-v3.2.1');
    });

    it('should include required precache URLs', async () => {
      const { swConfig } = await import('./config');

      // Verify precache URLs
      expect(swConfig.precacheUrls).toContain('./');
      expect(swConfig.precacheUrls).toContain('./index.html');
      expect(swConfig.precacheUrls).toContain('./favicon.ico');
      expect(swConfig.precacheUrls).toContain('./robots.txt');
      expect(swConfig.precacheUrls).toContain('./apple-touch-icon.png');
      expect(swConfig.precacheUrls).toContain('./pwa-192x192.png');
      expect(swConfig.precacheUrls).toContain('./pwa-512x512.png');
    });

    it('should configure offline fallbacks', async () => {
      const { swConfig } = await import('./config');

      // Verify offline fallbacks
      expect(swConfig.offlineFallbacks.document).toBe('./offline.html');
      expect(swConfig.offlineFallbacks.image).toBe('./offline-image.png');
    });

    it('should export required service worker configuration properties', async () => {
      const { swConfig } = await import('./config');

      // Verify config structure
      expect(swConfig).toHaveProperty('url');
      expect(swConfig).toHaveProperty('scope');
      expect(swConfig).toHaveProperty('cacheNames');
      expect(swConfig).toHaveProperty('precacheUrls');
      expect(swConfig).toHaveProperty('maxCacheAge');
      expect(swConfig).toHaveProperty('offlineFallbacks');
      expect(swConfig).toHaveProperty('cacheLimitBytes');
      expect(swConfig).toHaveProperty('syncQueueName');

      // Validate specific values
      expect(swConfig.url).toBe('./sw.js');
      expect(swConfig.scope).toBe('./');
      expect(swConfig.maxCacheAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(swConfig.cacheLimitBytes).toBe(50 * 1024 * 1024); // 50MB
      expect(swConfig.syncQueueName).toBe('ts-pwa-sync-queue');
    });
  });
});
