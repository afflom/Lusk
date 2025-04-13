import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './PWAInstallPrompt';

describe('PWAInstallPrompt', () => {
  let installPrompt: HTMLElement;

  // Mock the logger
  vi.mock('../utils/logger', () => ({
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

  // Mock matchMedia
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock matchMedia to simulate not in standalone mode
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

    // Create and append the install prompt
    installPrompt = document.createElement('pwa-install-prompt');
    document.body.appendChild(installPrompt);
  });

  afterEach(() => {
    // Remove install prompt
    if (document.body.contains(installPrompt)) {
      document.body.removeChild(installPrompt);
    }

    // Restore original functions
    window.matchMedia = originalMatchMedia;
  });

  it('should create a component when connected to DOM', () => {
    // Just verify component exists
    expect(installPrompt).toBeDefined();
    expect(installPrompt.nodeName).toBe('PWA-INSTALL-PROMPT');
  });

  it('should handle platform detection', () => {
    // Test platform detection by simulating Chrome
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      configurable: true,
    });

    // Access the private method using any
    const installPromptAny = installPrompt as any;
    const platform = installPromptAny.detectPlatform();

    // Should detect Chrome
    expect(platform).toBe('chrome');
  });
});
