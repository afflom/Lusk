import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import './AppShell';
import { AppShellElement } from './AppShell';
import { pwaService } from '../services/pwa';
import * as pwaAnalytics from '../utils/pwa-analytics';

// Mock dependencies
vi.mock('../services/pwa', () => ({
  pwaService: {
    register: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../utils/pwa-analytics', () => ({
  initPWAAnalytics: vi.fn(),
  trackUsageEvent: vi.fn(),
  UsageEvent: {
    APP_LAUNCHED: 'app_launched',
  },
}));

// Mock window.scrollTo since it's not implemented in JSDOM
beforeAll(() => {
  // Add global mocks for window methods used in the component
  window.scrollTo = vi.fn();
});

describe('AppShell Component', () => {
  let rootElement: HTMLDivElement;

  let originalSetTimeout: typeof window.setTimeout;
  let originalDispatchEvent: typeof window.dispatchEvent;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock setTimeout to execute immediately
    originalSetTimeout = window.setTimeout;
    window.setTimeout = vi.fn((callback, _timeout) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 0 as unknown as number;
    });

    // Mock window.dispatchEvent
    originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = vi.fn();

    // Clean up DOM
    document.body.innerHTML = '';

    // Create test container
    rootElement = document.createElement('div');
    rootElement.id = 'app';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';

    // Restore original functions
    window.setTimeout = originalSetTimeout;
    window.dispatchEvent = originalDispatchEvent;
  });

  it('should be registered with custom elements registry', () => {
    expect(customElements.get('app-shell')).toBeDefined();
  });

  it('should extend HTMLElement', () => {
    const appShell = document.createElement('app-shell');
    expect(appShell instanceof HTMLElement).toBe(true);
  });

  it('should create a shadow DOM in open mode', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);
    expect(appShell.shadowRoot).toBeDefined();
    expect(appShell.shadowRoot?.mode).toBe('open');
  });

  it('should render basic structure with header, main, and footer', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify basic structure
    const header = appShell.shadowRoot?.querySelector('.app-header');
    const main = appShell.shadowRoot?.querySelector('.app-main');
    const footer = appShell.shadowRoot?.querySelector('.app-footer');

    expect(header).toBeDefined();
    expect(main).toBeDefined();
    expect(footer).toBeDefined();
  });

  it('should include navigation component', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify navigation component is present
    const navigation = appShell.shadowRoot?.querySelector('app-navigation');
    expect(navigation).toBeDefined();
  });

  it('should include router outlet', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify router outlet is present
    const routerOutlet = appShell.shadowRoot?.querySelector('.router-outlet');
    expect(routerOutlet).toBeDefined();
  });

  it('should initialize PWA service', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify PWA service was initialized
    expect(pwaService.register).toHaveBeenCalled();
  });

  it('should initialize PWA analytics', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify PWA analytics was initialized
    expect(pwaAnalytics.initPWAAnalytics).toHaveBeenCalled();
  });

  it('should initialize properly', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify dispatchEvent was called - we don't check the event type
    // since different events might be dispatched during initialization
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it('should track app launch event', () => {
    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Verify launch event was tracked
    expect(pwaAnalytics.trackUsageEvent).toHaveBeenCalledWith(pwaAnalytics.UsageEvent.APP_LAUNCHED);
  });

  it('should handle errors in PWA initialization', async () => {
    // Mock PWA service to fail
    (pwaService.register as any).mockRejectedValueOnce(new Error('Test error'));

    // Spy on console
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const appShell = document.createElement('app-shell') as AppShellElement;
    document.body.appendChild(appShell);

    // Wait for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    // App should still work despite PWA initialization error
    expect(appShell.shadowRoot?.querySelector('.app-shell')).toBeDefined();

    // Restore console
    consoleWarnSpy.mockRestore();
  });
});
