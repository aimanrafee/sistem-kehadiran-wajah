const CACHE_NAME = 'kehadiran-v1';
const ASSETS = [
  '/sistem-kehadiran-wajah/',
  '/sistem-kehadiran-wajah/index.html',
  '/sistem-kehadiran-wajah/script.js',
  '/sistem-kehadiran-wajah/models/tiny_face_detector_model-weights_manifest.json',
  // Tambah semua path fail model & gambar rujukan anda di sini
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
