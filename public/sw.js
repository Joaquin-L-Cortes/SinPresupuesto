// sw.js — Sin-Presupuesto Service Worker
// Estrategia:
//   • Assets estáticos (_next/static, imágenes, fuentes) → CacheFirst
//   • Páginas HTML → NetworkFirst (siempre intenta red primero)
//   • Firebase, /api/*, keystatic → NetworkOnly (nunca cachear)

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { registerRoute, NavigationRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// ── 1. Activación inmediata sin esperar a que se cierren las tabs ──────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── 2. Nunca cachear: Firebase, API, Keystatic, auth ──────────────────────
registerRoute(
  ({ url }) =>
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseapp') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/keystatic'),
  new NetworkOnly()
);

// ── 3. Assets estáticos de Next.js → CacheFirst (1 año) ───────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: 'sp-static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ── 4. Imágenes (logos, íconos) → CacheFirst (30 días) ────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'sp-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ── 5. Fuentes de Google → CacheFirst (1 año) ─────────────────────────────
registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'sp-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ── 6. Páginas HTML → NetworkFirst (timeout 3 s, luego caché) ────────────
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'sp-pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);
