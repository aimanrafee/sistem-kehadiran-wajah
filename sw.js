const CACHE_NAME = 'kehadiran-ai-v3'; // Versi dinaikkan kepada v3
const ASSETS_TO_CACHE = [
  '/sistem-kehadiran-wajah/',
  '/sistem-kehadiran-wajah/index.html',
  '/sistem-kehadiran-wajah/script.js',
  '/sistem-kehadiran-wajah/manifest.json',
  // Model AI
  '/sistem-kehadiran-wajah/models/tiny_face_detector_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/face_landmark_68_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/face_recognition_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/ssd_mobilenetv1_model-weights_manifest.json',
  // Imej Rujukan Wajah (WAJIB untuk offline)
  '/sistem-kehadiran-wajah/labeled_images/Aiman/1.jpg',
  '/sistem-kehadiran-wajah/labeled_images/Dahlia/1.jpg' // Tambah imej Dahlia di sini
];

// 1. Install & Cache Aset
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Menyimpan aset dan imej rujukan (Aiman & Dahlia) ke cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); 
});

// 2. Bersihkan Cache Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('PWA: Membuang cache lama...', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Strategi Fetch: Cache-First
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
