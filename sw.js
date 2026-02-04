const CACHE_NAME = 'kehadiran-ai-v1';
const ASSETS_TO_CACHE = [
  '/sistem-kehadiran-wajah/',
  '/sistem-kehadiran-wajah/index.html',
  '/sistem-kehadiran-wajah/script.js',
  '/sistem-kehadiran-wajah/manifest.json',
  '/sistem-kehadiran-wajah/models/tiny_face_detector_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/face_landmark_68_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/face_recognition_model-weights_manifest.json',
  '/sistem-kehadiran-wajah/models/ssd_mobilenetv1_model-weights_manifest.json'
];

// Install Service Worker & Cache Fail
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Menyimpan aset ke cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Strategi: Cuba ambil dari Cache dahulu, jika tiada baru ambil dari Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
