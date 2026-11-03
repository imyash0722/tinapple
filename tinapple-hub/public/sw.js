// Tinapple Hub — High-Performance Offline Cache Stack Service Worker
const CACHE_NAME = 'tinapple-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/homarr.svg',
];

// Install: precache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches
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
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip WebSocket connections, non-GET requests, or chrome-extension URLs
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 1. Navigation requests (HTML document loads)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Server offline or browser disconnected: Return cached app shell
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en" class="dark">
              <head>
                <meta charset="UTF-8"/>
                <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
                <title>Tinapple Hub — Offline</title>
                <style>
                  body { background: #050814; color: #f1f5f9; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
                  .card { background: #0b132b; border: 1px solid rgba(255,255,255,0.1); padding: 2rem; border-radius: 1.5rem; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                  h1 { font-size: 1.25rem; color: #38bdf8; margin-bottom: 0.5rem; }
                  p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
                  button { background: #38bdf8; color: #020617; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>🍎 Server Offline / Standby</h1>
                  <p>Tinapple Hub server could not be reached. Check your Wi-Fi, Tailscale connection, or hotspot.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. API requests (/api/v1/*) — Network-first with short timeout
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(
      Promise.race([
        fetch(req),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 3500)
        ),
      ]).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'Appliance server unreachable',
            timestamp: Date.now(),
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. Static assets (JS, CSS, images, icons, fonts) — Stale-While-Revalidate / Cache-First
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
