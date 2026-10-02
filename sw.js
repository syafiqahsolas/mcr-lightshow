// Simple Service Worker for offline caching
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.match('/').then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Let the browser do its normal thing, but fall back gracefully offline
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
