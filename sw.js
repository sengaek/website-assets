// sw.js - Service Worker for Caching Stylesheet on GitHub Pages

// --- Configuration ---
// Choose a cache name. IMPORTANT: Increment the version ('v2', 'v3', etc.)
// ONLY when you make changes to THIS sw.js file itself OR
// when you want to force browsers to fetch a fresh copy of your CSS.
const CACHE_NAME = 'my-styles-cache-v1';

// *** CRITICAL: Enter the EXACT URL of your CSS file hosted on GitHub Pages ***
const CSS_URL = 'https://sengaek.github.io/website-assets/my-styles.css';
// **************************************************************************

// --- Service Worker Lifecycle Events ---

// Install event: Called when the service worker is first installed or updated.
self.addEventListener('install', (event) => {
  console.log(`Service Worker (${CACHE_NAME}): Installing...`);
  // skipWaiting() forces the waiting service worker to become the active service worker.
  // This ensures updates take effect sooner.
  self.skipWaiting();
});

// Activate event: Called when the service worker becomes active.
// A good place to clean up old caches from previous versions.
self.addEventListener('activate', (event) => {
  console.log(`Service Worker (${CACHE_NAME}): Activating...`);
  event.waitUntil(
    // Get all cache storage keys (cache names)
    caches.keys().then((cacheNames) => {
      return Promise.all(
        // Map over all cache names
        cacheNames.map((cacheName) => {
          // If a cache name is found that doesn't match the current CACHE_NAME,
          // it's an old cache, so delete it.
          if (cacheName !== CACHE_NAME) {
            console.log(`Service Worker (${CACHE_NAME}): Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // clients.claim() allows the activated service worker to take control of
      // pages that were loaded using the previous version of the worker.
      console.log(`Service Worker (${CACHE_NAME}): Claiming clients...`);
      return self.clients.claim();
    })
  );
});

// --- Fetch Event: Intercept Network Requests ---

// Fetch event: Called every time the browser tries to fetch a resource
// (like CSS, JS, images, HTML) within the service worker's scope.
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Check if the request is for our specific CSS file
  if (requestUrl === CSS_URL) {
    // Apply "Cache First, then Network" strategy for the CSS file
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // 1. If a matching response is found in the cache, return it.
        if (cachedResponse) {
          // console.log(`Service Worker (${CACHE_NAME}): Serving CSS from cache: ${requestUrl}`);
          return cachedResponse;
        }

        // 2. If not in cache, fetch the resource from the network.
        // console.log(`Service Worker (${CACHE_NAME}): Fetching CSS from network: ${requestUrl}`);
        return fetch(event.request).then((networkResponse) => {
          // 3. Once fetched, cache the response for future requests.
          // We need to clone the response because it's a stream and can only be consumed once.
          let responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // console.log(`Service Worker (${CACHE_NAME}): Caching new CSS: ${requestUrl}`);
            // Put the network request and its response into the cache.
            cache.put(event.request, responseToCache);
          });

          // 4. Return the network response to the browser.
          return networkResponse;

        }).catch(error => {
          // Handle fetch errors (e.g., network offline)
          console.error(`Service Worker (${CACHE_NAME}): Fetching CSS failed: ${requestUrl}`, error);
          // Optional: You could return a fallback response here if needed
          // return new Response("/* CSS could not be loaded */", { headers: { 'Content-Type': 'text/css' } });
        });
      })
    );
  }
  // For all other requests that don't match the CSS_URL,
  // the service worker doesn't intercept, and the browser handles them normally.
  // So, we don't need an explicit 'else' block returning fetch(event.request).
});