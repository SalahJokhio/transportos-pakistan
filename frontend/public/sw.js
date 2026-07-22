// TransportOS service worker — offline app shell for the counter (load-shedding
// reality in Pakistan). Static assets are cache-first; navigations fall back to
// a cached shell when offline. API calls are always network (never cache money).
const CACHE = 'transportos-v1';
const SHELL = ['/', '/search', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API / auth / payments — always hit the network.
  if (url.pathname.includes('/api/') || request.method !== 'GET') return;

  // Static Next assets: cache-first.
  if (url.pathname.startsWith('/_next/') || /\.(png|jpg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })),
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((hit) => hit || caches.match('/offline'))),
    );
  }
});
