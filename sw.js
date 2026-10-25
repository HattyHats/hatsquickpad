const CACHE_NAME = 'quickpad-v117';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png',
  './manifest.json'
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
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('firebaseio.com') ||
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
        // If network fails (offline), fall back to the cache or a valid offline Response
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html', { ignoreSearch: true });
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
