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
 * This implements basic caching strategies for offline support
 */

// Cache name with version
const CACHE_NAME = '${swConfig.cacheName}';

// Resources to pre-cache
const PRECACHE_URLS = ${JSON.stringify(swConfig.precacheUrls, null, 2)};

// Install event - precache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
      .catch(() => {
        // Return a fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        
        return null;
      })
  );
});

// Handle service worker updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

/**
 * Generate the service worker file
 * This is called by the build process
 */
export function generateServiceWorker(outputPath: string): void {
  fs.writeFileSync(path.join(outputPath, 'sw.js'), sw_template);
  // Log only during build, not imported
  if (require.main === module) {
    // Using process.stdout instead of console.log for build output
    process.stdout.write(
      `Service worker generated at ${outputPath}/sw.js with cache name ${swConfig.cacheName}\n`
    );
  }
}

// If this file is executed directly, generate the service worker
if (require.main === module) {
  const outputPath = process.argv[2] || './public';
  generateServiceWorker(outputPath);
}
