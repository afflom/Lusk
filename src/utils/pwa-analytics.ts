/**
 * PWA Analytics Utilities
 *
 * This module provides utilities for tracking PWA-specific analytics
 * including installation events, offline usage, and performance metrics.
 */
import * as logger from './logger';

// Define type for Google Analytics gtag function
interface GTagFunction {
  (command: string, eventName: string, eventParams: Record<string, unknown>): void;
}

/**
 * PWA Installation events that can be tracked
 */
export enum InstallEvent {
  PROMPT_SHOWN = 'installprompt_shown',
  PROMPT_ACCEPTED = 'installprompt_accepted',
  PROMPT_DISMISSED = 'installprompt_dismissed',
  INSTALLED = 'app_installed',
  UNINSTALLED = 'app_uninstalled',
}

/**
 * PWA Usage events that can be tracked
 */
export enum UsageEvent {
  ONLINE = 'app_online',
  OFFLINE = 'app_offline',
  OFFLINE_INTERACTION = 'offline_interaction',
  APP_LAUNCHED = 'app_launched',
  APP_LAUNCHED_STANDALONE = 'app_launched_standalone',
  APP_FROM_HOMESCREEN = 'app_from_homescreen',
  BACKGROUND_SYNC = 'background_sync_completed',
}

/**
 * Platform information for analytics
 */
interface PlatformInfo {
  platform: string;
  browser: string;
  displayMode: string;
  isStandalone: boolean;
  installSource?: string;
}

/**
 * Get platform information for analytics
 */
export function getPlatformInfo(): PlatformInfo {
  try {
    const ua = navigator.userAgent;
    const urlParams = new URLSearchParams(window.location.search);

    // Determine platform
    let platform = 'unknown';
    if (/android/i.test(ua)) {
      platform = 'android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      platform = 'ios';
    } else if (/windows/i.test(ua)) {
      platform = 'windows';
    } else if (/macintosh/i.test(ua)) {
      platform = 'macos';
    } else if (/linux/i.test(ua)) {
      platform = 'linux';
    }

    // Determine browser
    let browser = 'unknown';
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
      browser = 'chrome';
    } else if (/firefox/i.test(ua)) {
      browser = 'firefox';
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'safari';
    } else if (/edg/i.test(ua)) {
      browser = 'edge';
    } else if (/opera|opr/i.test(ua)) {
      browser = 'opera';
    } else if (/samsung/i.test(ua)) {
      browser = 'samsung';
    }

    // Determine display mode
    let displayMode = 'browser';
    if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
      displayMode = 'fullscreen';
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      displayMode = 'minimal-ui';
    }

    // Check for iOS standalone mode
    const isStandalone =
      displayMode !== 'browser' || (navigator as { standalone?: boolean }).standalone === true;

    // Check for install source (used for attributing installations to specific prompts)
    const installSource = urlParams.get('source') || undefined;

    return {
      platform,
      browser,
      displayMode,
      isStandalone,
      installSource,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error getting platform info: ' + errorMsg);

    return {
      platform: 'unknown',
      browser: 'unknown',
      displayMode: 'unknown',
      isStandalone: false,
    };
  }
}

/**
 * Track a PWA installation event
 */
