import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from './components/App';

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

// Mock App component
vi.mock('./components/App', () => ({
  createApp: vi.fn().mockReturnValue({ setAttribute: vi.fn() }),
}));

// Import after mocking
import { pwaService } from './services/pwa';
import { AppInitializer } from './main';
import * as logger from './utils/logger';

describe('Main application entry', () => {
  let originalAddEventListener: typeof document.addEventListener;
  let eventListeners: Record<string, EventListenerOrEventListenerObject[]>;

  beforeEach(() => {
    vi.resetAllMocks();

    // Store original addEventListener
    originalAddEventListener = document.addEventListener;

    // Mock addEventListener
    eventListeners = {};
    document.addEventListener = vi.fn((event, listener, _options) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener as EventListenerOrEventListenerObject);
    });
  });

  afterEach(() => {
    // Restore original
    document.addEventListener = originalAddEventListener;

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
    expect(createApp).toHaveBeenCalledWith('#app');
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

    // App should be created
    expect(createApp).toHaveBeenCalledWith('#app');
  });
});
