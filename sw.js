const CACHE_NAME = 'esantri-web-v1.6';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://cdn.jsdelivr.net/npm/dexie@4.0.7/dist/dexie.mjs',
  'https://cdn.jsdelivr.net/npm/react-hook-form/dist/index.esm.mjs'
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell and critical assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // No longer forcing activation. The new SW will wait for a message.
        console.log('Service Worker: New version installed and waiting for activation.');
      })
  );
});

// Listener for the message from the client to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate the service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  const { request } = event;

  // For navigation and core assets (JS/CSS), use stale-while-revalidate.
  // This serves content from cache immediately for speed, and updates cache in the background.
  if (
    request.mode === 'navigate' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(error => {
            console.warn('SW: Network request failed, probably offline.', request.url, error);
          });

          // Return cached response immediately if available, otherwise wait for network.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For other assets (images, fonts, manifest), use cache-first.
  // These assets are less likely to change frequently.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(error => {
        console.error('Fetch failed for non-core asset; browser will show its offline page.', error);
      });
    })
  );
});