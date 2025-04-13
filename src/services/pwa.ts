import { Workbox } from 'workbox-window';
import { swConfig } from '../utils/config';
import * as logger from '../utils/logger';
import { createNotification } from '../utils/dom';

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
 * Types of network status
 */
enum NetworkStatus {
  Online = 'online',
  Offline = 'offline',
}

/**
 * Interface for queued form data
 * Used for background sync
 */
interface QueuedFormData {
  url: string;
  method: string;
  body: Record<string, unknown>;
  timestamp: number;
  id: string;
}

/**
 * Service worker registration and update handling
 */
export class PWAService {
  private wb: Workbox | null = null;
  private isNetworkMonitoringEnabled = false;
  private queuedFormData: QueuedFormData[] = [];
  private notificationTimeout: number | null = null;
  private updateAvailable = false;

  /**
   * Type guard to validate QueuedFormData array
   * @param data Data to check
   * @returns True if data is a valid QueuedFormData array
   */
  private isQueuedFormDataArray(data: unknown[]): data is QueuedFormData[] {
    return data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'url' in item &&
        typeof item.url === 'string' &&
        'method' in item &&
        typeof item.method === 'string' &&
        'body' in item &&
        typeof item.body === 'object' &&
        'timestamp' in item &&
        typeof item.timestamp === 'number' &&
        'id' in item &&
        typeof item.id === 'string'
    );
  }

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
      // Create the Workbox instance with improved options
      this.wb = new Workbox(swConfig.url, {
        scope: swConfig.scope,
      });

      // Set up event listeners
      this.setupEventListeners();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      // Initialize offline form queue from local storage
      this.initializeFormQueue();

      // Register and return the promise without additional wrapping
      // This allows errors to properly propagate up
      return this.wb.register().then(() => {
        logger.info('Service worker registered successfully');
        // Send message to service worker to update cached resources
        this.updateCachedResources();
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
          this.updateAvailable = true;
          this.showUpdateNotification();
        } else {
          logger.info('Service worker installed for the first time');
          this.showOfflineCapabilityNotification();
        }
      });

      // Handle controller change (when the service worker takes control)
      this.wb.addEventListener('controlling', () => {
        logger.info('Service worker is now controlling the page');
        if (this.updateAvailable) {
          window.location.reload();
        }
      });

      // Handle service worker activation
      this.wb.addEventListener('activated', (event: WorkboxLifecycleEvent) => {
        if (event.isUpdate) {
          logger.info('Service worker activated after update');
        } else {
          logger.info('Service worker activated for the first time');
          // Claim clients and update caches
          if (this.wb) {
            void this.wb.messageSW({ type: 'CLAIM_CLIENTS' }).catch((error) => {
              logger.error('Error sending claim clients message: ' + String(error));
            });
          }
        }
      });

      // Handle waiting service worker (update waiting to be activated)
      this.wb.addEventListener('waiting', () => {
        logger.info('New service worker waiting to be activated');
        this.updateAvailable = true;
        this.showUpdateNotification();
      });

      // Handle registration errors - Workbox supports 'error' events but the TypeScript type definitions don't
      // Use a type assertion to bypass the type check
      (this.wb as any).addEventListener('error', (event: Event) => {
        // Cast to our custom error event type which has the error property
        const errorEvent = event as WorkboxErrorEvent;
        const errorMsg = errorEvent.error ? errorEvent.error.message : String(event);
        logger.error('Service worker error: ' + errorMsg);
        this.showErrorNotification(errorMsg);
      });

      // Handle redundant service worker
      (this.wb as any).addEventListener('redundant', () => {
        logger.warn('Service worker became redundant');
        // Attempt to re-register
        setTimeout(() => {
          this.register().catch((error) => {
            logger.error('Failed to re-register service worker: ' + error);
          });
        }, 5000);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up service worker event listeners: ' + errorMsg);
    }
  }

  /**
   * Set up network monitoring
   * Handles transitions between online and offline states
   */
  private setupNetworkMonitoring(): void {
    if (this.isNetworkMonitoringEnabled) return;

    try {
      // Handle online status
      window.addEventListener('online', () => {
        logger.info('Application is now online');
        this.showNetworkStatusNotification(NetworkStatus.Online);
        // Process queued form submissions
        this.processQueuedFormSubmissions();
      });

      // Handle offline status
      window.addEventListener('offline', () => {
        logger.info('Application is now offline');
        this.showNetworkStatusNotification(NetworkStatus.Offline);
      });

      this.isNetworkMonitoringEnabled = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up network monitoring: ' + errorMsg);
    }
  }

  /**
   * Initialize form queue from local storage
   */
  private initializeFormQueue(): void {
    try {
      const storedQueue = localStorage.getItem(swConfig.syncQueueName);
      if (storedQueue) {
        try {
          const parsedQueue = JSON.parse(storedQueue) as unknown;
          // Type check the parsed data
          if (Array.isArray(parsedQueue) && this.isQueuedFormDataArray(parsedQueue)) {
            this.queuedFormData = parsedQueue;
            logger.info(`Loaded ${this.queuedFormData.length} queued form submissions`);
          }
        } catch {
          // JSON parse error
          logger.error('Error parsing stored queue data');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error initializing form queue: ' + errorMsg);
      // Reset queue if corrupted
      this.queuedFormData = [];
      localStorage.removeItem(swConfig.syncQueueName);
    }
  }

  /**
   * Queue a form submission for background sync
   * @param url The form submission URL
   * @param method The HTTP method (POST, PUT, etc.)
   * @param body The form data
   * @returns Promise resolving to true if queued successfully
   */
  queueFormSubmission(
    url: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const formData: QueuedFormData = {
        url,
        method,
        body,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };

      // Add to queue
      this.queuedFormData.push(formData);

      // Save to localStorage
      localStorage.setItem(swConfig.syncQueueName, JSON.stringify(this.queuedFormData));

      logger.info(`Queued form submission to ${url}`);

      // Try to process immediately if online
      if (navigator.onLine) {
        this.processQueuedFormSubmissions();
      } else {
        this.showNotification(
          "Your form has been saved and will be submitted when you're back online.",
          'info'
        );
      }

      return Promise.resolve(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error queuing form submission: ' + errorMsg);
      return Promise.resolve(false);
    }
  }

  /**
   * Process queued form submissions
   * Attempts to submit forms that were queued while offline
   */
  private processQueuedFormSubmissions(): void {
    if (this.queuedFormData.length === 0) return;

    logger.info(`Processing ${this.queuedFormData.length} queued form submissions`);

    // Process in order (FIFO)
    const processed: string[] = [];

    void Promise.all(
      this.queuedFormData.map(async (formData) => {
        try {
          const response = await fetch(formData.url, {
            method: formData.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData.body),
          });

          if (response.ok) {
            logger.info(`Successfully submitted queued form: ${formData.id}`);
            processed.push(formData.id);
          } else {
            logger.error(
              `Failed to submit queued form: ${formData.id}, status: ${response.status}`
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error submitting queued form ${formData.id}: ${errorMsg}`);
        }
      })
    ).then(() => {
      // Remove successfully processed items
      this.queuedFormData = this.queuedFormData.filter((item) => !processed.includes(item.id));

      // Update localStorage
      localStorage.setItem(swConfig.syncQueueName, JSON.stringify(this.queuedFormData));

      if (processed.length > 0) {
        this.showNotification(
          `Successfully submitted ${processed.length} form(s) from offline storage.`,
          'success'
        );
      }
    });
  }

  /**
   * Show notification for network status changes
   * @param status The network status (online/offline)
   */
  private showNetworkStatusNotification(status: NetworkStatus): void {
    if (status === NetworkStatus.Online) {
      this.showNotification('You are back online.', 'success');
    } else {
      this.showNotification('You are currently offline. Some features may be limited.', 'warning');
    }
  }

  /**
   * Show notification for service worker errors
   * @param errorMsg The error message
   */
  private showErrorNotification(errorMsg: string): void {
    this.showNotification(
      `Service worker error: ${errorMsg}. Some offline features may not work.`,
      'error'
    );
  }

  /**
   * Show notification for offline capability
   */
  private showOfflineCapabilityNotification(): void {
    this.showNotification(
      'This app can now work offline. Key features will remain available without internet.',
      'info'
    );
  }

  /**
   * Send message to update cached resources
   * This asks the service worker to update its caches
   */
  updateCachedResources(): void {
    if (this.wb && navigator.onLine) {
      this.wb
        .messageSW({ type: 'UPDATE_CACHES' })
        .then(() => {
          logger.info('Sent cache update message to service worker');
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Error sending cache update message: ' + errorMsg);
        });
    }
  }

  /**
   * Show enhanced update notification
   * Uses a non-blocking UI notification instead of a modal dialog
   */
  private showUpdateNotification(): void {
    this.showNotification(
      'A new version is available. <button id="pwa-update-button">Update now</button>',
      'info',
      10000 // Longer timeout for update notification
    );

    // Add event listener to the update button
    setTimeout(() => {
      const updateButton = document.getElementById('pwa-update-button');
      if (updateButton) {
        updateButton.addEventListener('click', () => {
          // Skip waiting - this will trigger the 'controlling' event
          if (this.wb) {
            this.wb.messageSW({ type: 'SKIP_WAITING' }).catch((error) => {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error('Error sending skip waiting message: ' + errorMsg);
            });
          }
        });
      }
    }, 100);
  }

  /**
   * Show a notification to the user
   * @param message The notification message (can include HTML)
   * @param type The notification type (info, success, warning, error)
   * @param timeout Time in ms before notification disappears (default: 5000)
   */
  private showNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    timeout = 5000
  ): void {
    // Clear any existing notification timeout
    if (this.notificationTimeout !== null) {
      window.clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }

    // Remove existing notification
    const existingNotification = document.getElementById('pwa-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create new notification
    createNotification(message, {
      id: 'pwa-notification',
      type,
      parent: document.body,
      autoClose: timeout > 0,
      closeAfterMs: timeout,
    });

    // Set timeout for auto-removal
    if (timeout > 0) {
      this.notificationTimeout = window.setTimeout(() => {
        const notification = document.getElementById('pwa-notification');
        if (notification) {
          notification.remove();
        }
        this.notificationTimeout = null;
      }, timeout);
    }
  }

  /**
   * Check if PWA is installed
   * @returns boolean indicating if app is installed
   */
  isInstalled(): boolean {
    try {
      // iOS devices have a 'standalone' property on navigator

      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
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

  /**
   * Check if browser is currently offline
   * @returns boolean indicating if browser is offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Clear cached data
   * @returns Promise resolving when cache is cleared
   */
  clearCache(): Promise<boolean> {
    if (!('caches' in window)) {
      return Promise.resolve(false);
    }

    const cacheNames = Object.values(swConfig.cacheNames);

    return Promise.all(
      cacheNames.map((cacheName) =>
        caches
          .delete(cacheName)
          .then((success) => {
            if (success) {
              logger.info(`Cache ${cacheName} cleared successfully`);
            } else {
              logger.warn(`Failed to clear cache ${cacheName}`);
            }
            return success;
          })
          .catch((error) => {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error clearing cache ${cacheName}: ${errorMsg}`);
            return false;
          })
      )
    ).then((results) => {
      const allSucceeded = results.every((result) => result);
      if (allSucceeded) {
        this.showNotification('App data cleared successfully.', 'success');
      } else {
        this.showNotification('Some app data could not be cleared.', 'warning');
      }
      return allSucceeded;
    });
  }
}

export const pwaService = new PWAService();
