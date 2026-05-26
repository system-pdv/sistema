const CACHE_NAME = 'inlock-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/morador.html',
  '/admin.html',
  '/css/style.css',
  '/manifest.json'
];

// Instala o Service Worker e guarda os arquivos básicos no cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Executa as requisições mesmo se estiver offline (básico para PWA)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});