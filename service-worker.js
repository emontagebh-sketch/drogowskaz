const CACHE_NAME = 'drogowskaz-v1';
const toCache = [
  '.',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(toCache)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e=>{
  // simple caching strategy: try cache, then network
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});
