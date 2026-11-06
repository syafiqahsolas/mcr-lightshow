const CACHE_NAME = 'mcr-lightshow-v4';

// Everything the app needs to run with zero network connection.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/nosleep.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each asset individually instead of cache.addAll(), which is
      // all-or-nothing: if ONE request fails (e.g. the CDN script times out
      // on a bad venue connection), addAll() aborts and NOTHING gets
      // cached -- including your own HTML/CSS. This way a flaky request
      // for the external script can't take down offline support for the
      // rest of the app.
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Failed to cache (will retry at runtime):', url, err);
          })
        )
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-while-revalidate: serve the cached copy immediately (instant,
      // works offline), but also quietly fetch a fresh copy in the
      // background and update the cache for next time. So if an asset
      // failed to pre-cache at install (e.g. the NoSleep script was
      // unreachable), the very next time it IS reachable it gets cached
      // for real, without waiting for a whole new app version.
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached. For page navigations, fall back to the
          // cached app shell so the user gets the menu, not a browser
          // error page.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });

      return cachedResponse || networkFetch;
    })
  );
});
