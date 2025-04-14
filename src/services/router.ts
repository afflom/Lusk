/**
 * Enhanced router service for PWA navigation with deep linking support
 * Enables navigation between pages without page reloads
 * Supports hash-based section navigation and route parameters
 */
import * as logger from '../utils/logger';

/**
 * Route parameter interface
 */
export interface RouteParams {
  [key: string]: string;
}

/**
 * Route definition interface with enhanced capabilities
 */
export interface Route {
  id: string;
  path: string;
  component: string;
  title: string;
  default?: boolean;
  // New properties for enhanced navigation
  icon?: string;
  parentId?: string;
  children?: Route[];
  lazyLoad?: boolean;
  params?: RouteParams;
  meta?: Record<string, unknown>;
}

/**
 * Navigation state for persistence
 */
export interface NavigationState {
  currentRouteId: string;
  params: RouteParams;
  hash: string;
  timestamp: number;
}

/**
 * Route change event details
 */
export interface RouteChangeEvent {
  route: Route;
  params: RouteParams;
  hash: string;
  isPopState: boolean;
}

export class RouterService {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private routerElement: HTMLElement | null = null;
  private currentParams: RouteParams = {};
  private currentHash: string = '';
  private isInitialized = false;
  private routeGuards: Array<(to: Route, from: Route | null) => boolean | Promise<boolean>> = [];
  private errorHandler: ((error: Error) => void) | null = null;

