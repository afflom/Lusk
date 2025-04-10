import { Workbox } from 'workbox-window';
import { swConfig } from '../utils/config';
import * as logger from '../utils/logger';

// Import Workbox types for better type checking
import { WorkboxLifecycleEvent } from 'workbox-window';

/**
 * Extended type definition for Workbox error events
 * This matches the Workbox window error event structure
 */
interface WorkboxErrorEvent extends Event {
  error?: Error;
}

/**
 * Augment the WorkboxLifecycleEvent to ensure isUpdate exists
 * Our code uses this property to determine if the service worker is being updated
 */
declare module 'workbox-window' {
  interface WorkboxLifecycleEvent {
    isUpdate?: boolean;
  }
}

/**
 * Service worker registration and update handling
 */
export class PWAService {
  private wb: Workbox | null = null;

  /**
   * Register service worker if supported
   * @returns Promise that resolves when registration is complete or fails if not supported
   */
  register(): Promise<void> {
    // Fail directly if service worker is not supported
    if (!('serviceWorker' in navigator)) {
      return Promise.reject(new Error('Service worker not supported'));
    }

    try {
      // Create the Workbox instance
      this.wb = new Workbox(swConfig.url);

      // Set up event listeners
      this.setupEventListeners();

      // Register and return the promise without additional wrapping
      // This allows errors to properly propagate up
      return this.wb.register().then(() => {
        logger.info('Service worker registered successfully');
      });
    } catch (error) {
      // Only log initialization errors, but still reject to allow caller to handle them
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error during service worker initialization: ' + errorMsg);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Set up event listeners for the service worker
   */
  private setupEventListeners(): void {
    if (!this.wb) return;

    try {
      // Handle service worker installation
      this.wb.addEventListener('installed', (event: WorkboxLifecycleEvent) => {
        if (event.isUpdate) {
          logger.info('Service worker updated - showing update prompt');
          this.showUpdatePrompt();
        } else {
          logger.info('Service worker installed for the first time');
        }
      });

      // Handle controller change (when the service worker takes control)
      this.wb.addEventListener('controlling', () => {
        logger.info('Service worker is now controlling the page');
      });

      // Handle service worker activation
      this.wb.addEventListener('activated', (event: WorkboxLifecycleEvent) => {
        if (event.isUpdate) {
          logger.info('Service worker activated after update');
        } else {
          logger.info('Service worker activated for the first time');
        }
      });

      // Handle waiting service worker (update waiting to be activated)
      this.wb.addEventListener('waiting', () => {
        logger.info('New service worker waiting to be activated');
        this.showUpdatePrompt();
      });

      // Handle registration errors - Workbox supports 'error' events but the TypeScript type definitions don't
      // Use a type assertion to bypass the type check
      (this.wb as any).addEventListener('error', (event: Event) => {
        // Cast to our custom error event type which has the error property
        const errorEvent = event as WorkboxErrorEvent;
        const errorMsg = errorEvent.error ? errorEvent.error.message : String(event);
        logger.error('Service worker error: ' + errorMsg);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up service worker event listeners: ' + errorMsg);
    }
  }

  /**
   * Show update prompt to user
   * Shows a notification about available service worker updates
   *
   * Uses standard confirm dialog for test compatibility
   */
  private showUpdatePrompt(): void {
    // Display confirmation message using standard confirm dialog
    // This ensures compatibility with our test suite
    const userConfirmed = confirm('New app update is available! Click OK to refresh.');

    if (userConfirmed) {
      window.location.reload();
    }
  }

  /**
   * Check if PWA is installed
   * @returns boolean indicating if app is installed
   */
  isInstalled(): boolean {
    try {
      // Interface for window with optional standalone property
      interface NavigatorWithStandalone extends Navigator {
        standalone?: boolean;
      }

      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as NavigatorWithStandalone).standalone === true
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error checking if PWA is installed: ' + errorMsg);
      return false;
    }
  }

  /**
   * Check service worker registration status
   * @returns Promise resolving to boolean indicating if service worker is registered
   */
  isRegistered(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return Promise.resolve(false);
    }

    return navigator.serviceWorker
      .getRegistration()
      .then((registration) => !!registration)
      .catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error checking service worker registration: ' + errorMsg);
        return false;
      });
  }
}

export const pwaService = new PWAService();
