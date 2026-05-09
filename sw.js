const CACHE_NAME = 'sos-score-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png' // ถ้ามีไฟล์ไอคอน ให้ใส่ชื่อให้ตรง ถ้าไม่มีให้ลบออกครับ
];

// 1. ติดตั้ง Service Worker (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // ให้เริ่มทำงานทันทีไม่ต้องรอ
});

// 2. จัดการ Cache เก่า (Activate)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. ดึงข้อมูล (Fetch) - หัวใจหลักของการทำงาน Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // ถ้าเน็ตหลุด ให้ไปค้นหาไฟล์จาก Cache มาแสดงแทน
      return caches.match(event.request);
    })
  );
});
