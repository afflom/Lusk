/**
 * PWA Testing utilities module - Test Environment Only
 *
 * This module provides a safer approach to testing PWA functionality by:
 * 1. Only exposing APIs in test environments through a well-defined interface
 * 2. Avoiding global namespace pollution in production
 * 3. Using proper encapsulation with a factory pattern
 */
import { pwaService } from '../services/pwa';
import { createNotification } from './dom';
import * as logger from './logger';

/**
 * Testing helpers interface - defines the shape of test utilities
 * without exposing them directly on window
 */
export interface PWATestingHelpers {
  /**
   * Access to PWA service functionality for testing
   */
  pwaService: typeof pwaService;

  /**
   * Access to notification creation for testing
   */
  createNotification: typeof createNotification;
}

/**
 * Private module state - not exposed directly
 */
const moduleState = {
  isTestEnvironment: false,
  helpers: null as PWATestingHelpers | null,
};

/**
 * Safely detects if we're running in a test environment
 * Uses multiple detection methods for better reliability
 */
function isTestEnvironment(): boolean {
  // Use cached result if already computed
  if (moduleState.isTestEnvironment) {
    return true;
  }

  try {
    // Method 1: Browser automation detection
    // Detects WebDriver/Selenium/Puppeteer
    const isBrowserAutomation =
      typeof window !== 'undefined' &&
      (window.navigator.userAgent.includes('Chrome/WebDriver') ||
        window.navigator.userAgent.includes('HeadlessChrome'));

    // Method 2: Explicit test flag
    // This lets tests opt-in to test features by setting window.__TEST_ENV = true
    const hasExplicitTestFlag =
      typeof window !== 'undefined' &&
      typeof window.__TEST_ENV === 'boolean' &&
      window.__TEST_ENV === true;

    // Method 3: Test runner detection
    // Checks for presence of test framework globals (while avoiding linting issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalObj = typeof global !== 'undefined' ? global : window;
    const hasTestRunnerAPIs =
      typeof globalObj === 'object' &&
      globalObj !== null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (typeof (globalObj as any).it === 'function' ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof (globalObj as any).describe === 'function');

    // Cache the result to avoid repeated detection logic
    moduleState.isTestEnvironment = isBrowserAutomation || hasExplicitTestFlag || hasTestRunnerAPIs;

    return moduleState.isTestEnvironment;
  } catch (_unused) {
    // If any detection fails, assume we're not in a test environment
    return false;
  }
}

/**
 * Factory function that provides testing helpers
 * This keeps the API internal rather than exposing to window
 */
export function getPWATestingHelpers(): PWATestingHelpers | null {
  // Only provide helpers in test environments
  if (!isTestEnvironment()) {
    return null;
  }

  // Initialize helpers if not already done
  if (!moduleState.helpers) {
    moduleState.helpers = {
      pwaService,
      createNotification,
    };

    // Log at debug level since this is test infrastructure
    logger.debug('PWA testing helpers initialized for test environment');
  }

  return moduleState.helpers;
}

/**
 * Initialize test hooks for integration testing
 * Safe to call in any environment - only activates in test contexts
 */
export function initPWATestHooks(): void {
  // Early return if not in a test environment
  if (!isTestEnvironment() || typeof window === 'undefined') {
    return;
  }

  try {
    // Get helper functions from the internal factory
    const helpers = getPWATestingHelpers();

    // Exit if helpers aren't available
    if (!helpers) {
      return;
    }

    // Store the helpers in a non-enumerable property
    // This prevents the property from showing up in Object.keys(window)
    // Making it less likely to interfere with production code
    if (!window.__pwaTestingHelpers) {
      Object.defineProperty(window, '__pwaTestingHelpers', {
        value: helpers,
        enumerable: false, // Won't show up in loops or Object.keys
        writable: false, // Prevents overwriting
        configurable: true, // Allows deletion if needed
      });

      // Mark as a test environment for other test utils
      Object.defineProperty(window, '__TEST_ENV', {
        value: true,
        enumerable: false,
        writable: false,
        configurable: true,
      });

      logger.debug('PWA test hooks initialized - APIs safely stored for testing');
    }
  } catch (error) {
    logger.warn('Error initializing PWA test hooks:', error);
  }
}

// TypeScript type declarations for test files
declare global {
  interface Window {
    /**
     * Flag indicating test environment - not enumerable in production
     */
    __TEST_ENV?: boolean;

    /**
     * Test helper functions - only available in test environments
     */
    __pwaTestingHelpers?: PWATestingHelpers;
  }
}
