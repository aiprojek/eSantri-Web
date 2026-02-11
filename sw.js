
const CACHE_NAME = 'esantri-web-hybrid-v2.3'; // Bump version
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/public/icon.svg',
  
  // UI Framework & Icons (CDN)
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  
  // Critical Dependencies (Matches importmap in index.html)
  // React Core
  'https://esm.sh/react@18.3.1',
  'https://esm.sh/react-dom@18.3.1',
  'https://esm.sh/react-dom@18.3.1/client',
  
  // Database & Logic
  'https://esm.sh/dexie@3.2.4',
  'https://esm.sh/dexie-react-hooks@1.1.7?external=react,dexie',
  'https://esm.sh/react-hook-form@7.51.5?external=react',
  'https://esm.sh/date-fns@^4.1.0',
  
  // PDF & Excel & Cloud
  'https://esm.sh/html2canvas@1.4.1',
  'https://esm.sh/jspdf@2.5.1',
  'https://esm.sh/jspdf-autotable@3.8.2',
  'https://esm.sh/xlsx@0.18.5',
  'https://esm.sh/webdav@5.7.1',
  'https://esm.sh/react-virtuoso@^4.18.1?external=react,react-dom'
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell and dependencies');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Install completed');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Cache addAll failed', err);
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

  // Handle standard requests
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors' && networkResponse.type !== 'opaque') {
            return networkResponse;
          }
          
          // Cache the new resource
          // Note: esm.sh redirects are handled by fetch, we cache the final result url effectively
          cache.put(request, networkResponse.clone());

          return networkResponse;
        }).catch(error => {
           // console.warn('SW: Network request failed', request.url);
           throw error;
        });
      });
    })
  );
});
