import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as pwaAnalytics from './pwa-analytics';
import * as logger from './logger';

describe('PWA Analytics', () => {
  // Mock the logger
  vi.mock('./logger', () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }));

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock navigator and matchMedia
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = navigator.userAgent;
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    // Mock URL Search Params
    const originalURL = window.location;
    // @ts-expect-error - needed for mocking window.location
    delete window.location;
    // @ts-expect-error - needed for mocking window.location
    window.location = {
      ...originalURL,
      search: '',
    };

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
    });
  });

  describe('getPlatformInfo', () => {
    it('should detect Chrome on Windows', () => {
      // Mock userAgent for Chrome on Windows
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        writable: true,
      });

      const info = pwaAnalytics.getPlatformInfo();

      expect(info.platform).toBe('windows');
      expect(info.browser).toBe('chrome');
      expect(info.displayMode).toBe('browser');
      expect(info.isStandalone).toBe(false);
      expect(info.installSource).toBeUndefined();
    });

    it('should detect Safari on iOS', () => {
      // Mock userAgent for Safari on iOS
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        writable: true,
      });

      const info = pwaAnalytics.getPlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.browser).toBe('safari');
      expect(info.displayMode).toBe('browser');
      expect(info.isStandalone).toBe(false);
    });

    it('should detect standalone mode', () => {
      // Mock userAgent for Chrome on Android
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
        writable: true,
      });

      // Mock standalone mode
      window.matchMedia = vi.fn().mockImplementation((query) => {
        return {
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const info = pwaAnalytics.getPlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.browser).toBe('chrome');
      expect(info.displayMode).toBe('standalone');
      expect(info.isStandalone).toBe(true);
    });

    it('should detect install source from URL', () => {
      // Mock userAgent for Chrome on Android
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
        writable: true,
      });

      // Mock URL with source param
      const originalURL = window.location;
      // @ts-expect-error - needed for mocking window.location
      delete window.location;
      // @ts-expect-error - needed for mocking window.location
      window.location = {
        ...originalURL,
        search: '?source=homescreen',
      };

      const info = pwaAnalytics.getPlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.browser).toBe('chrome');
      expect(info.installSource).toBe('homescreen');
    });
  });

  describe('trackInstallEvent', () => {
    it('should log install events and store in localStorage', () => {
      pwaAnalytics.trackInstallEvent(pwaAnalytics.InstallEvent.INSTALLED);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Install Event: app_installed'),
        expect.anything()
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith('pwa-installed', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pwa-install-time', expect.any(String));
    });

    it('should track additional data with events', () => {
      pwaAnalytics.trackInstallEvent(pwaAnalytics.InstallEvent.PROMPT_ACCEPTED, {
        buttonType: 'custom-button',
        timeToInstall: 3500,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Install Event: installprompt_accepted'),
        expect.objectContaining({
          buttonType: 'custom-button',
          timeToInstall: 3500,
        })
      );
    });
  });

  describe('trackUsageEvent', () => {
    it('should log usage events', () => {
      pwaAnalytics.trackUsageEvent(pwaAnalytics.UsageEvent.APP_LAUNCHED);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Usage Event: app_launched'),
        expect.anything()
      );
    });

    it('should queue analytics events when offline', () => {
      // Mock navigator.onLine to false
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      pwaAnalytics.trackUsageEvent(pwaAnalytics.UsageEvent.OFFLINE_INTERACTION, {
        feature: 'calculator',
        action: 'compute',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Usage Event: offline_interaction'),
        expect.anything()
      );

      // Should store in localStorage queue
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pwa-analytics-queue',
        expect.stringContaining('offline_interaction')
      );
    });
  });

  describe('processOfflineAnalyticsQueue', () => {
    it('should process queued analytics events', () => {
      // Create a fake queue with some events
      const queuedEvents = [
        {
          event: pwaAnalytics.UsageEvent.OFFLINE_INTERACTION,
          feature: 'calculator',
          timestamp: new Date().toISOString(),
        },
        {
          event: pwaAnalytics.UsageEvent.APP_LAUNCHED,
          timestamp: new Date().toISOString(),
        },
      ];

      localStorageMock.setItem('pwa-analytics-queue', JSON.stringify(queuedEvents));

      pwaAnalytics.processOfflineAnalyticsQueue();

      // Should log each event
      expect(logger.info).toHaveBeenCalledTimes(3); // 2 events + 1 summary

      // Should clear the queue after processing
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pwa-analytics-queue');
    });

    it('should handle invalid queue data gracefully', () => {
      // Set invalid JSON in the queue
      localStorageMock.setItem('pwa-analytics-queue', 'not valid json');

      // Mock JSON.parse to throw error
      const originalJSONParse = JSON.parse;
      JSON.parse = vi.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      pwaAnalytics.processOfflineAnalyticsQueue();

      // Should remove the invalid queue
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pwa-analytics-queue');

      // Restore JSON.parse
      JSON.parse = originalJSONParse;
    });
  });

  describe('initPWAAnalytics', () => {
    it('should track initial app launch', () => {
      pwaAnalytics.initPWAAnalytics();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Usage Event: app_launched'),
        expect.anything()
      );
    });

    it('should track standalone launches', () => {
      // Mock standalone mode
      window.matchMedia = vi.fn().mockImplementation((query) => {
        return {
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      pwaAnalytics.initPWAAnalytics();

      // Should track both regular launch and standalone launch
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Usage Event: app_launched'),
        expect.anything()
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PWA Usage Event: app_launched_standalone'),
        expect.anything()
      );
    });

    it('should set up online/offline listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      pwaAnalytics.initPWAAnalytics();

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should process offline queue on init if online', () => {
      // Create a fake queue with an event
      const queuedEvents = [
        {
          event: pwaAnalytics.UsageEvent.OFFLINE_INTERACTION,
          feature: 'calculator',
          timestamp: new Date().toISOString(),
        },
      ];

      localStorageMock.setItem('pwa-analytics-queue', JSON.stringify(queuedEvents));

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });

      pwaAnalytics.initPWAAnalytics();

      // Should process the queued events
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sending queued analytics event'),
        expect.anything()
      );

      // Should clear the queue
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pwa-analytics-queue');
    });
  });
});
