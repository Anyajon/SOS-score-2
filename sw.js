const CACHE_NAME = 'sos-score-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. ติดตั้ง Service Worker และเก็บไฟล์ลง Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching Assets');
      // ใช้ addAll เพื่อเก็บไฟล์ทั้งหมด
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ลบ Cache เก่าที่ไม่ได้ใช้ เพื่อประหยัดพื้นที่มือถือ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. กลยุทธ์การดึงข้อมูล (Stale-While-Revalidate)
// จะแสดงข้อมูลจาก Cache ทันทีเพื่อให้แอปเร็ว และแอบไปอัปเดตข้อมูลจากเน็ตเงียบๆ
self.addEventListener('fetch', (event) => {
  // ข้ามการ Cache สำหรับคำขอที่เป็น POST (การส่งข้อมูลไป Google Sheets)
  // เพราะ POST ไม่สามารถ Cache ได้
  if (event.request.method === 'POST') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // ถ้ามีใน Cache ให้ส่งคืนเลย
        return cachedResponse;
      }
      // ถ้าไม่มีใน Cache ให้ไปดึงจากเครือข่าย
      return fetch(event.request);
    })
  );
});
