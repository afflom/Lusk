import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { swConfig } from '../utils/config';

// Mock HTTP response
class MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  body: any;
  bodyUsed: boolean;

  constructor(init: ResponseInit & { url?: string } = {}) {
    this.ok = init.status ? init.status >= 200 && init.status < 300 : true;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers || {});
    this.url = init.url || 'https://example.com/test';
    this.body = null;
    this.bodyUsed = false;
  }

  clone(): MockResponse {
    const cloned = new MockResponse({
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      url: this.url,
    });
    return cloned;
  }

  json(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  text(): Promise<string> {
    return Promise.resolve('');
  }
}

// Create mock cache
class MockCache {
  private items: Map<string, Response> = new Map();

  match(request: Request | string): Promise<Response | null> {
    const url = typeof request === 'string' ? request : request.url;
    return Promise.resolve(this.items.get(url) || null);
  }

  put(request: Request | string, response: Response): Promise<void> {
    const url = typeof request === 'string' ? request : request.url;
    this.items.set(url, response);
    return Promise.resolve();
  }

  delete(request: Request | string): Promise<boolean> {
    const url = typeof request === 'string' ? request : request.url;
    return Promise.resolve(this.items.delete(url));
  }

  keys(): Promise<Request[]> {
    return Promise.resolve(Array.from(this.items.keys()).map((url) => new Request(url)));
  }

  addAll(requests: RequestInfo[]): Promise<void[]> {
    return Promise.all(
      requests.map((request) => {
        const url = typeof request === 'string' ? request : request.url;
        return this.put(url, new MockResponse({ url }));
      })
    );
  }
}

// Mock for caches API
const mockCaches = {
  _caches: {} as Record<string, MockCache>,
  open(name: string) {
    if (!this._caches[name]) {
      this._caches[name] = new MockCache();
    }
    return Promise.resolve(this._caches[name]);
  },
  match(request: Request | string) {
    const url = typeof request === 'string' ? request : request.url;

    // Try to find the request in any cache
    return Promise.all(Object.values(this._caches).map((cache) => cache.match(url))).then(
      (matches) => {
        // Return the first match
        return matches.find((match) => match !== null) || null;
      }
    );
  },
  has(name: string) {
    return Promise.resolve(name in this._caches);
  },
  keys() {
    return Promise.resolve(Object.keys(this._caches));
  },
  delete(name: string) {
    const had = name in this._caches;
    delete this._caches[name];
    return Promise.resolve(had);
  },
};

// Mock fetch function
const mockFetch = vi.fn().mockImplementation((url: string) => {
  return Promise.resolve(new MockResponse({ url }));
});

