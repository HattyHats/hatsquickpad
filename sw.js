const CACHE_NAME = 'quickpad-v38';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim control immediately
  );
});

// Network-First Strategy for static GET assets
self.addEventListener('fetch', (event) => {
  // Never intercept non-GET requests (e.g. Firestore POST calls)
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Let external APIs and database endpoints pass directly to the network
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') || 
      url.includes('firebaseio.com') ||
      url.includes('googleapis.com') ||
      url.includes('api.qrserver.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), fall back to the cache
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
