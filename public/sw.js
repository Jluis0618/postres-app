// Service worker mínimo: hace la app instalable y muestra una página amable sin internet.
// No guarda datos en caché: órdenes e inventario siempre se leen frescos de la base.
const CACHE = "postres-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})
