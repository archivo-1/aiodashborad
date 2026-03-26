// sw.js – Service Worker para AioDB Dashboard (PWA)
// Estrategia: Cache-First para el shell estático, Network-First para Supabase.

const CACHE_NAME = 'aiodb-v1';
const SHELL_URLS = [
  'dashboard.html',
  'manifest.json',
];

// Instalar: pre-cachea el shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// Activar: elimina caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-First para Supabase/ESM, Cache-First para el resto
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Siempre red para Supabase, ESM, GitHub raw (datos dinámicos)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('esm.sh') ||
    url.hostname.includes('raw.githubusercontent.com')
  ) {
    return; // Pasa directamente a la red sin interceptar
  }

  // Cache-First para el shell
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Cachea solo respuestas válidas del mismo origen
        if (
          response.ok &&
          response.type === 'basic' &&
          request.method === 'GET'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