describe('Service Worker Caching Strategies', () => {
  // Service worker "self" mock
  const selfMock = {
    caches: mockCaches,
    fetch: mockFetch,
    addEventListener: vi.fn(),
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue([]),
    },
    registration: {
      showNotification: vi.fn().mockResolvedValue(undefined),
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
      },
    },
  };

  // Cache names from config
  const CACHE_NAMES = swConfig.cacheNames;

  // Offline fallbacks
  const OFFLINE_FALLBACKS = swConfig.offlineFallbacks;

  // Cache settings
  const MAX_CACHE_AGE = swConfig.maxCacheAge;
  const CACHE_LIMIT_BYTES = swConfig.cacheLimitBytes;
  const SYNC_QUEUE_NAME = swConfig.syncQueueName;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset caches for each test
    Object.keys(mockCaches._caches).forEach((key) => {
      delete mockCaches._caches[key];
    });

    // Reset fetch mock
    mockFetch.mockClear();
  });

  /**
   * Test cache name determination function
   */
  describe('getCacheNameForRequest', () => {
    // Implementation of the service worker function
    function getCacheNameForRequest(url: URL): string {
      // Static assets - JavaScript, CSS, Fonts
      if (url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
        return CACHE_NAMES.static;
      }

      // Images
      if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
        return CACHE_NAMES.images;
      }

      // HTML documents
      if (
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.htm') ||
        !url.pathname.includes('.')
      ) {
        return CACHE_NAMES.documents;
      }

      // Fonts
      if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
        return CACHE_NAMES.fonts;
      }

      // Dynamic content - fallback
      return CACHE_NAMES.dynamic;
    }

    it('should correctly categorize static assets', () => {
      expect(getCacheNameForRequest(new URL('https://example.com/script.js'))).toBe(
        CACHE_NAMES.static
      );
      expect(getCacheNameForRequest(new URL('https://example.com/styles.css'))).toBe(
        CACHE_NAMES.static
      );
      expect(getCacheNameForRequest(new URL('https://example.com/fonts/roboto.woff2'))).toBe(
        CACHE_NAMES.static
      );
    });

    it('should correctly categorize images', () => {
      expect(getCacheNameForRequest(new URL('https://example.com/image.jpg'))).toBe(
        CACHE_NAMES.images
      );
      expect(getCacheNameForRequest(new URL('https://example.com/image.png'))).toBe(
        CACHE_NAMES.images
      );
      expect(getCacheNameForRequest(new URL('https://example.com/image.svg'))).toBe(
        CACHE_NAMES.images
      );
      expect(getCacheNameForRequest(new URL('https://example.com/image.webp'))).toBe(
        CACHE_NAMES.images
      );
    });

    it('should correctly categorize HTML documents', () => {
      expect(getCacheNameForRequest(new URL('https://example.com/'))).toBe(CACHE_NAMES.documents);
      expect(getCacheNameForRequest(new URL('https://example.com/index.html'))).toBe(
        CACHE_NAMES.documents
      );
      expect(getCacheNameForRequest(new URL('https://example.com/about'))).toBe(
        CACHE_NAMES.documents
      );
    });

    it('should use dynamic cache for uncategorized requests', () => {
      expect(getCacheNameForRequest(new URL('https://example.com/api/data.json'))).toBe(
        CACHE_NAMES.dynamic
      );
      expect(getCacheNameForRequest(new URL('https://example.com/unknown.xyz'))).toBe(
        CACHE_NAMES.dynamic
      );
    });
  });

  /**
   * Test cacheFirst strategy
   */
  describe('cacheFirst', () => {
    // Implementation of the service worker function
    async function cacheFirst(request: Request): Promise<Response> {
      const url = new URL(request.url);
      // Use locally defined function instead of referring to the outer one
      const cacheName = (function (url: URL): string {
        // Static assets - JavaScript, CSS, Fonts
        if (url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.static;
        }

        // Images
        if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
          return CACHE_NAMES.images;
        }

        // HTML documents
        if (
          url.pathname.endsWith('/') ||
          url.pathname.endsWith('.html') ||
          url.pathname.endsWith('.htm') ||
          !url.pathname.includes('.')
        ) {
          return CACHE_NAMES.documents;
        }

        // Fonts
        if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.fonts;
        }

        // Dynamic content - fallback
        return CACHE_NAMES.dynamic;
      })(url);

      // Try to get from cache first
      const cacheResponse = await selfMock.caches.match(request);
      if (cacheResponse) {
        return cacheResponse;
      }

      // If not in cache, fetch from network
      try {
        const networkResponse = await selfMock.fetch(request);

        // Cache the response for future use
        const cache = await selfMock.caches.open(cacheName);
        await cache.put(request, networkResponse.clone());

        return networkResponse;
      } catch {
        // If both cache and network fail, return offline fallback
        return getOfflineFallback(request);
      }
    }

    // Implementation of service worker function for offline fallback
    async function getOfflineFallback(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // For image requests, return the offline image
      if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.image);
      }

      // For document requests, return the offline page
      if (
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.htm') ||
        !url.pathname.includes('.')
      ) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.document);
      }

      // Default to a simple response for other requests
      return new MockResponse({
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Helper function to convert URL to Request
    function urlToRequest(url: string): Request {
      return new Request(url);
    }

    it('should return cached response when available', async () => {
      // Set up a cached response
      const request = urlToRequest('https://example.com/script.js');
      const cachedResponse = new MockResponse({ url: request.url });
      const cache = await selfMock.caches.open(CACHE_NAMES.static);
      await cache.put(request, cachedResponse);

      // Execute the cacheFirst strategy
      const response = await cacheFirst(request);

      // Should return cached response and not call fetch
      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from network when not in cache and cache the response', async () => {
      // Set up a network response
      const request = urlToRequest('https://example.com/script.js');
      const networkResponse = new MockResponse({ url: request.url });
      mockFetch.mockResolvedValueOnce(networkResponse);

      // Execute the cacheFirst strategy
      const response = await cacheFirst(request);

      // Should fetch from network
      expect(mockFetch).toHaveBeenCalledWith(request);
      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);

      // Should have cached the response
      const cache = await selfMock.caches.open(CACHE_NAMES.static);
      const cachedResponse = await cache.match(request);
      expect(cachedResponse).toBeDefined();
    });

    it('should return offline fallback when both cache and network fail', async () => {
      // Set up a failed network request
      const request = urlToRequest('https://example.com/script.js');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // First, cache the offline fallbacks
      const offlineCache = await selfMock.caches.open(CACHE_NAMES.offline);
      await offlineCache.put(
        OFFLINE_FALLBACKS.document,
        new MockResponse({ url: OFFLINE_FALLBACKS.document })
      );
      await offlineCache.put(
        OFFLINE_FALLBACKS.image,
        new MockResponse({ url: OFFLINE_FALLBACKS.image })
      );

      // Execute the cacheFirst strategy
      const response = await cacheFirst(request);

      // Should return a response
      expect(response).toBeDefined();
      expect(response.status).toBe(503);
    });
  });

  /**
   * Test networkFirst strategy
   */
  describe('networkFirst', () => {
    // Implementation of the service worker function
    async function networkFirst(request: Request): Promise<Response> {
      const url = new URL(request.url);
      // Use locally defined function instead of referring to the outer one
      const cacheName = (function (url: URL): string {
        // Static assets - JavaScript, CSS, Fonts
        if (url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.static;
        }

        // Images
        if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
          return CACHE_NAMES.images;
        }

        // HTML documents
        if (
          url.pathname.endsWith('/') ||
          url.pathname.endsWith('.html') ||
          url.pathname.endsWith('.htm') ||
          !url.pathname.includes('.')
        ) {
          return CACHE_NAMES.documents;
        }

        // Fonts
        if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.fonts;
        }

        // Dynamic content - fallback
        return CACHE_NAMES.dynamic;
      })(url);

      try {
        // Try to fetch from network first
        const networkResponse = await selfMock.fetch(request);

        // Cache the response for offline use
        const cache = await selfMock.caches.open(cacheName);
        await cache.put(request, networkResponse.clone());

        return networkResponse;
      } catch {
        // If network fails, try to get from cache
        const cacheResponse = await selfMock.caches.match(request);
        if (cacheResponse) {
          return cacheResponse;
        }

        // If both network and cache fail, return offline fallback
        return getOfflineFallback(request);
      }
    }

    // Implementation of service worker function for offline fallback
    async function getOfflineFallback(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // For image requests, return the offline image
      if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.image);
      }

      // For document requests, return the offline page
      if (
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.htm') ||
        !url.pathname.includes('.')
      ) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.document);
      }

      // Default to a simple response for other requests
      return new MockResponse({
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Helper function to convert URL to Request
    function urlToRequest(url: string): Request {
      return new Request(url);
    }

    it('should fetch from network when available and cache the response', async () => {
      // Set up a network response
      const request = urlToRequest('https://example.com/index.html');
      const networkResponse = new MockResponse({ url: request.url });
      mockFetch.mockResolvedValueOnce(networkResponse);

      // Execute the networkFirst strategy
      const response = await networkFirst(request);

      // Should fetch from network
      expect(mockFetch).toHaveBeenCalledWith(request);
      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);

      // Should have cached the response
      const cache = await selfMock.caches.open(CACHE_NAMES.documents);
      const cachedResponse = await cache.match(request);
      expect(cachedResponse).toBeDefined();
    });

    it('should return cached response when network fails', async () => {
      // Set up a cached response
      const request = urlToRequest('https://example.com/index.html');
      const cachedResponse = new MockResponse({ url: request.url });
      const cache = await selfMock.caches.open(CACHE_NAMES.documents);
      await cache.put(request, cachedResponse);

      // Set up a failed network request
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Execute the networkFirst strategy
      const response = await networkFirst(request);

      // Should return cached response after network fails
      expect(mockFetch).toHaveBeenCalledWith(request);
      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);
    });

    it('should return offline fallback when both network and cache fail', async () => {
      // Set up a failed network request
      const request = urlToRequest('https://example.com/index.html');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // First, cache the offline fallbacks
      const offlineCache = await selfMock.caches.open(CACHE_NAMES.offline);
      await offlineCache.put(
        OFFLINE_FALLBACKS.document,
        new MockResponse({
          url: OFFLINE_FALLBACKS.document,
          status: 503,
          statusText: 'Service Unavailable',
        })
      );
      await offlineCache.put(
        OFFLINE_FALLBACKS.image,
        new MockResponse({
          url: OFFLINE_FALLBACKS.image,
          status: 503,
          statusText: 'Service Unavailable',
        })
      );

      // Execute the networkFirst strategy
      const response = await networkFirst(request);

      // Should return offline fallback
      expect(response).toBeDefined();
      expect(response.status).toBe(503);
    });
  });

  /**
   * Test staleWhileRevalidate strategy
   */
  describe('staleWhileRevalidate', () => {
    // Implementation of the service worker function
    async function staleWhileRevalidate(request: Request): Promise<Response> {
      const url = new URL(request.url);
      // Use locally defined function instead of referring to the outer one
      const cacheName = (function (url: URL): string {
        // Static assets - JavaScript, CSS, Fonts
        if (url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.static;
        }

        // Images
        if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
          return CACHE_NAMES.images;
        }

        // HTML documents
        if (
          url.pathname.endsWith('/') ||
          url.pathname.endsWith('.html') ||
          url.pathname.endsWith('.htm') ||
          !url.pathname.includes('.')
        ) {
          return CACHE_NAMES.documents;
        }

        // Fonts
        if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
          return CACHE_NAMES.fonts;
        }

        // Dynamic content - fallback
        return CACHE_NAMES.dynamic;
      })(url);

      // Try to get from cache first
      const cachePromise = selfMock.caches.match(request);

      // Fetch from network
      const networkPromise = selfMock
        .fetch(request.clone())
        .then(async (networkResponse) => {
          // Cache the network response
          const cache = await selfMock.caches.open(cacheName);
          await cache.put(request, networkResponse.clone());
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails, we'll fall back to cache or offline
          return null;
        });

      // Return cached response immediately if available
      const cachedResponse = await cachePromise;
      if (cachedResponse) {
        // Revalidate in the background
        networkPromise.catch(() => {
          // Silent catch to prevent unhandled promise rejection
        });
        return cachedResponse;
      }

      // If no cached response, wait for network
      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // If both cache and network fail, return offline fallback
      return getOfflineFallback(request);
    }

    // Implementation of service worker function for offline fallback
    async function getOfflineFallback(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // For image requests, return the offline image
      if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.image);
      }

      // For document requests, return the offline page
      if (
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.htm') ||
        !url.pathname.includes('.')
      ) {
        return selfMock.caches.match(OFFLINE_FALLBACKS.document);
      }

      // Default to a simple response for other requests
      return new MockResponse({
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Helper function to convert URL to Request
    function urlToRequest(url: string): Request {
      return new Request(url);
    }

    it('should return cached response immediately if available and update cache in background', async () => {
      // Set up a cached response
      const request = urlToRequest('https://example.com/api/data.json');
      const cachedResponse = new MockResponse({ url: request.url });
      const cache = await selfMock.caches.open(CACHE_NAMES.dynamic);
      await cache.put(request, cachedResponse);

      // Set up a network response that takes time
      const networkResponse = new MockResponse({
        url: request.url,
        headers: { 'X-Updated': 'true' },
      });
      mockFetch.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(networkResponse), 50);
        });
      });

      // Execute the staleWhileRevalidate strategy
      const response = await staleWhileRevalidate(request);

      // Should return cached response immediately
      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);
      expect(response.headers.get('X-Updated')).toBeNull();

      // Should have started network fetch, but we can't check exact equality
      // because the Request objects aren't exactly the same in test environment
      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls[0][0].url).toBe(request.url);

      // Wait for background update to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have updated the cache with new response
      const updatedResponse = await cache.match(request);
      expect(updatedResponse).toBeDefined();
      expect(updatedResponse.headers.get('X-Updated')).toBe('true');
    });

    it('should fetch from network when cache is empty', async () => {
      // Set up a network response
      const request = urlToRequest('https://example.com/api/data.json');
      const networkResponse = new MockResponse({ url: request.url });
      mockFetch.mockResolvedValueOnce(networkResponse);

      // Execute the staleWhileRevalidate strategy
      const response = await staleWhileRevalidate(request);

      // Should fetch from network, but we can't check exact equality
      // because the Request objects aren't exactly the same in test environment
      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls[0][0].url).toBe(request.url);

      expect(response).toBeDefined();
      expect(response.url).toBe(request.url);

      // Should have cached the response
      const cache = await selfMock.caches.open(CACHE_NAMES.dynamic);
      const cachedResponse = await cache.match(request);
      expect(cachedResponse).toBeDefined();
    });

    it('should return offline fallback when both cache and network fail', async () => {
      // Set up a failed network request
      const request = urlToRequest('https://example.com/api/data.json');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // First, cache the offline fallbacks
      const offlineCache = await selfMock.caches.open(CACHE_NAMES.offline);
      await offlineCache.put(
        OFFLINE_FALLBACKS.document,
        new MockResponse({ url: OFFLINE_FALLBACKS.document })
      );
      await offlineCache.put(
        OFFLINE_FALLBACKS.image,
        new MockResponse({ url: OFFLINE_FALLBACKS.image })
      );

      // Execute the staleWhileRevalidate strategy
      const response = await staleWhileRevalidate(request);

      // Should return offline fallback
      expect(response).toBeDefined();
      expect(response.status).toBe(503);
    });
  });

  /**
   * Test offline fallback functionality
   */
  describe('getOfflineFallback', () => {
    // Implementation of service worker function for offline fallback
    async function getOfflineFallback(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // For image requests, return the offline image
      if (url.pathname.match(/\.(jpe?g|png|gif|svg|webp|avif)$/)) {
        const fallbackResponse = await selfMock.caches.match(OFFLINE_FALLBACKS.image);
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }

      // For document requests, return the offline page
      if (
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.htm') ||
        !url.pathname.includes('.')
      ) {
        const fallbackResponse = await selfMock.caches.match(OFFLINE_FALLBACKS.document);
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }

      // Default to a simple response for other requests
      return new MockResponse({
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Helper function to convert URL to Request
    function urlToRequest(url: string): Request {
      return new Request(url);
    }

    it('should return offline image for image requests', async () => {
      // Cache the offline fallback image
      const offlineCache = await selfMock.caches.open(CACHE_NAMES.offline);
      const offlineImage = new MockResponse({ url: OFFLINE_FALLBACKS.image });
      await offlineCache.put(OFFLINE_FALLBACKS.image, offlineImage);

      // Test with an image request
      const request = urlToRequest('https://example.com/image.jpg');
      const response = await getOfflineFallback(request);

      // Should return the offline image
      expect(response).toBeDefined();
      expect(response.url).toBe(OFFLINE_FALLBACKS.image);
    });

    it('should return offline document for HTML requests', async () => {
      // Cache the offline fallback document
      const offlineCache = await selfMock.caches.open(CACHE_NAMES.offline);
      const offlineDocument = new MockResponse({ url: OFFLINE_FALLBACKS.document });
      await offlineCache.put(OFFLINE_FALLBACKS.document, offlineDocument);

      // Test with a document request
      const request = urlToRequest('https://example.com/index.html');
      const response = await getOfflineFallback(request);

      // Should return the offline document
      expect(response).toBeDefined();
      expect(response.url).toBe(OFFLINE_FALLBACKS.document);
    });

    it('should return 503 for other requests', async () => {
      // Test with a non-image, non-document request
      const request = urlToRequest('https://example.com/api/data.json');
      const response = await getOfflineFallback(request);

      // Should return a 503 response
      expect(response).toBeDefined();
      expect(response.status).toBe(503);
      expect(response.statusText).toBe('Service Unavailable');
    });
  });

  /**
   * Test background sync functionality
   */
  describe('Background Sync', () => {
    // Mock navigator.onLine
    let originalNavigatorOnLine: boolean;

    beforeEach(() => {
      originalNavigatorOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalNavigatorOnLine,
      });
    });

    // Implementation of service worker function for queueing form submission
    async function queueFormSubmission(url: string, method: string, body: any): Promise<boolean> {
      // Check if we're online
      if (!navigator.onLine) {
        // We're offline, queue the request
        try {
          // Get existing queue from storage
          const queueData = localStorage.getItem(SYNC_QUEUE_NAME);
          const queue = queueData ? JSON.parse(queueData) : [];

          // Add the new request to the queue
          queue.push({
            id: `form-${Date.now()}`,
            url,
            method,
            body,
            timestamp: Date.now(),
          });

          // Save the updated queue
          localStorage.setItem(SYNC_QUEUE_NAME, JSON.stringify(queue));

          // Register for sync when online
          try {
            await selfMock.registration.sync.register(SYNC_QUEUE_NAME);
          } catch {
            // Continue anyway - we've saved the data
          }

          return true;
        } catch {
          // Failed to queue form submission
          return false;
        }
      } else {
        // We're online, try to submit the form directly
        try {
          const response = await selfMock.fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          return response.ok;
        } catch {
          // Failed to submit form
          return false;
        }
      }
    }

    // Mock localStorage
    let mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
      mockLocalStorage = {};

      // Mock localStorage
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn((key) => mockLocalStorage[key] || null),
          setItem: vi.fn((key, value) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key) => {
            delete mockLocalStorage[key];
          }),
        },
        writable: true,
      });
    });

    it('should submit form directly when online', async () => {
      // Ensure we're online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Mock a successful fetch
      const mockResponse = new MockResponse({ status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      // Try to submit a form
      const result = await queueFormSubmission('https://example.com/api/submit', 'POST', {
        name: 'Test',
        value: 42,
      });

      // Should have called fetch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/submit',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'Test', value: 42 }),
        })
      );

      // Should return true for successful submission
      expect(result).toBe(true);
    });

    it('should queue form submission when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Try to submit a form
      const result = await queueFormSubmission('https://example.com/api/submit', 'POST', {
        name: 'Test',
        value: 42,
      });

      // Should not have called fetch
      expect(mockFetch).not.toHaveBeenCalled();

      // Should have saved to queue
      expect(localStorage.getItem).toHaveBeenCalledWith(SYNC_QUEUE_NAME);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        SYNC_QUEUE_NAME,
        expect.stringContaining('https://example.com/api/submit')
      );

      // Should have tried to register for sync
      expect(selfMock.registration.sync.register).toHaveBeenCalledWith(SYNC_QUEUE_NAME);

      // Should return true for successful queueing
      expect(result).toBe(true);
    });

    it('should handle storage errors when queueing', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Make localStorage.setItem throw
      (localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      // Try to submit a form
      const result = await queueFormSubmission('https://example.com/api/submit', 'POST', {
        name: 'Test',
        value: 42,
      });

      // Should have failed to queue
      expect(result).toBe(false);
    });

    it('should handle fetch errors when online', async () => {
      // Ensure we're online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Mock a failed fetch
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Try to submit a form
      const result = await queueFormSubmission('https://example.com/api/submit', 'POST', {
        name: 'Test',
        value: 42,
      });

      // Should have called fetch
      expect(mockFetch).toHaveBeenCalled();

      // Should return false for failed submission
      expect(result).toBe(false);
    });
  });

  /**
   * Test cache cleanup functionality
   */
  describe('Cache Cleanup', () => {
    // Implementation of service worker function for cache cleanup
    async function cleanupCaches(): Promise<void> {
      // Clean up old caches
      const cacheNames = await selfMock.caches.keys();

      // Delete caches that don't match our current cache names
      const validCacheNames = Object.values(CACHE_NAMES);
      const cachesToDelete = cacheNames.filter((name) => !validCacheNames.includes(name));

      await Promise.all(cachesToDelete.map((name) => selfMock.caches.delete(name)));

      // Clean up each remaining cache based on size and age
      await Promise.all(
        validCacheNames.map(async (cacheName) => {
          const cache = await selfMock.caches.open(cacheName);
          const requests = await cache.keys();

          // If cache is too small, don't bother cleaning
          if (requests.length <= 10) {
            return;
          }

          // Calculate total size (approximate)
          let totalSize = 0;
          const now = Date.now();

          // Process each request
          const requestsToDelete = [];

          for (const request of requests) {
            const response = await cache.match(request);
            if (!response) continue;

            // Check age from cache-control or headers
            let requestDate = now;
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              requestDate = new Date(dateHeader).getTime();
            }

            // If item is too old, mark for deletion
            if (now - requestDate > MAX_CACHE_AGE) {
              requestsToDelete.push(request);
              continue;
            }

            // Otherwise, count its size
            totalSize += 1000; // Approximate size in bytes
          }

          // Delete old items
          await Promise.all(requestsToDelete.map((request) => cache.delete(request)));

          // If we're still over the size limit, delete more by LRU
          if (totalSize > CACHE_LIMIT_BYTES && requests.length > requestsToDelete.length) {
            // Sort by age (we'll assume that the first items are the oldest)
            // In a real implementation, we'd use headers or metadata
            const remainingRequests = requests.filter(
              (req) => !requestsToDelete.some((r) => r.url === req.url)
            );

            // Calculate how many more to delete (20% of remaining)
            const cleanupPercentage = swConfig.cacheLimits.cleanupPercentage;
            const additionalToDelete = Math.floor(remainingRequests.length * cleanupPercentage);

            // Delete the oldest items
            const oldestRequests = remainingRequests.slice(0, additionalToDelete);
            await Promise.all(oldestRequests.map((request) => cache.delete(request)));
          }
        })
      );
    }

    it('should remove old caches', async () => {
      // Create some old caches
      await selfMock.caches.open('old-cache-1');
      await selfMock.caches.open('old-cache-2');
      await selfMock.caches.open(CACHE_NAMES.static);

      // Run cache cleanup
      await cleanupCaches();

      // Should have deleted old caches
      const cacheNames = await selfMock.caches.keys();
      expect(cacheNames).not.toContain('old-cache-1');
      expect(cacheNames).not.toContain('old-cache-2');
      expect(cacheNames).toContain(CACHE_NAMES.static);
    });

    it('should clean up old items in cache', async () => {
      // Create a cache with old and new items
      const cache = await selfMock.caches.open(CACHE_NAMES.dynamic);

      // Add more than 10 items (to trigger cleanup)
      for (let i = 0; i < 15; i++) {
        const url = `https://example.com/item-${i}.json`;
        const response = new MockResponse({
          url,
          headers: {
            // Make the first 5 items old
            date:
              i < 5
                ? new Date(Date.now() - MAX_CACHE_AGE - 1000).toUTCString()
                : new Date().toUTCString(),
          },
        });
        await cache.put(new Request(url), response);
      }

      // Run cache cleanup
      await cleanupCaches();

      // Should have deleted old items
      const requests = await cache.keys();
      const urls = requests.map((req) => req.url);

      // Old items should be gone
      for (let i = 0; i < 5; i++) {
        expect(urls).not.toContain(`https://example.com/item-${i}.json`);
      }

      // New items should remain
      for (let i = 5; i < 15; i++) {
        expect(urls).toContain(`https://example.com/item-${i}.json`);
      }
    });
  });
});
