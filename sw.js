// One Place service worker: shows the morning reminder notification and opens the app when it is tapped.
// It does not cache anything, so people always get the latest version of the app.
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "One Place", {
    body: data.body || "You have a reminder due.",
    icon: "/assets/icon-192.png",
    badge: "/assets/icon-192.png",
    tag: "one-place-daily",
    data: { url: data.url || "/" }
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async function () {
    var all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (var i = 0; i < all.length; i++) { if ("focus" in all[i]) { await all[i].focus(); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
