import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import was removed, using direct element creation

// Mock the logger module before importing the main module
vi.mock('./utils/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  configure: vi.fn(),
  resetConfig: vi.fn(),
  getConfig: vi.fn(),
  disableLogging: vi.fn(),
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    configure: vi.fn(),
    resetConfig: vi.fn(),
    getConfig: vi.fn(),
    disableLogging: vi.fn(),
  },
}));

// Mock dependencies - must be before importing the module
vi.mock('./services/pwa', () => ({
  pwaService: {
    register: vi.fn(() => Promise.resolve()),
  },
}));

// Mock PWA Analytics
vi.mock('./utils/pwa-analytics', () => ({
  trackInstallEvent: vi.fn(),
  trackUsageEvent: vi.fn(),
  initPWAAnalytics: vi.fn(),
  InstallEvent: {
    PROMPT_SHOWN: 'installprompt_shown',
    PROMPT_ACCEPTED: 'installprompt_accepted',
    PROMPT_DISMISSED: 'installprompt_dismissed',
    INSTALLED: 'app_installed',
    UNINSTALLED: 'app_uninstalled',
  },
  UsageEvent: {
    ONLINE: 'app_online',
    OFFLINE: 'app_offline',
    APP_LAUNCHED: 'app_launched',
    APP_LAUNCHED_STANDALONE: 'app_launched_standalone',
  },
}));

// Mock Counter component for testing
vi.mock('./components/Counter', () => ({
  CounterElement: class MockCounter {
    // Implement basic Counter functionality for tests
    getValue(): number {
      return 0;
    }
    increment(): void {}
    setAttribute(): void {}
  },
  createCounter: vi.fn(),
}));

// Mock AppShell component
vi.mock('./components/AppShell', () => ({
  AppShellElement: class MockAppShell extends HTMLElement {
    connectedCallback(): void {}
    setAttribute(): void {}
  },
}));

// Mock PWA Install Prompt component
vi.mock('./components/PWAInstallPrompt', () => ({
  PWAInstallPrompt: class MockPWAInstallPrompt extends HTMLElement {
    connectedCallback(): void {}
  },
}));

// Mock PWA Splash Screen component
vi.mock('./components/PWASplashScreen', () => ({
  PWASplashScreen: class MockPWASplashScreen extends HTMLElement {
    connectedCallback(): void {}
    setAppReady(): void {}
  },
}));

// Import after mocking
import { pwaService } from './services/pwa';
import { AppInitializer } from './main';
import * as logger from './utils/logger';
import * as pwaAnalytics from './utils/pwa-analytics';

describe('Main application entry', () => {
  let originalAddEventListener: typeof document.addEventListener;
  let originalWindowAddEventListener: typeof window.addEventListener;
  let eventListeners: Record<string, EventListenerOrEventListenerObject[]>;
  let windowEventListeners: Record<string, EventListenerOrEventListenerObject[]>;

  beforeEach(() => {
    vi.resetAllMocks();

    // Store original addEventListener
    originalAddEventListener = document.addEventListener;
    originalWindowAddEventListener = window.addEventListener;

    // Mock document addEventListener
    eventListeners = {};
    document.addEventListener = vi.fn((event, listener, _options) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener as EventListenerOrEventListenerObject);
    });

    // Mock window addEventListener
    windowEventListeners = {};
    window.addEventListener = vi.fn((event, listener, _options) => {
      if (!windowEventListeners[event]) {
        windowEventListeners[event] = [];
      }
      windowEventListeners[event].push(listener as EventListenerOrEventListenerObject);
    });
  });

  afterEach(() => {
    // Restore originals
    document.addEventListener = originalAddEventListener;
    window.addEventListener = originalWindowAddEventListener;

    // Reset document
    document.body.innerHTML = '';
  });

  it('should register PWA service', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Create an instance of AppInitializer
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Should have tried to register PWA
    expect(pwaService.register).toHaveBeenCalled();
  });

  it('should handle PWA registration errors gracefully', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    const testError = new Error('Test error');

    // Make registration fail
    (pwaService.register as any).mockRejectedValueOnce(testError);

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Should have logged warning
    expect(logger.warn).toHaveBeenCalled();

    // App should still be created despite PWA error
    // In the new implementation, we directly create an app-shell element
    expect(document.querySelector('#app')?.children.length).toBeGreaterThan(0);
  });

  it('should initialize app components', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // AppShell component should be created
    expect(document.querySelector('#app')?.children.length).toBeGreaterThan(0);
  });

  it('should add PWA components during initialization', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Simply verify that components are added
    // Different components might initialize PWA analytics
    expect(document.querySelector('pwa-install-prompt')).not.toBeNull();
  });

  it('should add PWA installation components', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Should add the PWA splash screen
    expect(document.querySelector('pwa-splash-screen')).not.toBeNull();

    // Should add the PWA install prompt
    expect(document.querySelector('pwa-install-prompt')).not.toBeNull();
  });

  it('should setup install event listeners', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Should set up event listeners for PWA install events
    expect(window.addEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });

  it('should track install events', async () => {
    // Create test div for app
    document.body.innerHTML = '<div id="app"></div>';

    // Create an instance and initialize
    const appInit = new AppInitializer();
    await appInit.initialize();

    // Find and manually call the event handlers
    const beforeInstallPromptHandler = vi
      .mocked(window.addEventListener)
      .mock.calls.find((call) => call[0] === 'beforeinstallprompt')?.[1] as (event: Event) => void;

    const appInstalledHandler = vi
      .mocked(window.addEventListener)
      .mock.calls.find((call) => call[0] === 'appinstalled')?.[1] as (event: Event) => void;

    // Trigger the handlers
    if (beforeInstallPromptHandler) {
      beforeInstallPromptHandler(new Event('beforeinstallprompt'));
    }

    if (appInstalledHandler) {
      appInstalledHandler(new Event('appinstalled'));
    }

    // Should track events
    expect(pwaAnalytics.trackInstallEvent).toHaveBeenCalledWith(
      pwaAnalytics.InstallEvent.PROMPT_SHOWN
    );
    expect(pwaAnalytics.trackInstallEvent).toHaveBeenCalledWith(
      pwaAnalytics.InstallEvent.INSTALLED
    );
  });
});
