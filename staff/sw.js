/* Nikadi Staff — offline shell. Bump VERSION whenever staff app files change. */
var VERSION = "nikadi-staff-v8";
var SHELL = ["./", "index.html", "staff.css", "app.js", "logic.js", "demo.js", "manifest.webmanifest", "../app/app.css", "../app/core.js", "../app/icons/icon-192.png", "../img/brand/lockup-light.png", "../img/brand/logo-light.png", "bill.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("nikadi-staff-") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Network first so updates show at once; cached copy only when offline. Data calls to Google are never cached. */
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); return res;
  }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match("index.html"); }); }));
});
