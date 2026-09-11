// ===================================================================
// Maldives Fishing Log — Service Worker
// Caches the app shell for offline use. Map tiles are cached
// opportunistically as they're viewed (runtime cache), so recently
// viewed areas remain available offline; areas never visited online
// will not have tile imagery until the device is back online.
// ===================================================================

const SHELL_CACHE = "vk-shell-v1";
const TILE_CACHE = "vk-tiles-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/data.js",
  "./js/db.js",
  "./js/app.js",
  "./js/view-home.js",
  "./js/view-map.js",
  "./js/view-trips.js",
  "./js/view-catches.js",
  "./js/view-more.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Map tiles: cache-first with background refresh (runtime cache)
  if (url.hostname.includes("tile.openstreetmap.org") || url.hostname.includes("arcgisonline.com")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((resp) => { if (resp.ok) cache.put(event.request, resp.clone()); return resp; })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // App shell + same-origin assets: cache-first, fall back to network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
        if (resp.ok && event.request.method === "GET") {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached))
    );
    return;
  }

  // Everything else (CDN libs like Leaflet): network-first, cache fallback
  event.respondWith(
    fetch(event.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(TILE_CACHE).then((cache) => cache.put(event.request, clone));
      }
      return resp;
    }).catch(() => caches.match(event.request))
  );
});
