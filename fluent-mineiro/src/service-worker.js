/// <reference types="@sveltejs/kit" />
// SvelteKit-native service worker. Auto-registered by the SvelteKit runtime.
// Precaches the built app shell + static assets so Sabiá opens offline and
// installs as a PWA. Cross-origin API calls (Anthropic, ElevenLabs) are POSTs
// and pass straight through untouched.
import { build, files, version } from '$service-worker';

const CACHE = `sabia-cache-${version}`;

// Everything the app needs to boot: JS/CSS bundles + static files (icons, manifest).
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  // Activate this worker immediately on first install.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch non-GET (API POSTs) or cross-origin requests — let them hit the network.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      // Precached build/static assets: serve from cache first (they're versioned).
      if (ASSETS.includes(url.pathname)) {
        const cached = await cache.match(url.pathname);
        if (cached) return cached;
      }

      // Otherwise network-first, falling back to cache when offline.
      try {
        const response = await fetch(request);
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        // SPA fallback: serve the app shell for offline navigations.
        if (request.mode === 'navigate') {
          const shell =
            (await cache.match('/')) || (await cache.match('/index.html'));
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
