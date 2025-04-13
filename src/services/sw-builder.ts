/**
 * Service Worker Build Script
 *
 * This script is used during the build process to generate a properly configured service worker.
 * It takes the template service worker and injects runtime configuration values.
 */
import { swConfig } from '../utils/config';
import fs from 'fs';
import path from 'path';

const sw_template = `/**
 * Service Worker for TypeScript PWA Template
 * This implements advanced caching strategies for offline support
 */

// Cache names for different resource types
const CACHE_NAMES = {
  static: '${swConfig.cacheNames.static}',
  dynamic: '${swConfig.cacheNames.dynamic}',
  documents: '${swConfig.cacheNames.documents}',
  images: '${swConfig.cacheNames.images}',
  fonts: '${swConfig.cacheNames.fonts}',
  offline: '${swConfig.cacheNames.offline}'
};

// Resources to pre-cache
const PRECACHE_URLS = ${JSON.stringify(swConfig.precacheUrls, null, 2)};

// Offline fallback pages
const OFFLINE_FALLBACKS = {
  document: '${swConfig.offlineFallbacks.document}',
  image: '${swConfig.offlineFallbacks.image}'
};

// Maximum age for cached items
const MAX_CACHE_AGE = ${swConfig.maxCacheAge};

// Cache size limit
const CACHE_LIMIT_BYTES = ${swConfig.cacheLimitBytes};

// Background sync queue name
const SYNC_QUEUE_NAME = '${swConfig.syncQueueName}';

/**
 * Determine appropriate cache for a request
 * @param {Request} request The fetch request
 * @returns {string} The cache name to use
 */
function getCacheNameForRequest(request) {
  const url = new URL(request.url);
  
  // Static assets (JS, CSS)
  if (url.pathname.match(/\\.(js|css)$/)) {
    return CACHE_NAMES.static;
  }
  
  // Font files
  if (url.pathname.match(/\\.(woff2?|ttf|otf|eot)$/)) {
    return CACHE_NAMES.fonts;
  }
  
  // Image files
  if (url.pathname.match(/\\.(jpe?g|png|gif|svg|webp|ico)$/)) {
    return CACHE_NAMES.images;
  }
  
  // HTML documents
  if (request.mode === 'navigate' || 
      url.pathname.endsWith('/') || 
      url.pathname.endsWith('.html') ||
      (request.headers.get('Accept') && 
       request.headers.get('Accept').includes('text/html'))) {
    return CACHE_NAMES.documents;
  }
  
  // Default to dynamic cache
  return CACHE_NAMES.dynamic;
}

/**
 * Apply cache-first strategy
 * Good for static resources that rarely change
 */
async function cacheFirst(request) {
  const cache = await caches.open(getCacheNameForRequest(request));
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      // Clone response before caching
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return offline fallback
    return getOfflineFallback(request);
  }
}

/**
 * Apply network-first strategy
 * Good for frequently updated content
 */
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheNameForRequest(request));
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(getCacheNameForRequest(request));
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Both failed, return offline fallback
    return getOfflineFallback(request);
  }
}

/**
 * Apply stale-while-revalidate strategy
 * Returns cached version immediately, then updates cache
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(getCacheNameForRequest(request));
  const cachedResponse = await cache.match(request);
  
  // Update cache in the background regardless of cache hit
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // If network fails but we already have cached response, 
      // just silently fail the update
      return null;
    });
  
  // Return cached immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Get appropriate offline fallback for request
 */
async function getOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAMES.offline);
  
  // For navigation requests, return the offline HTML page
  if (request.mode === 'navigate' || 
      (request.headers.get('Accept') && 
       request.headers.get('Accept').includes('text/html'))) {
    return cache.match(OFFLINE_FALLBACKS.document);
  }
  
  // For image requests, return offline image
  if (request.url.match(/\\.(jpe?g|png|gif|svg|webp|ico)$/)) {
    return cache.match(OFFLINE_FALLBACKS.image);
  }
  
  // For other requests, return a simple text response
  return new Response('Offline: Resource unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({
      'Content-Type': 'text/plain',
    }),
  });
}

/**
 * Queue form submission for later processing when offline
 */
async function queueFormSubmission(request) {
  try {
    // Clone request as it can only be read once
    const requestClone = request.clone();
    let formData;
    
    try {
      // Try to parse as JSON first
      formData = await requestClone.json();
    } catch (err) {
      // If not JSON, try to parse as form data
      formData = Object.fromEntries(await requestClone.formData());
    }
    
    // Get existing queue from localStorage
    let queue = [];
    const storedQueue = localStorage.getItem(SYNC_QUEUE_NAME);
    
    if (storedQueue) {
      queue = JSON.parse(storedQueue);
    }
    
    // Add to queue
    queue.push({
      url: request.url,
      method: request.method,
      body: formData,
      timestamp: Date.now(),
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    });
    
    // Save queue
    localStorage.setItem(SYNC_QUEUE_NAME, JSON.stringify(queue));
    
    // Register background sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register('form-sync');
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Your request has been saved and will be submitted when you are online.',
      offline: true
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error queuing form submission:', error);
    
    // Return error response
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to save your request for offline use.',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Clean up old caches and manage cache storage
 */
async function cleanupCaches() {
  // Get all cache names
  const cacheNames = await caches.keys();
  
  // Delete old caches that are not in our current config
  const validCacheNames = Object.values(CACHE_NAMES);
  
  const deletionPromises = cacheNames
    .filter(name => !validCacheNames.includes(name))
    .map(name => caches.delete(name));
  
  await Promise.all(deletionPromises);
  
  // For dynamic caches, clean up expired entries
  const dynamicCaches = [
    CACHE_NAMES.dynamic,
    CACHE_NAMES.documents
  ];
  
  for (const cacheName of dynamicCaches) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    // Don't delete too many at once to avoid performance issues
    if (requests.length > 100) {
      // Delete oldest entries based on the cache cleanup configuration
      const CACHE_CLEANUP_PERCENTAGE = swConfig.cacheLimits.cleanupPercentage || 0.2;
      
      try {
        // Get cache keys with their timestamps if available
        const timestampedRequests = [];
        for (const request of requests) {
          // Attempt to get metadata for timestamps if available
          const response = await cache.match(request);
          const timestamp = response?.headers?.get('x-cached-at') || 0;
          timestampedRequests.push({ request, timestamp: Number(timestamp) });
        }
        
        // Sort by timestamp (oldest first)
        timestampedRequests.sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate how many to delete
        const deleteCount = Math.floor(requests.length * CACHE_CLEANUP_PERCENTAGE);
        
        // Delete oldest entries
        for (let i = 0; i < deleteCount; i++) {
          await cache.delete(timestampedRequests[i].request);
        }
      } catch (error) {
        // Fallback to simple implementation if there's an error with timestamps
        const deleteCount = Math.floor(requests.length * CACHE_CLEANUP_PERCENTAGE);
        for (let i = 0; i < deleteCount; i++) {
          await cache.delete(requests[i]);
        }
      }
    }
  }
}

// Install event - precache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Pre-cache static resources
      caches.open(CACHE_NAMES.static)
        .then(cache => cache.addAll(PRECACHE_URLS)),
      
      // Pre-cache offline fallbacks
      caches.open(CACHE_NAMES.offline)
        .then(cache => cache.addAll([
          OFFLINE_FALLBACKS.document,
          OFFLINE_FALLBACKS.image
        ]))
    ])
    .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    cleanupCaches()
      .then(() => self.clients.claim())
  );
});

// Fetch event - apply different strategies based on request type
self.addEventListener('fetch', event => {
  // Handle offline form submissions
  if ((event.request.method === 'POST' || event.request.method === 'PUT') 
      && !navigator.onLine) {
    event.respondWith(queueFormSubmission(event.request));
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // URL object for path checking
  const url = new URL(event.request.url);
  
  // Apply appropriate strategy based on request type
  if (
    // Static assets - use cache first
    url.pathname.match(/\\.(js|css|woff2?|ttf|otf|eot)$/) ||
    PRECACHE_URLS.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(event.request));
  } 
  else if (
    // Images - use stale-while-revalidate
    url.pathname.match(/\\.(jpe?g|png|gif|svg|webp|ico)$/)
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
  else if (
    // HTML pages - use network first
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(networkFirst(event.request));
  }
  else {
    // Other requests (API, etc.) - use network first
    event.respondWith(networkFirst(event.request));
  }
});

// Message event - handle various commands from the client
self.addEventListener('message', event => {
  if (!event.data || !event.data.type) {
    return;
  }
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
      
    case 'UPDATE_CACHES':
      // Re-fetch and update cache for static resources
      caches.open(CACHE_NAMES.static)
        .then(cache => {
          return cache.addAll(PRECACHE_URLS);
        })
        .then(() => {
          // Notify client
          if (event.source) {
            event.source.postMessage({
              type: 'CACHE_UPDATED'
            });
          }
        });
      break;
      
    case 'CLEAR_CACHES':
      // Clear all caches except offline fallbacks
      Promise.all(
        Object.entries(CACHE_NAMES)
          .filter(([key]) => key !== 'offline')
          .map(([, name]) => caches.delete(name))
      ).then(() => {
        // Reinitialize static cache
        return caches.open(CACHE_NAMES.static)
          .then(cache => cache.addAll(PRECACHE_URLS));
      }).then(() => {
        // Notify client
        if (event.source) {
          event.source.postMessage({
            type: 'CACHES_CLEARED'
          });
        }
      });
      break;
  }
});

// Background sync event - process queued form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'form-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// Process sync queue
async function processSyncQueue() {
  const storedQueue = localStorage.getItem(SYNC_QUEUE_NAME);
  if (!storedQueue) return;
  
  const queue = JSON.parse(storedQueue);
  if (queue.length === 0) return;
  
  const successfulIds = [];
  
  // Process each item
  await Promise.all(queue.map(async (item) => {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        successfulIds.push(item.id);
      }
    } catch (error) {
      console.error('Failed to process queued submission:', error);
    }
  }));
  
  // Remove successful items
  if (successfulIds.length > 0) {
    const newQueue = queue.filter(item => !successfulIds.includes(item.id));
    localStorage.setItem(SYNC_QUEUE_NAME, JSON.stringify(newQueue));
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        processed: successfulIds.length
      });
    });
  }
}

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const title = data.title || 'New Update';
    const options = {
      body: data.body || 'There is new information available.',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      const matchingClient = windowClients.find(client => 
        client.url === urlToOpen || client.url.endsWith(urlToOpen)
      );
      
      // If so, focus it
      if (matchingClient) {
        return matchingClient.focus();
      }
      
      // If not, open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});
`;

/**
 * Generate the service worker file
 * This is called by the build process
 */
export function generateServiceWorker(outputPath: string): void {
  if (!outputPath) {
    console.error('Output path is required');
    return;
  }

  try {
    fs.writeFileSync(path.join(outputPath, 'sw.js'), sw_template);

    // Log only during build, not imported
    if (require.main === module) {
      // Using process.stdout instead of console.log for build output
      process.stdout.write(
        `Service worker generated at ${outputPath}/sw.js with advanced caching strategies\n`
      );
    }
  } catch (error) {
    // Handle file system errors gracefully
    console.error(
      `Error generating service worker: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// If this file is executed directly, generate the service worker
if (require.main === module) {
  const outputPath = process.argv[2] || './public';
  generateServiceWorker(outputPath);
}
