/**
 * Simple router service for PWA navigation
 * Enables navigation between pages without page reloads
 */
import * as logger from '../utils/logger';

/**
 * Route definition interface
 */
export interface Route {
  id: string;
  path: string;
  component: string;
  title: string;
  default?: boolean;
}

export class RouterService {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private routerElement: HTMLElement | null = null;

  /**
   * Initialize the router with routes
   * @param routes - The routes to register
   * @param routerElement - The element that will contain routed pages
   */
  initialize(routes: Route[], routerElement: HTMLElement): void {
    try {
      this.routes = routes;
      this.routerElement = routerElement;

      // Set up event listeners
      window.addEventListener('popstate', this.handlePopState.bind(this));

      // Initial navigation based on current URL
      this.navigateToPath(window.location.pathname);

      logger.info('Router initialized with', routes.length, 'routes');
    } catch (error) {
      logger.error(
        'Failed to initialize router:',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Handle browser history navigation
   */
  private handlePopState(_event: PopStateEvent): void {
    try {
      const path = window.location.pathname;
      this.navigateToPath(path, false);
    } catch (error) {
      logger.error(
        'Error handling popstate event:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Navigate to a path
   * @param path - The path to navigate to
   * @param pushState - Whether to push state to browser history
   */
  navigateToPath(path: string, pushState: boolean = true): void {
    try {
      // Find matching route
      let route = this.routes.find((r) => r.path === path);

      // If no route found, use default or first route
      if (!route) {
        route = this.routes.find((r) => r.default) || this.routes[0];
        logger.warn(`No route found for path "${path}", using ${route?.id || 'fallback'} route`);
      }

      if (!route) {
        throw new Error(`No routes available for navigation`);
      }

      // Update browser history if needed
      if (pushState) {
        window.history.pushState({ routeId: route.id }, route.title, route.path);
      }

      // Update current route
      this.currentRoute = route;

      // Update document title
      document.title = route.title;

      // Render the route
      this.renderRoute(route);

      // Dispatch route change event
      window.dispatchEvent(
        new CustomEvent('route-changed', {
          detail: { route },
        })
      );

      logger.info(`Navigated to route: ${route.id}`);
    } catch (error) {
      logger.error(
        'Error navigating to path:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Navigate to a route by ID
   * @param routeId - The ID of the route to navigate to
   */
  navigateToRoute(routeId: string): void {
    try {
      const route = this.routes.find((r) => r.id === routeId);
      if (!route) {
        throw new Error(`Route with ID "${routeId}" not found`);
      }

      this.navigateToPath(route.path);
    } catch (error) {
      logger.error(
        'Error navigating to route:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get the current active route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }

  /**
   * Render the current route
   */
  private renderRoute(route: Route): void {
    try {
      if (!this.routerElement) {
        throw new Error('Router element not set');
      }

      // Check if component exists
      let pageElement = this.routerElement.querySelector(route.component);

      // Create component if it doesn't exist
      if (!pageElement) {
        pageElement = document.createElement(route.component);
        this.routerElement.appendChild(pageElement);
        logger.info(`Created new component for route: ${route.id}`);
      }

      // Deactivate all other pages
      const allPages = this.routerElement.querySelectorAll('[active]');
      allPages.forEach((page) => {
        if (page !== pageElement) {
          page.removeAttribute('active');
        }
      });

      // Activate the target page
      pageElement.setAttribute('active', '');
      pageElement.setAttribute('title', route.title);

      // Ensure the page is visible
      (pageElement as HTMLElement).style.display = 'block';

      // Scroll to top (safely handle mocks in test environments)
      try {
        window.scrollTo(0, 0);
      } catch {
        // Ignore scrollTo errors in test environments
        logger.debug('scrollTo not supported in test environment');
      }
    } catch (error) {
      logger.error(
        'Error rendering route:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Create and export singleton instance
export const routerService = new RouterService();
