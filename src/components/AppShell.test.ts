import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import './AppShell';
import { AppShellElement } from './AppShell';

describe('AppShell Component', () => {
  let rootElement: HTMLDivElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clean up DOM
    document.body.innerHTML = '';

    // Create test container
    rootElement = document.createElement('div');
    rootElement.id = 'app';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
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
});
