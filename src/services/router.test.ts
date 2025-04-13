/**
 * Tests for the router service
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { RouterService, Route, routerService } from './router';
import * as logger from '../utils/logger';

// Mock the logger module
vi.mock('../utils/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

// Mock window.scrollTo to prevent JSDOM errors
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

describe('RouterService', () => {
  let router: RouterService;
  let routerElement: HTMLElement;
  let mockRoutes: Route[];

  // Create global spies for all tests
  vi.spyOn(window, 'addEventListener');
  vi.spyOn(window.history, 'pushState');
  // These global spies are not used in the tests, but kept for reference
  // Each test creates its own local spies when needed

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a new instance for each test
    router = new RouterService();

    // Set up a router element
    routerElement = document.createElement('div');
    document.body.appendChild(routerElement);

    // Define test routes
    mockRoutes = [
      {
        id: 'home',
        path: '/',
        component: 'home-page',
        title: 'Home',
        default: true,
      },
      {
        id: 'about',
        path: '/about',
        component: 'about-page',
        title: 'About',
      },
      {
        id: 'contact',
        path: '/contact',
        component: 'contact-page',
        title: 'Contact',
      },
    ];
  });

  afterEach(() => {
    // Clean up
    if (document.body.contains(routerElement)) {
      document.body.removeChild(routerElement);
    }
  });

  describe('initialize', () => {
    it('should initialize with routes and register popstate event', () => {
      router.initialize(mockRoutes, routerElement);

      // Verify routes are set
      expect(router.getRoutes()).toEqual(mockRoutes);

      // Create a local spy to verify popstate listener was registered
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      router.initialize(mockRoutes, routerElement);

      // Verify popstate listener was registered
      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      // Verify initial navigation was triggered
      expect(document.title).toBe('Home'); // Default route title
    });

    it('should handle initialization errors', () => {
      // Mock log error to capture it
      vi.spyOn(logger, 'error').mockImplementation(() => {});

      // Force an error in initialize
      vi.spyOn(window, 'addEventListener').mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should throw and log error
      expect(() => router.initialize(mockRoutes, routerElement)).toThrow('Test error');
      expect(logger.error).toHaveBeenCalled();

      // Restore original implementation
      vi.restoreAllMocks();
    });

    it('should handle initialization with empty routes array', () => {
      // Create a new window.addEventListener spy for this test
      const localAddEventListener = vi.spyOn(window, 'addEventListener');

      // Create a fresh router instance
      const localRouter = new RouterService();

      // Prepare empty element for router output to avoid errors
      const emptyRoutes: Route[] = [];

      // Initialize with empty routes
      localRouter.initialize(emptyRoutes, routerElement);

      // Verify routes are set to empty array
      expect(localRouter.getRoutes()).toEqual([]);

      // Verify event listener was registered
      expect(localAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));

      // Clean up
      localAddEventListener.mockRestore();
    });
  });

  describe('navigateToPath', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();
      // Initialize a clean router instance for each test
      router = new RouterService();
      // Initialize with routes but handle window.scrollTo
      router.initialize(mockRoutes, routerElement);
    });

    it('should navigate to an existing path', () => {
      // Create a fresh spy for this test
      const localPushState = vi.spyOn(window.history, 'pushState');
      const localDispatchEvent = vi.spyOn(window, 'dispatchEvent');

      // Navigate to about page
      router.navigateToPath('/about');

      // Verify browser history updated
      expect(localPushState).toHaveBeenCalledWith({ routeId: 'about' }, 'About', '/about');

      // Verify document title updated
      expect(document.title).toBe('About');

      // Verify event dispatched
      expect(localDispatchEvent).toHaveBeenCalled();

      // Verify current route updated
      expect(router.getCurrentRoute()?.id).toBe('about');

      // Clean up
      localPushState.mockRestore();
      localDispatchEvent.mockRestore();
    });

    it('should use default route when path not found', () => {
      router.navigateToPath('/nonexistent');

      // Should use default route
      expect(router.getCurrentRoute()?.id).toBe('home');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should use first route when no default route is defined', () => {
      // Create routes without default flag
      const routesWithoutDefault: Route[] = [
        {
          id: 'page1',
          path: '/page1',
          component: 'page-one',
          title: 'Page One',
        },
        {
          id: 'page2',
          path: '/page2',
          component: 'page-two',
          title: 'Page Two',
        },
      ];

      // Initialize with new routes
      router = new RouterService();
      router.initialize(routesWithoutDefault, routerElement);

      // Navigate to nonexistent path
      router.navigateToPath('/nonexistent');

      // Should use first route
      expect(router.getCurrentRoute()?.id).toBe('page1');
    });

    it('should not push state when pushState is false', () => {
      // Create a local spy for this test
      const pushStateSpy = vi.spyOn(window.history, 'pushState');

      // Reset the history spy to ensure we start with a clean state
      pushStateSpy.mockReset();

      // First initialize router again to ensure we don't have residual calls
      router = new RouterService();
      router.initialize(mockRoutes, routerElement);
      pushStateSpy.mockReset();

      // Now navigate with pushState set to false
      router.navigateToPath('/about', false);

      // Verify browser history not updated
      expect(pushStateSpy).not.toHaveBeenCalled();

      // But route should still change
      expect(router.getCurrentRoute()?.id).toBe('about');
    });

    it('should handle errors when navigating', () => {
      // Use a different approach to simulate an error
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      // Use a direct mock instead of manipulating the document.title property
      vi.spyOn(window.history, 'pushState').mockImplementation(() => {
        throw new Error('Navigation error');
      });

      // Navigate should catch the error
      router.navigateToPath('/about');

      // Error should be logged
      expect(logger.error).toHaveBeenCalled();

      // Restore original implementation
      vi.restoreAllMocks();
    });

    it('should throw error when no routes are available', () => {
      // Initialize with empty routes
      router = new RouterService();
      router.initialize([], routerElement);

      // Navigate should log error
      router.navigateToPath('/any-path');

      // Error should be logged
      expect(logger.error).toHaveBeenCalled();
      const errorLog = vi.mocked(logger.error).mock.calls[0];
      expect(errorLog[0]).toContain('Error navigating to path');
    });
  });

  describe('navigateToRoute', () => {
    beforeEach(() => {
      router.initialize(mockRoutes, routerElement);
    });

    it('should navigate to route by ID', () => {
      router.navigateToRoute('contact');

      // Verify current route
      expect(router.getCurrentRoute()?.id).toBe('contact');
      expect(router.getCurrentRoute()?.path).toBe('/contact');
    });

    it('should handle nonexistent route ID', () => {
      // First navigate to a known route
      router.navigateToRoute('contact');

      // Then try a nonexistent route
      router.navigateToRoute('nonexistent');

      // Should log error
      expect(logger.error).toHaveBeenCalled();

      // Current route should remain unchanged (contact)
      expect(router.getCurrentRoute()?.id).toBe('contact');
    });
  });

  describe('handlePopState', () => {
    beforeEach(() => {
      router.initialize(mockRoutes, routerElement);
    });

    it('should handle popstate events', () => {
      // Setup a manual navigation first
      router.navigateToPath('/about');

      // Mock the location pathname
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/contact',
        },
        writable: true,
      });

      // Trigger the popstate handler manually
      const popstateEvent = new PopStateEvent('popstate');
      window.dispatchEvent(popstateEvent);

      // Should navigate to the contact page
      expect(router.getCurrentRoute()?.id).toBe('contact');
    });

    it('should handle errors during popstate', () => {
      // Mock location to throw when accessed
      Object.defineProperty(window, 'location', {
        get: () => {
          throw new Error('Location error');
        },
      });

      // Trigger popstate
      const popstateEvent = new PopStateEvent('popstate');
      window.dispatchEvent(popstateEvent);

      // Should log error
      expect(logger.error).toHaveBeenCalled();

      // Reset location
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });
    });
  });

  describe('renderRoute', () => {
    beforeEach(() => {
      // Clean up router element before each test
      while (routerElement.firstChild) {
        routerElement.removeChild(routerElement.firstChild);
      }
      router.initialize(mockRoutes, routerElement);
    });

    it('should render the route component if it does not exist', () => {
      // Before testing, we need to make sure the home page component exists
      // Manually create it to ensure the test is consistent
      const homePage = document.createElement('home-page');
      routerElement.appendChild(homePage);
      homePage.setAttribute('active', '');

      // Verify it exists
      expect(routerElement.querySelector('home-page')).not.toBeNull();

      // Navigate to a route that hasn't been rendered yet
      router.navigateToPath('/contact');

      // Component should be created
      const component = routerElement.querySelector('contact-page');
      expect(component).not.toBeNull();
      expect(component?.getAttribute('active')).toBe('');
      expect(component?.getAttribute('title')).toBe('Contact');
    });

    it('should reuse existing component if it exists', () => {
      // First navigation to create component
      router.navigateToPath('/about');

      // Get the created component
      const firstComponent = routerElement.querySelector('about-page');

      // Navigate away
      router.navigateToPath('/');

      // Navigate back
      router.navigateToPath('/about');

      // Get the component again
      const secondComponent = routerElement.querySelector('about-page');

      // Should be the same instance
      expect(firstComponent).toBe(secondComponent);
    });

    it('should deactivate other components when activating a new one', () => {
      // Manually create all page components
      const home = document.createElement('home-page');
      const about = document.createElement('about-page');
      const contact = document.createElement('contact-page');

      // Add to router element
      routerElement.appendChild(home);
      routerElement.appendChild(about);
      routerElement.appendChild(contact);

      // Set all as active initially
      home.setAttribute('active', '');
      about.setAttribute('active', '');
      contact.setAttribute('active', '');

      // All components should exist
      expect(home).not.toBeNull();
      expect(about).not.toBeNull();
      expect(contact).not.toBeNull();

      // Navigate to contact page
      router.navigateToPath('/contact');

      // But only contact should be active
      expect(home?.getAttribute('active')).toBeNull();
      expect(about?.getAttribute('active')).toBeNull();
      expect(contact?.getAttribute('active')).toBe('');
    });

    it('should handle scrollTo errors in test environment', () => {
      // Reset mock and spy on logger
      vi.spyOn(logger, 'debug').mockImplementation(() => {});

      // Create a mock that throws
      const scrollToMock = vi.fn(() => {
        throw new Error('scrollTo error');
      });

      // Apply the mock
      Object.defineProperty(window, 'scrollTo', {
        value: scrollToMock,
        writable: true,
        configurable: true,
      });

      // Should not throw
      router.navigateToPath('/about');

      // Debug message should be logged
      expect(logger.debug).toHaveBeenCalled();

      // Reset scrollTo
      vi.restoreAllMocks();
      Object.defineProperty(window, 'scrollTo', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
    });

    it('should handle errors when router element is not set', () => {
      // Create a new router without initializing
      const uninitializedRouter = new RouterService();

      // Call private renderRoute method via navigateToPath
      // This should catch the error about routerElement being null
      uninitializedRouter.navigateToPath('/');

      // Error should be logged
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      // Verify singleton is an instance of RouterService
      expect(routerService).toBeInstanceOf(RouterService);
    });
  });
});
