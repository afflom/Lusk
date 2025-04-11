/**
 * App Shell component
 * Provides the overall structure for the PWA
 */
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';
import { routerService, Route } from '../services/router';
import './Navigation';
import { NavigationElement } from './Navigation';
import './MathDemo';

// Import all pages
import '../pages/HomePage';
import '../pages/CalculatorPage';

export class AppShellElement extends HTMLElement {
  private _root: ShadowRoot;
  private _initialized = false;

  // Define routes
  private routes: Route[] = [
    {
      id: 'home',
      path: '/',
      component: 'home-page',
      title: 'Prime Math Library Explorer',
      default: true,
    },
    {
      id: 'calculator',
      path: '/calculator',
      component: 'calculator-page',
      title: 'Calculator | Prime Math Library Explorer',
    },
  ];

  constructor() {
    super();

    // Create shadow DOM
    this._root = this.attachShadow({ mode: 'open' });

    // Initialize styles
    this.initStyles();
  }

  /**
   * Initialize the component styles
   */
  private initStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        min-height: 100vh;
        font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
        color: ${THEME.colors.text.primary};
        background-color: ${THEME.colors.background.main};
      }
      
      .app-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      
      .app-header {
        background-color: ${THEME.colors.background.darker};
        padding: ${THEME.spacing.md};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .app-title {
        font-size: ${THEME.fontSizes.xlarge};
        margin: 0 0 ${THEME.spacing.md} 0;
        text-align: center;
        color: ${THEME.colors.primary};
      }
      
      .app-main {
        flex: 1;
        margin: 0 auto;
        width: 100%;
        max-width: 1200px;
        padding: ${THEME.spacing.md};
        box-sizing: border-box;
      }
      
      .app-footer {
        background-color: ${THEME.colors.background.darker};
        padding: ${THEME.spacing.md};
        text-align: center;
        color: ${THEME.colors.text.secondary};
        font-size: ${THEME.fontSizes.small};
      }
      
      .router-outlet {
        margin-top: ${THEME.spacing.lg};
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .app-header {
          padding: ${THEME.spacing.sm};
        }
        
        .app-title {
          font-size: ${THEME.fontSizes.large};
        }
        
        .app-main {
          padding: ${THEME.spacing.sm};
        }
      }
    `;

    this._root.appendChild(style);
  }

  /**
   * Lifecycle: when element is added to DOM
   */
  connectedCallback(): void {
    try {
      if (!this._initialized) {
        this.render();
        this._initialized = true;
      }
    } catch (error) {
      logger.error(
        'Error in AppShellElement connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error initializing app shell component' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Lifecycle: when element is removed from DOM
   */
  disconnectedCallback(): void {
    try {
      // Clean up event listeners
      const navigation = this._root.querySelector('app-navigation');
      if (navigation) {
        navigation.removeEventListener('navigation', this.handleNavigation);
      }

      // Clean up page listeners
      const homePage = this._root.querySelector('home-page');
      if (homePage) {
        homePage.removeEventListener('navigate', this.handlePageNavigation);
      }
    } catch (error) {
      logger.error(
        'Error in AppShellElement disconnectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle navigation events from the navigation component
   */
  private handleNavigation = (event: Event): void => {
    try {
      const customEvent = event as CustomEvent<{ id: string }>;
      const { id } = customEvent.detail;
      routerService.navigateToRoute(id);

      // Update navigation highlights
      this.updateNavigationState();
    } catch (error) {
      logger.error(
        'Error handling navigation event:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  /**
   * Handle navigation events from pages
   */
  private handlePageNavigation = (event: Event): void => {
    try {
      const customEvent = event as CustomEvent<{ page: string }>;
      const { page } = customEvent.detail;
      routerService.navigateToRoute(page);

      // Update navigation highlights
      this.updateNavigationState();
    } catch (error) {
      logger.error(
        'Error handling page navigation event:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  /**
   * Update navigation component state based on current route
   */
  private updateNavigationState(): void {
    try {
      const currentRoute = routerService.getCurrentRoute();
      if (!currentRoute) return;

      const navigation = this._root.querySelector('app-navigation') as NavigationElement;
      if (!navigation) return;

      // Update active item
      navigation.setActive(currentRoute.id);
    } catch (error) {
      logger.error(
        'Error updating navigation state:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Render the app shell
   */
  private render(): void {
    try {
      // Create app shell structure
      const appShell = document.createElement('div');
      appShell.className = 'app-shell';

      // Create header
      const header = document.createElement('header');
      header.className = 'app-header';

      const title = document.createElement('h1');
      title.className = 'app-title';
      title.textContent = 'Prime Math Library Explorer';
      header.appendChild(title);

      // Create navigation
      const navigation = document.createElement('app-navigation');
      navigation.addEventListener('navigation', this.handleNavigation);
      header.appendChild(navigation);

      appShell.appendChild(header);

      // Create main content area
      const main = document.createElement('main');
      main.className = 'app-main';

      // Create router outlet
      const routerOutlet = document.createElement('div');
      routerOutlet.className = 'router-outlet';
      main.appendChild(routerOutlet);

      // Create a hidden math-demo component for testing compatibility
      const mathDemo = document.createElement('math-demo');
      mathDemo.style.display = 'none';
      main.appendChild(mathDemo);

      appShell.appendChild(main);

      // Create footer
      const footer = document.createElement('footer');
      footer.className = 'app-footer';
      footer.innerHTML = `
        <p>© ${new Date().getFullYear()} Prime Math Library Explorer | Powered by @uor-foundation/math-js</p>
      `;

      appShell.appendChild(footer);

      // Append to shadow root
      this._root.appendChild(appShell);

      // Initialize pages and add event listeners
      const homePage = document.createElement('home-page');
      homePage.addEventListener('navigate', this.handlePageNavigation);

      // Set up router
      routerService.initialize(this.routes, routerOutlet);

      // Set up navigation items based on routes
      const navItems = this.routes.map((route) => ({
        id: route.id,
        label: route.id === 'home' ? 'Home' : route.title.split('|')[0].trim(),
        path: route.path,
        active: route.default,
      }));

      // Update navigation
      (navigation as NavigationElement).items = navItems;
    } catch (error) {
      logger.error(
        'Error rendering app shell:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Show error fallback
      this.renderErrorFallback(error);
    }
  }

  /**
   * Render fallback content in case of error
   */
  private renderErrorFallback(error: unknown): void {
    try {
      // Clear shadow root first
      while (this._root.firstChild) {
        this._root.removeChild(this._root.firstChild);
      }

      // Re-add styles
      this.initStyles();

      // Add error message
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-container';
      errorContainer.innerHTML = `
        <style>
          .error-container {
            padding: ${THEME.spacing.lg};
            margin: ${THEME.spacing.lg};
            border: 1px solid #ff3e3e;
            border-radius: ${THEME.borderRadius.md};
            background-color: rgba(255, 62, 62, 0.1);
          }
          
          .error-title {
            color: #ff3e3e;
            margin-top: 0;
          }
          
          .error-message {
            margin-top: ${THEME.spacing.md};
            padding: ${THEME.spacing.md};
            background-color: rgba(0, 0, 0, 0.1);
            border-radius: ${THEME.borderRadius.sm};
            overflow: auto;
            font-family: monospace;
            white-space: pre-wrap;
          }
          
          .reload-button {
            display: inline-block;
            margin-top: ${THEME.spacing.lg};
            padding: ${THEME.spacing.sm} ${THEME.spacing.md};
            background-color: ${THEME.colors.primary};
            color: white;
            border: none;
            border-radius: ${THEME.borderRadius.sm};
            cursor: pointer;
          }
        </style>
        <h2 class="error-title">App Shell Error</h2>
        <p>There was an error initializing the application:</p>
        <div class="error-message">${error instanceof Error ? error.message : String(error)}</div>
        <button class="reload-button" onclick="window.location.reload()">Reload Application</button>
      `;

      this._root.appendChild(errorContainer);
    } catch (fallbackError) {
      // Last resort error handling
      logger.error(
        'Error showing fallback UI:',
        fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
      );
    }
  }
}

// Register the custom element
try {
  if (!customElements.get('app-shell')) {
    customElements.define('app-shell', AppShellElement);
  }
} catch (error) {
  logger.error(
    'Failed to register app-shell component:',
    error instanceof Error ? error : new Error(String(error))
  );
}