  /**
   * Initialize the router with routes
   * @param routes - The routes to register
   * @param routerElement - The element that will contain routed pages
   */
  initialize(routes: Route[], routerElement: HTMLElement): void {
    try {
      if (this.isInitialized) {
        logger.warn('Router already initialized, ignoring re-initialization');
        return;
      }
      this.routes = this.normalizeRoutes(routes);
      this.routerElement = routerElement;
      this.isInitialized = true;

      // Set up event listeners
      window.addEventListener('popstate', this.handlePopState.bind(this));
      window.addEventListener('hashchange', this.handleHashChange.bind(this));

      // Handle clicks on links to use the router instead of browser navigation
      document.addEventListener('click', this.handleLinkClick.bind(this));

      // Restore navigation state from session storage if available
      this.restoreNavigationState();

      // Initial navigation based on current URL if state not restored
      if (!this.currentRoute) {
        void this.navigateToPath(window.location.pathname + window.location.search, false);
      }

      logger.info('Router initialized with', routes.length, 'routes');
    } catch (error) {
      logger.error(
        'Failed to initialize router:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
      throw error;
    }
  }

  /**
   * Normalize routes by processing parent-child relationships
   * @param routes - Raw routes to normalize
   * @returns Processed routes with all parent-child relationships resolved
   */
  private normalizeRoutes(routes: Route[]): Route[] {
    // Create a map for quick lookup
    const routeMap = new Map<string, Route>();

    // First pass: collect all routes in a map
    routes.forEach((route) => {
      routeMap.set(route.id, { ...route, children: route.children || [] });
    });

    // Second pass: set up children arrays
    routes.forEach((route) => {
      if (route.parentId && routeMap.has(route.parentId)) {
        const parent = routeMap.get(route.parentId);
        if (!parent) {
          return;
        }
        if (!parent.children) {
          parent.children = [];
        }
        // Only add if not already a child
        if (!parent.children.some((child) => child.id === route.id)) {
          const routeObj = routeMap.get(route.id);
          if (routeObj) {
            parent.children.push(routeObj);
          }
        }
      }
    });

    // Return only the top-level routes (those without parents)
    return routes.filter((route) => !route.parentId);
  }

  /**
   * Register a navigation guard that runs before route changes
   * @param guard - Function that returns true to allow navigation or false to prevent it
   * @returns Function to remove the guard
   */
  addRouteGuard(guard: (to: Route, from: Route | null) => boolean | Promise<boolean>): () => void {
    this.routeGuards.push(guard);

    // Return a function to remove this guard
    return () => {
      const index = this.routeGuards.indexOf(guard);
      if (index !== -1) {
        this.routeGuards.splice(index, 1);
      }
    };
  }

  /**
   * Set a global error handler for router errors
   * @param handler - Error handler function
   */
  setErrorHandler(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Handle router-level errors
   * @param error - Error to handle
   */
  private handleRouterError(error: unknown): void {
    const routerError = error instanceof Error ? error : new Error(String(error));

    if (this.errorHandler) {
      try {
        this.errorHandler(routerError);
      } catch (handlerError) {
        // If the error handler itself fails, log it
        logger.error(
          'Error in router error handler:',
          handlerError instanceof Error ? handlerError : new Error(String(handlerError))
        );
      }
    }
  }

  /**
   * Save current navigation state to session storage for persistence
   */
  private saveNavigationState(): void {
    try {
      if (!this.currentRoute) return;

      const state: NavigationState = {
        currentRouteId: this.currentRoute.id,
        params: this.currentParams,
        hash: this.currentHash,
        timestamp: Date.now(),
      };

      sessionStorage.setItem('router_state', JSON.stringify(state));
      logger.debug('Saved navigation state:', state);
    } catch (error) {
      logger.warn('Failed to save navigation state:', error);
    }
  }

  /**
   * Restore navigation state from session storage
   * @returns True if state was restored, false otherwise
   */
  private restoreNavigationState(): boolean {
    try {
      const savedState = sessionStorage.getItem('router_state');
      if (!savedState) return false;

      const state = JSON.parse(savedState) as NavigationState;
      const route = this.findRouteById(state.currentRouteId);

      if (!route) return false;

      this.currentRoute = route;
      this.currentParams = state.params || {};
      this.currentHash = state.hash || '';

      // Update the URL to match the restored state
      this.updateBrowserUrl(route, this.currentParams, this.currentHash, false);

      // Render the restored route
      this.renderRoute(route, this.currentParams);

      logger.info('Restored navigation state for route:', route.id);
      return true;
    } catch (error) {
      logger.warn('Failed to restore navigation state:', error);
      return false;
    }
  }

  /**
   * Handle browser history navigation (back/forward)
   */
  private handlePopState(event: PopStateEvent): void {
    try {
      // Get the full URL including query string and hash
      const path = window.location.pathname + window.location.search;
      const hash = window.location.hash.slice(1); // Remove the # character

      // Use the state from history if available
      const params = event.state?.params || ({} as RouteParams);

      void this.navigateToPath(path, false, params, hash);
    } catch (error) {
      logger.error(
        'Error handling popstate event:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
    }
  }

  /**
   * Handle hash changes for in-page navigation
   */
  private handleHashChange(event: HashChangeEvent): void {
    try {
      // Only handle if it's just the hash that changed
      const oldUrl = new URL(event.oldURL);
      const newUrl = new URL(event.newURL);

      if (oldUrl.pathname === newUrl.pathname && oldUrl.search === newUrl.search) {
        const hash = newUrl.hash.slice(1); // Remove the # character
        this.scrollToHash(hash);

        // Update current hash
        this.currentHash = hash;
        this.saveNavigationState();

        // Don't do a full navigation since only the hash changed
        logger.debug('Hash changed to:', hash);
      }
    } catch (error) {
      logger.error(
        'Error handling hashchange event:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle clicks on links to use the router
   */
  private handleLinkClick(event: MouseEvent): void {
    try {
      // Only handle left clicks without modifier keys
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      // Find closest anchor element
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor) return;

      // Get href attribute
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external links, anchors that open in new tabs, or non-HTTP(S) protocols
      if (
        anchor.getAttribute('target') === '_blank' ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }

      // Only handle same-origin navigation
      if (anchor.origin && anchor.origin !== window.location.origin) {
        return;
      }

      // Parse the URL
      let url: URL;
      try {
        // For absolute URLs
        url = new URL(href, window.location.origin);
      } catch {
        // For relative URLs
        url = new URL(href, window.location.href);
      }

      // If path is different, handle it with the router
      const path = url.pathname + url.search;
      const hash = url.hash.slice(1); // Remove the # character

      // If only the hash changed on the same page
      if (
        path === window.location.pathname + window.location.search &&
        hash !== window.location.hash.slice(1)
      ) {
        // Just update the hash and let the hashchange event handle it
        window.location.hash = hash ? `#${hash}` : '';
        event.preventDefault();
        return;
      }

      // Handle as a regular navigation
      void this.navigateToPath(path, true, {}, hash);
      event.preventDefault();
    } catch (error) {
      logger.error(
        'Error handling link click:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Scroll to an element with the specified ID (hash)
   */
  private scrollToHash(hash: string): void {
    if (!hash) return;

    // Wait for components to render
    setTimeout(() => {
      try {
        // Try finding the element by ID
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        // Try finding a named anchor
        const anchors = document.getElementsByName(hash);
        if (anchors.length > 0) {
          anchors[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        // Try finding an element with data-section-id
        const sections = document.querySelectorAll(`[data-section-id="${hash}"]`);
        if (sections.length > 0) {
          sections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        logger.debug(`No element found for hash: #${hash}`);
      } catch (error) {
        logger.error(
          'Error scrolling to hash:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, 100);
  }

  /**
   * Extract route parameters from URL pattern matching
   * @param routePath - Route path pattern with parameter placeholders
   * @param actualPath - Actual URL path to match against
   * @returns Extracted parameters or null if no match
   */
  private extractRouteParams(routePath: string, actualPath: string): RouteParams | null {
    // Convert route path pattern to regex
    // e.g., '/users/:id' becomes /^\/users\/([^\/]+)$/
    const paramNames: string[] = [];
    let pattern = routePath;

    // Replace :param placeholders with regex capture groups
    pattern = pattern.replace(/:[a-zA-Z0-9_]+/g, (match) => {
      const paramName = match.slice(1); // Remove the : prefix
      paramNames.push(paramName);
      return '([^/]+)';
    });

    // Create regex and match against actual path
    const regex = new RegExp(`^${pattern}$`);
    const match = actualPath.match(regex);

    if (!match) return null;

    // Extract parameter values from match groups
    const params: RouteParams = {};
    paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });

    return params;
  }

  /**
   * Extract query parameters from URL search string
   * @param search - URL search string (e.g., "?key=value&foo=bar")
   * @returns Extracted query parameters
   */
  private extractQueryParams(search: string): RouteParams {
    const params: RouteParams = {};

    if (!search || search === '?') return params;

    // Remove leading ? and parse
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  }

  /**
   * Find a route that matches the given path
   * @param path - URL path to match
   * @returns Matching route and extracted parameters, or null if no match
   */
  private findRouteByPath(path: string): { route: Route; params: RouteParams } | null {
    // Split path and search
    const [pathPart, searchPart] = path.split('?');
    const search = searchPart ? `?${searchPart}` : '';

    // Try exact path match first
    const route = this.routes.find((r) => r.path === pathPart);
    if (route) {
      return {
        route,
        params: this.extractQueryParams(search),
      };
    }

    // Try parameter-based route matching
    for (const r of this.routes) {
      const params = this.extractRouteParams(r.path, pathPart);
      if (params) {
        return {
          route: r,
          params: { ...params, ...this.extractQueryParams(search) },
        };
      }
    }

    // Try child routes (flatten the hierarchy for matching)
    const allRoutes = this.getAllRoutesFlattened();

    for (const r of allRoutes) {
      const params = this.extractRouteParams(r.path, pathPart);
      if (params) {
        return {
          route: r,
          params: { ...params, ...this.extractQueryParams(search) },
        };
      }
    }

    return null;
  }

  /**
   * Flattens the route hierarchy into a single array
   * @returns All routes (including children) in a flat array
   */
  private getAllRoutesFlattened(): Route[] {
    const flatten = (routes: Route[], result: Route[] = []): Route[] => {
      routes.forEach((route) => {
        result.push(route);
        if (route.children && route.children.length > 0) {
          flatten(route.children, result);
        }
      });
      return result;
    };

    return flatten(this.routes);
  }

  /**
   * Find a route by its ID
   * @param id - Route ID to find
   * @returns Matching route or undefined if not found
   */
  private findRouteById(id: string): Route | undefined {
    // Search in main routes
    const route = this.routes.find((r) => r.id === id);
    if (route) return route;

    // Search in child routes
    return this.getAllRoutesFlattened().find((r) => r.id === id);
  }

  /**
   * Update browser URL to reflect current route
   * @param route - Current route
   * @param params - Route parameters
   * @param hash - URL hash (for section navigation)
   * @param pushState - Whether to push a new history entry
   */
  private updateBrowserUrl(
    route: Route,
    params: RouteParams,
    hash: string,
    pushState: boolean
  ): void {
    // Start with the route path
    let url = route.path;

    // Replace any :param placeholders in the path
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });

    // Add query params (for any params not used in the path)
    const queryParams = new URLSearchParams();
    let hasQueryParams = false;

    Object.entries(params).forEach(([key, value]) => {
      // Only add as query param if not used in path
      if (!route.path.includes(`:${key}`)) {
        queryParams.append(key, value);
        hasQueryParams = true;
      }
    });

    // Append query string if there are query params
    if (hasQueryParams) {
      url += `?${queryParams.toString()}`;
    }

    // Add hash if present
    if (hash) {
      url += `#${hash}`;
    }

    // Update browser history
    if (pushState) {
      window.history.pushState(
        {
          routeId: route.id,
          params,
        },
        route.title,
        url
      );
    } else {
      window.history.replaceState(
        {
          routeId: route.id,
          params,
        },
        route.title,
        url
      );
    }
  }

  /**
   * Run route guards to check if navigation should proceed
   * @param toRoute - Target route
   * @returns True if navigation is allowed, false otherwise
   */
  private async runRouteGuards(toRoute: Route): Promise<boolean> {
    try {
      // Run each guard sequentially
      for (const guard of this.routeGuards) {
        const result = guard(toRoute, this.currentRoute);

        // Handle both synchronous and asynchronous guards
        let allowed: boolean;

        if (result instanceof Promise) {
          allowed = await result;
        } else {
          allowed = result;
        }

        if (!allowed) {
          logger.info(`Navigation to ${toRoute.id} prevented by guard`);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(
        'Error in route guard:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
      return false;
    }
  }

  /**
   * Navigate to a path
   * @param path - The path to navigate to
   * @param pushState - Whether to push state to browser history
   * @param params - Additional route parameters to merge with extracted ones
   * @param hash - Hash for section navigation
   */
  async navigateToPath(
    path: string,
    pushState = true,
    params: RouteParams = {},
    hash = ''
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        logger.warn('Router not initialized yet, ignoring navigation');
        return false;
      }

      // Handle GitHub Pages subdirectory paths
      let normalizedPath = path;

      // Check if this is a GitHub Pages subdirectory path (e.g., /Lusk/)
      if (path.includes('/Lusk/')) {
        // Remove the subdirectory part for route matching
        normalizedPath = path.replace(/\/Lusk\//g, '/');
        logger.info(`Normalized GitHub Pages path from "${path}" to "${normalizedPath}"`);
      }

      // Find matching route using normalized path
      const match = this.findRouteByPath(normalizedPath);
      let route: Route;
      let routeParams: RouteParams = { ...params };

      if (match) {
        route = match.route;
        routeParams = { ...match.params, ...params };
      } else {
        // If no route found, use default or first route
        route = this.routes.find((r) => r.default) || this.routes[0];
        logger.warn(
          `No route found for path "${normalizedPath}", using ${route?.id || 'fallback'} route`
        );

        if (!route) {
          throw new Error(`No routes available for navigation`);
        }
      }

      // Run route guards
      const guardResult = await this.runRouteGuards(route);
      if (!guardResult) {
        return false;
      }

      // Update browser URL
      this.updateBrowserUrl(route, routeParams, hash, pushState);

      // Update current route state
      this.currentRoute = route;
      this.currentParams = routeParams;
      this.currentHash = hash;

      // Save navigation state
      this.saveNavigationState();

      // Update document title
      document.title = route.title;

      // Render the route
      this.renderRoute(route, routeParams);

      // Dispatch route change event
      window.dispatchEvent(
        new CustomEvent<RouteChangeEvent>('route-changed', {
          detail: {
            route,
            params: routeParams,
            hash,
            isPopState: !pushState,
          },
        })
      );

      // Handle hash navigation
      if (hash) {
        this.scrollToHash(hash);
      }

      logger.info(`Navigated to route: ${route.id}${hash ? ` with hash: #${hash}` : ''}`);
      return true;
    } catch (error) {
      logger.error(
        'Error navigating to path:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
      return false;
    }
  }

  /**
   * Navigate to a route by ID
   * @param routeId - The ID of the route to navigate to
   * @param params - Route parameters
   * @param hash - Hash for section navigation
   */
  async navigateToRoute(routeId: string, params: RouteParams = {}, hash = ''): Promise<boolean> {
    try {
      const route = this.findRouteById(routeId);
      if (!route) {
        throw new Error(`Route with ID "${routeId}" not found`);
      }

      return await this.navigateToPath(route.path, true, params, hash);
    } catch (error) {
      logger.error(
        'Error navigating to route:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
      return false;
    }
  }

  /**
   * Get the current active route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Get current route parameters
   */
  getCurrentParams(): RouteParams {
    return { ...this.currentParams };
  }

  /**
   * Get current hash
   */
  getCurrentHash(): string {
    return this.currentHash;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }

  /**
   * Get route breadcrumbs for the current route
   * Returns an array of routes from root to current
   */
  getBreadcrumbs(): Route[] {
    if (!this.currentRoute) return [];

    const breadcrumbs: Route[] = [];
    let current: Route | undefined = this.currentRoute;

    // Add current route
    breadcrumbs.unshift(current);

    // Add parent routes
    while (current?.parentId) {
      const parent = this.findRouteById(current.parentId);
      if (!parent) break;

      breadcrumbs.unshift(parent);
      current = parent;
    }

    return breadcrumbs;
  }

  /**
   * Clear the navigation history and remove saved state
   */
  clearNavigationHistory(): void {
    sessionStorage.removeItem('router_state');
    logger.debug('Cleared navigation history');
  }

  /**
   * Render the current route
   * @param route - Route to render
   * @param params - Route parameters
   */
  private renderRoute(route: Route, params: RouteParams = {}): void {
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

      // Set route parameters as attributes
      Object.entries(params).forEach(([key, value]) => {
        pageElement?.setAttribute(`data-param-${key}`, value);
      });

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

      // Pass route data to the component if it supports it
      if (
        'setRouteData' in pageElement &&
        typeof (pageElement as any).setRouteData === 'function'
      ) {
        try {
          (pageElement as any).setRouteData(route, params);
        } catch (error) {
          logger.error(
            'Error calling setRouteData on component:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }

      // Ensure the page is visible
      (pageElement as HTMLElement).style.display = 'block';

      // Scroll to top (safely handle mocks in test environments)
      if (!this.currentHash) {
        try {
          window.scrollTo(0, 0);
        } catch {
          // Ignore scrollTo errors in test environments
          logger.debug('scrollTo not supported in test environment');
        }
      }
    } catch (error) {
      logger.error(
        'Error rendering route:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleRouterError(error);
    }
  }
}

// Create and export singleton instance
export const routerService = new RouterService();
