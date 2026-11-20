// ratio.ai: makes the site installable on Android so it shows in the share sheet (manifest share_target).
// Pages load from the network first and fall back to the last copy; the API and everything else pass through.
var CACHE = "ratio-v1";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("/", copy); });
    return res;
  }).catch(function () { return caches.match("/"); }));
});
