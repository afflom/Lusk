import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './PWASplashScreen';
import * as logger from '../utils/logger';

describe('PWASplashScreen', () => {
  let splashScreen: HTMLElement;

  // Mock the logger
  vi.mock('../utils/logger', () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }));

  // Mock setTimeout and Date.now
  const originalSetTimeout = window.setTimeout;
  const originalDateNow = Date.now;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Date.now to return a fixed timestamp
    Date.now = vi.fn(() => 1577836800000); // 2020-01-01T00:00:00Z

    // Create and append the splash screen
    splashScreen = document.createElement('pwa-splash-screen');
    document.body.appendChild(splashScreen);
  });

  afterEach(() => {
    // Remove splash screen
    if (document.body.contains(splashScreen)) {
      document.body.removeChild(splashScreen);
    }

    // Restore original functions
    window.setTimeout = originalSetTimeout;
    Date.now = originalDateNow;
  });

  it('should create a splash screen when connected to DOM', () => {
    // Check if the splash container is created
    const splashContainer = splashScreen.querySelector('.pwa-splash-screen');
    expect(splashContainer).not.toBeNull();

    // Check for essential elements
    expect(splashScreen.querySelector('.pwa-splash-title')).not.toBeNull();
    expect(splashScreen.querySelector('.pwa-splash-loading')).not.toBeNull();
  });

  it('should react to app-ready event', () => {
    // Fast-forward time to simulate minimum splash time has elapsed
    vi.spyOn(Date, 'now').mockReturnValue(1577836800000 + 2000); // +2 seconds

    // Mock setTimeout to execute immediately
    vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 0 as unknown as number;
    });

    // Fire app-ready event
    window.dispatchEvent(new Event('app-ready'));

    // Logger should be called
    expect(logger.info).toHaveBeenCalledWith('App ready event received');
  });

  it('should wait for minimum time before hiding splash screen', () => {
    // Simulate we just started (elapsed time < minimum)
    vi.spyOn(Date, 'now').mockReturnValue(1577836800000 + 500); // Only +500ms

    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    // Fire app-ready event
    window.dispatchEvent(new Event('app-ready'));

    // Should call setTimeout with the remaining time
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500); // 1000 - 500 = 500ms
  });

  it('should provide manual method to set app ready', () => {
    // Set up a spy on dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    // Call the setAppReady method
    const splashScreenElement = splashScreen as any;
    splashScreenElement.setAppReady();

    // Check if event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
    expect(dispatchEventSpy.mock.calls[0][0].type).toBe('app-ready');
  });

  it('should set up fallback timer to hide splash after max time', () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    // Create a new splash screen to trigger the initialization
    const newSplashScreen = document.createElement('pwa-splash-screen');
    document.body.appendChild(newSplashScreen);

    // Check if setTimeout was called with a timeout value (10000ms)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

    // Clean up
    document.body.removeChild(newSplashScreen);
  });

  it('should have fallback timer for app not ready', () => {
    // Mock setTimeout to execute callback immediately
    vi.spyOn(window, 'setTimeout').mockImplementation((callback, _timeout) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 0 as unknown as number;
    });

    // Create a new splash screen to trigger fallback timer
    const newSplashScreen = document.createElement('pwa-splash-screen');
    document.body.appendChild(newSplashScreen);

    // Warning should be logged because app is not ready
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('App ready event not fired after timeout')
    );

    // Clean up
    document.body.removeChild(newSplashScreen);
  });
});
