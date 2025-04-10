import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PWAService } from './pwa';

// Create a mock for workbox-window
const mockWorkbox = {
  addEventListener: vi.fn(),
  register: vi.fn(() => Promise.resolve()),
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

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Store original navigator and location
    originalNavigator = global.navigator;
    mockLocation = { reload: vi.fn() };

    // Mock confirm dialog
    mockConfirm = vi.fn().mockReturnValue(true);
    global.confirm = mockConfirm;
    global.window.location = mockLocation as any;

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
    });

    it('should reject if service worker is not supported', async () => {
      // Remove serviceWorker from navigator
      delete (global.navigator as any).serviceWorker;

      await expect(pwaService.register()).rejects.toThrow('Service worker not supported');
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
    });

    it('should handle update event and reload on confirmation', async () => {
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

      expect(mockConfirm).toHaveBeenCalledWith('New app update is available! Click OK to refresh.');
      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('should not reload if update is dismissed', async () => {
      // Set confirm to return false
      mockConfirm.mockReturnValueOnce(false);

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

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockLocation.reload).not.toHaveBeenCalled();
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
});
