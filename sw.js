const CACHE = 'newspilot-v1';
const OFFLINE_MAX_MS = 72 * 60 * 60 * 1000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./']))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always pass Telegram API calls through — never cache them
  if (url.hostname === 'api.telegram.org') {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ok:false,description:'offline'}), {
        headers:{'Content-Type':'application/json'}
      })
    ));
    return;
  }

  // For the main app shell: network-first with cache fallback
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached ||
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
    )
  );
});
