self.addEventListener('install', event => {
  // Activate new service worker immediately
  self.skipWaiting();
  console.log('[SW] Installed and skipWaiting');
});

self.addEventListener('activate', event => {
  // Take control of clients immediately
  event.waitUntil((async () => {
    try { await self.clients.claim(); } catch(e) {}
    console.log('[SW] Activated and claimed clients');
  })());
});

// Network-first fetch handler: always try network to avoid serving stale cached files during debugging
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (err) {
      // If network fails, fall back to default (could be cache if implemented)
      return await caches.match(event.request) || new Response(null, { status: 504 });
    }
  })());
});
