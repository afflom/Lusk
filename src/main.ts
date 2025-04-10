import './style.css';
import { pwaService } from './services/pwa';
import './components/Counter';
import { createApp } from './components/App';
import { appConfig } from './utils/config';
import * as logger from './utils/logger';

// Define custom error tracking interface
interface AppError {
  type: string;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: string;
}

// Create interface for window with app errors property
interface AppErrorWindow extends Window {
  __app_errors?: AppError[];
}

/**
 * Initializes all application components and handles errors gracefully
 */
class AppInitializer {
  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Set up global error handler for uncaught errors
      this.setupGlobalErrorHandlers();

      // Try to initialize PWA but continue even if it fails
      try {
        await this.initializePWA();
      } catch (pwaError) {
        // Log PWA errors but don't crash the app - PWA is an enhancement
        const errorMsg = pwaError instanceof Error ? pwaError.message : String(pwaError);
        logger.warn('PWA initialization failed but app will continue: ' + errorMsg);

        // Track in the global app errors for diagnostics
        const w = window as AppErrorWindow;
        if (w.__app_errors) {
          w.__app_errors.push({
            type: 'pwa-init-error',
            message: pwaError instanceof Error ? pwaError.message : String(pwaError),
            stack: pwaError instanceof Error ? pwaError.stack : undefined,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Initialize app components - this should succeed even if PWA fails
      await this.initializeComponents();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Critical application initialization error: ' + errorMsg);
      this.showErrorFallback(error);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Set up a custom error tracker for application-wide error tracking
    (window as AppErrorWindow).__app_errors = [];

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      const errorMsg =
        event.error instanceof Error
          ? event.error.message
          : typeof event.message === 'string'
            ? event.message
            : 'Unknown error';
      const error = event.error instanceof Error ? event.error : new Error(errorMsg);

      // Track all errors
      logger.error('Unhandled error: ' + errorMsg);

      // Store all errors for diagnostic purposes - don't filter here
      const w = window as AppErrorWindow;
      w.__app_errors = w.__app_errors || [];
      w.__app_errors.push({
        type: 'error',
        message: errorMsg,
        source: typeof event.filename === 'string' ? event.filename : 'unknown',
        line: event.lineno,
        column: event.colno,
        stack: typeof error.stack === 'string' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // For UI, filter out common development errors for service workers
      // to keep the UI clean, but still track them
      const isServiceWorkerError =
        this.containsAny(errorMsg, ['Failed to register a ServiceWorker', 'sw.js']) &&
        this.containsAny(errorMsg, ['404', 'Not Found']);

      if (isServiceWorkerError) {
        // Development-only errors, don't show error UI but still track them
        logger.info('Development-only service worker error - will not show error UI');
      } else {
        // Show error UI for all other errors
        this.showErrorFallback(error);
      }

      // Don't prevent default handling - let browser console still show the error
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      const errorMsg = error.message;

      // Track all rejected promises
      logger.error('Unhandled promise rejection: ' + errorMsg);

      // Store for diagnostics
      const w = window as AppErrorWindow;
      w.__app_errors = w.__app_errors || [];
      w.__app_errors.push({
        type: 'unhandledrejection',
        message: errorMsg,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // Only filter UI display, not tracking
      const isServiceWorkerError =
        this.containsAny(errorMsg, ['Failed to register a ServiceWorker', 'sw.js']) &&
        this.containsAny(errorMsg, ['404', 'Not Found']);

      if (isServiceWorkerError) {
        // Skip showing development errors
        logger.info('Development-only service worker rejection - will not show error UI');
      } else {
        // Show error UI for all other errors
        this.showErrorFallback(error);
      }
    });
  }

  /**
   * Helper method to check if a string contains any of the substrings
   */
  private containsAny(str: string, substrings: string[]): boolean {
    return substrings.some((substring) => str.includes(substring));
  }

  /**
   * Initialize PWA service worker
   * @returns A promise that resolves when PWA initialization is complete, or rejects with an error
   */
  private async initializePWA(): Promise<void> {
    // Check if a service worker is already registered by vite-plugin-pwa
    const hasVitePwaScript = document.getElementById('vite-plugin-pwa:register-sw');

    if (hasVitePwaScript) {
      // Vite PWA plugin is handling the service worker registration,
      // so we'll just log this and return without additional registration
      logger.info('PWA service worker registration handled by vite-plugin-pwa');
      return Promise.resolve();
    }

    // Only reach here if vite-plugin-pwa isn't handling the registration
    try {
      await pwaService.register();
      logger.info('PWA service worker registered successfully');
    } catch (error) {
      // Don't hide errors - only add supplementary information
      // but still throw them to allow proper error tracking
      let errorToThrow: Error = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error) {
        // Add more context to common errors
        if (
          error.message.includes('Service worker has incorrect MIME type') ||
          error.message.includes('Service worker file not found') ||
          error.message.includes('Failed to register a ServiceWorker')
        ) {
          logger.warn(
            'PWA service worker registration failed. This might be expected in development environment,' +
              'but should be fixed for production.'
          );
          // Create a more informative error that preserves the original
          errorToThrow = new Error(
            `PWA initialization failed: ${error.message} (This may affect offline functionality)`
          );
          errorToThrow.stack = error.stack;
        }
      }

      // Always throw the error to ensure proper error handling and tracking
      throw errorToThrow;
    }
  }

  /**
   * Initialize app components
   */
  private async initializeComponents(): Promise<HTMLElement | null> {
    try {
      // Make sure DOM is ready before initializing components
      if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
      }

      // Create and initialize the app
      const app = createApp(appConfig.rootSelector);
      logger.info('App initialization successful');
      return app;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize app components: ' + errorMsg);
      this.showErrorFallback(error);
      return null;
    }
  }

  /**
   * Show fallback content in case of critical error
   */
  private showErrorFallback(error: unknown): void {
    try {
      const appContainer = document.querySelector('#app');
      if (appContainer) {
        appContainer.innerHTML = `
          <div class="error-container">
            <h1 class="error-title">Application Error</h1>
            <p>There was an error initializing the application. Please check the console for details.</p>
            <div class="error-message">
              <code>${String(error instanceof Error ? error.message : error)}</code>
            </div>
            <p class="error-reload-button">
              <button onclick="window.location.reload()">
                Reload Page
              </button>
            </p>
          </div>
        `;
      }
    } catch (fallbackError) {
      // Last resort error handling
      const errorMsg =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      logger.error('Error showing fallback UI: ' + errorMsg);

      // Try document.write as an absolute last resort
      document.body.innerHTML = '<h1>Critical Application Error</h1><p>Please reload the page.</p>';
    }
  }
}

// Export class for testing
export { AppInitializer };

// Initialize the application
const appInitializer = new AppInitializer();
appInitializer.initialize().catch((error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  logger.error('Fatal application error: ' + errorMsg);
});
