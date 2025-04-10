/**
 * Application configuration
 *
 * This module provides centralized configuration values for the application.
 * It uses environment variables and package.json version when available.
 */

/**
 * Get application environment variables with validation
 *
 * These values should be set during build/runtime:
 * - In development: by running npm scripts which set them
 * - In production: by build system or deployment platform
 */

// Validate and get package version
const getPackageVersion = (): string => {
  const version = process.env.npm_package_version;
  // Validate semantic versioning pattern
  if (version && /^\d+\.\d+\.\d+/.test(version)) {
    return version;
  }
  // Fallback for development/testing
  return '1.0.0';
};

// Validate environment
const getNodeEnv = (): string => {
  const env = process.env.NODE_ENV;
  // Only accept valid environments
  if (env === 'production' || env === 'development' || env === 'test') {
    return env;
  }
  // Default to development for safety
  return 'development';
};

// Initialize validated config values
const packageVersion = getPackageVersion();
const nodeEnv = getNodeEnv();

/**
 * Service worker configuration
 */
export const swConfig = {
  // Service worker URL based on environment - always use relative paths for GitHub Pages compatibility
  url: './sw.js',
  // Default scope for the service worker
  scope: './',
  // Cache name with version
  cacheName: `ts-pwa-cache-v${packageVersion}`,
  // Resources to pre-cache - use relative paths for GitHub Pages compatibility
  precacheUrls: [
    './',
    './index.html',
    './favicon.ico',
    './robots.txt',
    './apple-touch-icon.png',
    './pwa-192x192.png',
    './pwa-512x512.png',
  ],
};

/**
 * Application UI configuration
 */
export const appConfig = {
  // Root selector for the main application
  rootSelector: '#app',
  // Container ID for error display
  errorContainerId: 'app-error-container',
  // Application title - load from environment with validated fallback
  defaultTitle: (() => {
    const title = process.env.APP_TITLE;
    // Only use environment variable if it's not empty
    if (title && title.trim().length > 0) {
      return title.trim();
    }
    // Fallback for consistency with tests
    return 'TypeScript PWA Template';
  })(),
  // Current environment
  environment: nodeEnv,
  // Is production environment
  isProduction: nodeEnv === 'production',
};
