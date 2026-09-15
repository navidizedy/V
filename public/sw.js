// Minimal service worker for Van Ja PWA installability.
//
// Intentionally has NO `fetch` handler: a no-op fetch listener forces the browser to
// boot the service worker on every navigation and route each request through it,
// which measurably delays page loads (Chrome flags this as a performance issue).
// Without a fetch handler, requests go straight to the network as if no SW existed.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
