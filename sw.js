/* One Place — service worker. Lives at the site root (next to
   index.html) so its scope covers the whole app; the manifest and
   icons live in the assets/ folder.
   Makes the app installable and lets the app shell load offline.
   Strategy: navigations are NETWORK-FIRST so a freshly published
   version on Vercel reaches testers right away (the cache is only a
   fallback when the network is gone); other same-origin files are
   cache-first with a background refresh. Cross-origin requests
   (Supabase, fonts) pass straight through, and non-GET requests
   (the /api/gemini proxy) are never intercepted. */
var CACHE = "one-place-v1";
var CORE = [
  "./",
  "./index.html",
  "assets/manifest.json",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png",
  "assets/icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      /* Cache the shell file by file: one missing file must never
         fail the whole install. */
      return Promise.all(CORE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    /* Network first: publishing a new version must win; fall back to
       the cached page only when offline. */
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (hit) {
          return hit || caches.match("./");
        });
      })
    );
    return;
  }

  /* Static same-origin files: cache first, refresh in the background. */
  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});
