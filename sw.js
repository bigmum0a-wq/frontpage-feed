// FrontPage Service Worker - Offline-First Engine
const CACHE_NAME = 'frontpage-v8';
const API_CACHE_NAME = 'frontpage-api-v8';
const IMAGE_CACHE_NAME = 'frontpage-images-v8';


const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/tokens.css',
  './assets/css/tailwind.output.css',
  './assets/css/app.css',
  './assets/css/responsive.css',
  './assets/icons/favicon-32x32.png',
  './assets/icons/fontpage-logo.svg',
  './assets/icons/grid-icon.svg',
  './assets/icons/list-icon.svg',
  './assets/icons/list-icon-2.svg',
  './assets/icons/New-list-icon.svg',
  './assets/icons/refresh-icon.svg',
  './assets/icons/search-icon.svg',
  './assets/icons/mark-all-read-icon.svg',
  './assets/js/app.js',
  './assets/js/router.js',
  './assets/js/state.js',
  './assets/js/data-sample-feeds.json',
  './assets/js/services/apiService.js',
  './assets/js/services/feedService.js',
  './assets/js/services/authService.js',
  './assets/js/services/preferences.js',
  './assets/js/services/storageService.js',
  './assets/js/services/searchService.js',
  './assets/js/services/offlineSyncService.js',
  './assets/js/services/badgeService.js',
  './assets/js/components/reader.js',
  './assets/js/components/toast.js',
  './assets/js/components/modal.js',
  './assets/js/components/authModal.js',
  './assets/js/components/landingHero.js',
  './assets/js/components/feedList.js',
  './assets/js/components/feedItem.js',
  './assets/js/components/sidebar.js',
  './assets/js/components/header.js',
  './assets/js/components/search.js',
  './assets/js/components/audioPlayer.js',
  './assets/js/components/keyboardShortcuts.js',
  './assets/js/views/feedView.js',
  './assets/js/views/digestView.js',
  './assets/js/views/discoverView.js',
  './assets/js/views/settingsView.js',
  './assets/js/views/profileView.js',
  './assets/js/utils/constants.js',
  './assets/js/utils/date.js',
  './assets/js/utils/helpers.js',
  './assets/js/utils/sanitize.js'
];


// 1. Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use map to avoid failing whole install if single non-critical asset fails
      await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url).then((response) => {
            if (response.ok) return cache.put(url, response);
            return null;
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!allowedCaches.includes(key)) {
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Intelligent Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET requests (mutations) pass through (handled by offline action queue on failure)
  if (request.method !== 'GET') {
    return;
  }

  // A. API Requests: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ success: false, error: { message: 'Mode hors-ligne' } }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        })
    );
    return;
  }

  // B. Images: Cache-First with Dynamic Image Cache
  if (request.destination === 'image' || /\.(png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match('/assets/icons/favicon-32x32.png'));
      })
    );
    return;
  }

  // C. Navigation Requests (HTML Pages): Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // D. Static App Shell: Cache-First with Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});

// 4. Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
        });
      })
    );
  }
});