export function trackInstallEvent(
  event: InstallEvent,
  additionalData: Record<string, unknown> = {}
): void {
  try {
    const platformInfo = getPlatformInfo();
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      ...platformInfo,
      ...additionalData,
    };

    // Send to analytics service
    logger.info(`PWA Install Event: ${event}`, eventData);

    // Send event to analytics service (if available in window)
    if (typeof window !== 'undefined' && window.gtag) {
      try {
        // Get properly typed gtag function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const gtagFunc = (window as any).gtag as GTagFunction;
        gtagFunc('event', `pwa_${event}`, {
          event_category: 'pwa_install',
          event_label: platformInfo.platform,
          value: 1,
          ...additionalData,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error sending analytics event: ' + errorMsg);
      }
    }

    // Record that we've shown the prompt to the user
    if (event === InstallEvent.PROMPT_SHOWN) {
      localStorage.setItem('pwa-install-prompt-shown', 'true');
    }

    // Record installation in localStorage for future reference
    if (event === InstallEvent.INSTALLED) {
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-install-time', new Date().toISOString());
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error tracking install event: ' + errorMsg);
  }
}

/**
 * Track a PWA usage event
 */
export function trackUsageEvent(
  event: UsageEvent,
  additionalData: Record<string, unknown> = {}
): void {
  try {
    const platformInfo = getPlatformInfo();
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      ...platformInfo,
      ...additionalData,
    };

    // Log the event and send to analytics service
    logger.info(`PWA Usage Event: ${event}`, eventData);

    // Send event to analytics service (if available in window)
    if (typeof window !== 'undefined' && window.gtag) {
      try {
        // Get properly typed gtag function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const gtagFunc = (window as any).gtag as GTagFunction;
        gtagFunc('event', `pwa_${event}`, {
          event_category: 'pwa_usage',
          event_label: platformInfo.displayMode,
          value: 1,
          ...additionalData,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error sending analytics event: ' + errorMsg);
      }
    }

    // For offline events, store for later synchronization when online
    if (!navigator.onLine) {
      queueOfflineAnalytics(event, eventData);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error tracking usage event: ' + errorMsg);
  }
}

/**
 * Queue analytics events while offline
 */
function queueOfflineAnalytics(_event: UsageEvent, eventData: Record<string, unknown>): void {
  try {
    const QUEUE_KEY = 'pwa-analytics-queue';

    // Get existing queue
    let queue: Record<string, unknown>[] = [];
    const storedQueue = localStorage.getItem(QUEUE_KEY);

    if (storedQueue) {
      try {
        const parsed = JSON.parse(storedQueue) as unknown;
        if (Array.isArray(parsed)) {
          queue = parsed.map((item) => item as Record<string, unknown>);
        }
      } catch {
        queue = [];
      }
    }

    // Add new event to queue
    queue.push(eventData);

    // Save updated queue
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error queuing offline analytics: ' + errorMsg);
  }
}

/**
 * Process queued analytics events when back online
 */
export function processOfflineAnalyticsQueue(): void {
  try {
    const QUEUE_KEY = 'pwa-analytics-queue';

    // Get existing queue
    const storedQueue = localStorage.getItem(QUEUE_KEY);
    if (!storedQueue) return;

    let queue: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(storedQueue) as unknown;
      if (Array.isArray(parsed)) {
        queue = parsed.map((item) => item as Record<string, unknown>);
      } else {
        // Invalid format, clear the queue
        localStorage.removeItem(QUEUE_KEY);
        return;
      }
    } catch {
      // Invalid JSON, clear the queue
      localStorage.removeItem(QUEUE_KEY);
      return;
    }

    if (!Array.isArray(queue) || queue.length === 0) {
      localStorage.removeItem(QUEUE_KEY);
      return;
    }

    // Process and send all queued events
    queue.forEach((eventData) => {
      const eventName = typeof eventData.event === 'string' ? eventData.event : 'unknown_event';
      logger.info(`Sending queued analytics event: ${eventName}`, eventData);

      // Send event to analytics service (if available in window)
      if (typeof window !== 'undefined' && window.gtag) {
        try {
          // Get properly typed gtag function
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const gtagFunc = (window as any).gtag as GTagFunction;
          gtagFunc('event', `pwa_offline_${eventName}`, {
            event_category: 'pwa_offline',
            event_label: 'offline_sync',
            value: 1,
            timestamp: eventData.timestamp,
            offline_queue: true,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Error sending queued analytics event: ' + errorMsg);
        }
      }
    });

    // Clear the queue
    localStorage.removeItem(QUEUE_KEY);

    // Log successful synchronization
    logger.info(`Processed ${queue.length} offline analytics events`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error processing offline analytics queue: ' + errorMsg);
  }
}

/**
 * Track app launch and setup analytics event listeners
 */
export function initPWAAnalytics(): void {
  try {
    const platformInfo = getPlatformInfo();

    // Track initial app launch
    trackUsageEvent(UsageEvent.APP_LAUNCHED);

    // Track standalone launch if applicable
    if (platformInfo.isStandalone) {
      trackUsageEvent(UsageEvent.APP_LAUNCHED_STANDALONE);
    }

    // Track if launched from homescreen (via query param)
    if (platformInfo.installSource === 'homescreen') {
      trackUsageEvent(UsageEvent.APP_FROM_HOMESCREEN);
    }

    // Set up online/offline listeners
    window.addEventListener('online', () => {
      trackUsageEvent(UsageEvent.ONLINE);
      processOfflineAnalyticsQueue();
    });

    window.addEventListener('offline', () => {
      trackUsageEvent(UsageEvent.OFFLINE);
    });

    // Process any existing offline queue
    if (navigator.onLine) {
      processOfflineAnalyticsQueue();
    }

    // If we received a notification click, track it
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('notification') === 'clicked') {
      trackUsageEvent('notification_click' as UsageEvent, {
        notificationType: urlParams.get('type') || 'unknown',
      });
    }

    // Track user agent
    trackUsageEvent(UsageEvent.APP_LAUNCHED, {
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error initializing PWA analytics: ' + errorMsg);
  }
}
