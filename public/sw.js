// Service worker minimal : cache applicatif hors ligne.
// Stratégie : precache du shell au install, puis network-first pour la
// navigation (pour récupérer les mises à jour) avec repli sur le cache, et
// cache-first pour les assets fingerprintés (immuables).

// BUILD est remplacé au build par le SHA du commit (scripts/stamp-sw.mjs).
// Il fait changer les octets de ce fichier à chaque déploiement, condition pour
// que le navigateur détecte une mise à jour du service worker.
const BUILD = '__BUILD__'
const CACHE = 'inventaire-' + BUILD
const SHELL = ['./', './index.html', './manifest.json', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigation : network-first, repli cache puis index.html (SPA).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    )
    return
  }

  // Assets : cache-first, sinon réseau puis mise en cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
    )
  )
})
