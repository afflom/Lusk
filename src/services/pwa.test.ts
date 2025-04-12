import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PWAService } from './pwa';
import * as domUtils from '../utils/dom';

// Create a mock for workbox-window
const mockWorkbox = {
  addEventListener: vi.fn(),
  register: vi.fn(() => Promise.resolve()),
  messageSW: vi.fn(() => Promise.resolve()),
};

// Mock workbox-window module before importing PWAService
vi.mock('workbox-window', () => ({
  Workbox: function () {
    return mockWorkbox;
  },
}));

describe('PWAService', () => {
  let pwaService: PWAService;
  let originalNavigator: any;
  let mockConfirm: any;
  let mockLocation: any;
  let mockLocalStorage: Record<string, string>;
  let mockCreateNotification: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Store original navigator and location
    originalNavigator = global.navigator;
    mockLocation = { reload: vi.fn() };
    mockLocalStorage = {};

    // Mock confirm dialog
    mockConfirm = vi.fn().mockReturnValue(true);
    global.confirm = mockConfirm;
    global.window.location = mockLocation as any;

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    };

    // Mock createNotification
    mockCreateNotification = vi.fn().mockReturnValue(document.createElement('div'));
    vi.spyOn(domUtils, 'createNotification').mockImplementation(mockCreateNotification);

    // Create service instance
    pwaService = new PWAService();

    // Force serviceWorker to be defined
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ scope: '/test/' }),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    global.navigator = originalNavigator;
    vi.restoreAllMocks();

    // Clear DOM
    document.body.innerHTML = '';
  });

  describe('register', () => {
    beforeEach(() => {
      // Mock fetch for service worker validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/javascript'),
        },
      });
    });

    it('should register the service worker directly', async () => {
      await pwaService.register();
      // Fetch should not be called anymore since we removed the validation
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockWorkbox.register).toHaveBeenCalled();

      // Should call updateCachedResources
      expect(mockWorkbox.messageSW).toHaveBeenCalledWith({ type: 'UPDATE_CACHES' });
    });

    it('should reject if service worker is not supported', async () => {
      // Remove serviceWorker from navigator
      delete (global.navigator as any).serviceWorker;

      await expect(pwaService.register()).rejects.toThrow('Service worker not supported');
    });

    it('should initialize network monitoring and form queue', async () => {
      // Mock window.addEventListener to capture event listeners
      const eventListeners: Record<string, (ev: Event) => void> = {};
      global.window.addEventListener = vi.fn((event, handler) => {
        eventListeners[event] = handler as (ev: Event) => void;
      });

      // Set up localStorage with a mock queue
      const mockQueue = JSON.stringify([
        {
          id: '123',
          url: '/api/test',
          method: 'POST',
          body: { test: true },
          timestamp: Date.now(),
        },
      ]);
      mockLocalStorage['ts-pwa-sync-queue'] = mockQueue;

      await pwaService.register();

      // Verify event listeners are set up
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

      // Verify queue is loaded
      expect(global.localStorage.getItem).toHaveBeenCalledWith('ts-pwa-sync-queue');
    });

    it('should handle service worker registration error', async () => {
      // Mock register to reject
      mockWorkbox.register.mockRejectedValueOnce(new Error('Registration failed'));

      await expect(pwaService.register()).rejects.toThrow('Registration failed');
    });

    it('should set up all event listeners when service worker is valid', async () => {
      await pwaService.register();

      // Verify all event listeners are set up
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith('installed', expect.any(Function));
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith(
        'controlling',
        expect.any(Function)
      );
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith('activated', expect.any(Function));
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith('waiting', expect.any(Function));
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWorkbox.addEventListener).toHaveBeenCalledWith('redundant', expect.any(Function));
    });

    it('should handle update event and show notification', async () => {
      await pwaService.register();

      // Find the installed event handler
      const installedHandlerCall = mockWorkbox.addEventListener.mock.calls.find(
        (call) => call[0] === 'installed'
      );
      const installedHandler = installedHandlerCall ? installedHandlerCall[1] : undefined;
      expect(installedHandler).toBeDefined();

      // Call the handler with an update event
      if (installedHandler) {
        installedHandler({ isUpdate: true });
      }

      // Check that notification was created
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.stringContaining('A new version is available'),
        expect.objectContaining({ type: 'info' })
      );
    });

    it('should show update notification for waiting service worker', async () => {
      await pwaService.register();

      // Find the waiting event handler
      const waitingHandlerCall = mockWorkbox.addEventListener.mock.calls.find(
        (call) => call[0] === 'waiting'
      );
      const waitingHandler = waitingHandlerCall ? waitingHandlerCall[1] : undefined;
      expect(waitingHandler).toBeDefined();

      // Call the handler
      if (waitingHandler) {
        waitingHandler();
      }

      // Verify notification was shown
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.stringContaining('A new version is available'),
        expect.objectContaining({ type: 'info' })
      );
    });
  });

  describe('isInstalled', () => {
    it('should detect standalone display mode', () => {
      // Mock matchMedia to return standalone true
      global.window.matchMedia = vi.fn().mockReturnValue({ matches: true });

      expect(pwaService.isInstalled()).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      // Mock matchMedia to return non-standalone
      global.window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      // Mock iOS standalone property
      (global.navigator as any).standalone = true;

      expect(pwaService.isInstalled()).toBe(true);
    });

    it('should return false when not installed', () => {
      // Mock matchMedia to return non-standalone
      global.window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      // Ensure iOS standalone is false
      (global.navigator as any).standalone = false;

      expect(pwaService.isInstalled()).toBe(false);
    });

    it('should handle errors and return false', () => {
      // Mock matchMedia to throw an error
      global.window.matchMedia = vi.fn().mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      expect(pwaService.isInstalled()).toBe(false);
    });
  });

  describe('isRegistered', () => {
    it('should return true when service worker is registered', async () => {
      // Mock getRegistration to return a registration
      (global.navigator.serviceWorker.getRegistration as any).mockResolvedValueOnce({
        scope: '/test/',
      });

      const isRegistered = await pwaService.isRegistered();
      expect(isRegistered).toBe(true);
    });

    it('should return false when no service worker is registered', async () => {
      // Mock getRegistration to return null
      (global.navigator.serviceWorker.getRegistration as any).mockResolvedValueOnce(null);

      const isRegistered = await pwaService.isRegistered();
      expect(isRegistered).toBe(false);
    });

    it('should return false when serviceWorker is not supported', async () => {
      // Remove serviceWorker from navigator
      delete (global.navigator as any).serviceWorker;

      const isRegistered = await pwaService.isRegistered();
      expect(isRegistered).toBe(false);
    });

    it('should handle errors and return false', async () => {
      // Mock getRegistration to throw an error
      (global.navigator.serviceWorker.getRegistration as any).mockRejectedValueOnce(
        new Error('Registration error')
      );

      const isRegistered = await pwaService.isRegistered();
      expect(isRegistered).toBe(false);
    });
  });

  describe('Network and offline features', () => {
    beforeEach(() => {
      // Mock online/offline status
      Object.defineProperty(global.navigator, 'onLine', {
        configurable: true,
        value: true,
      });

      // Mock fetch for testing form submissions
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
    });

    it('should detect offline status correctly', () => {
      // Set navigator.onLine to false
      Object.defineProperty(global.navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      expect(pwaService.isOffline()).toBe(true);

      // Set back to online
      Object.defineProperty(global.navigator, 'onLine', {
        configurable: true,
        value: true,
      });

      expect(pwaService.isOffline()).toBe(false);
    });

    it('should queue form submissions when offline', async () => {
      // Set offline
      Object.defineProperty(global.navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      const formData = { name: 'Test', value: 123 };
      await pwaService.queueFormSubmission('/api/submit', 'POST', formData);

      // Verify it was saved to localStorage
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"/api/submit"')
      );

      // Verify notification was shown
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.stringContaining('saved'),
        expect.objectContaining({ type: 'info' })
      );

      // Verify no fetch was attempted
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should queue form data for offline use', async () => {
      // More simplified test that checks queue functionality
      const formData = { test: 'data', value: 123 };

      // Call queueFormSubmission
      await pwaService.queueFormSubmission('/api/endpoint', 'POST', formData);

      // Verify that localStorage was used to store the data
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('/api/endpoint')
      );

      // Verify that the saved data contains the body
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"test":"data"')
      );
    });
  });

  describe('Cache management', () => {
    beforeEach(() => {
      // Mock window.caches
      global.caches = {
        open: vi.fn().mockResolvedValue({
          keys: vi.fn().mockResolvedValue([]),
          match: vi.fn().mockResolvedValue(null),
          put: vi.fn(),
          delete: vi.fn().mockResolvedValue(true),
        }),
        keys: vi
          .fn()
          .mockResolvedValue([
            'ts-pwa-static-v1.0.0',
            'ts-pwa-dynamic-v1.0.0',
            'ts-pwa-documents-v1.0.0',
            'old-cache-name-v0.9.0',
          ]),
        delete: vi.fn().mockResolvedValue(true),
        match: vi.fn(),
        has: vi.fn(),
      } as unknown as CacheStorage;
    });

    it('should clear cache correctly', async () => {
      const result = await pwaService.clearCache();

      // Mock the swConfig value for the test
      const mockCacheNames = {
        static: 'ts-pwa-static-v1.0.0',
        dynamic: 'ts-pwa-dynamic-v1.0.0',
        documents: 'ts-pwa-documents-v1.0.0',
        images: 'ts-pwa-images-v1.0.0',
        fonts: 'ts-pwa-fonts-v1.0.0',
        offline: 'ts-pwa-offline-v1.0.0',
      };

      // Patch the service instance to use our mock config
      Object.defineProperty(pwaService, 'swConfig', {
        get: () => ({ cacheNames: mockCacheNames }),
        configurable: true,
      });

      // Verify caches.delete was called for each cache
      expect(global.caches.delete).toHaveBeenCalledTimes(Object.keys(mockCacheNames).length);

      // Verify result is true
      expect(result).toBe(true);

      // Verify notification was shown
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.stringContaining('cleared successfully'),
        expect.objectContaining({ type: 'success' })
      );
    });

    it('should handle cache clearing errors', async () => {
      // Mock one cache deletion to fail
      (global.caches.delete as jest.Mock).mockRejectedValueOnce(new Error('Cache error'));

      const result = await pwaService.clearCache();

      // Verification should still pass for other caches
      expect(global.caches.delete).toHaveBeenCalled();

      // Result should be false due to one failure
      expect(result).toBe(false);

      // Verify warning notification
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.stringContaining('could not be cleared'),
        expect.objectContaining({ type: 'warning' })
      );
    });

    it('should return false if caches API is not supported', async () => {
      // Remove caches API
      delete (global as any).caches;

      const result = await pwaService.clearCache();

      expect(result).toBe(false);
    });
  });
});
