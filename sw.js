// sw.js - Service Worker Ringkas
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // Biarkan request berjalan seperti biasa
  e.respondWith(fetch(e.request));
});
