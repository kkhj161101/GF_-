// GoodFriends Sales Commander - Service Worker v2.0
// 업데이트: GF 자동화 탭 + 단가/원가 데이터 + 텔레그램 연결
const CACHE_NAME = 'gf-on-v2-20260529';
const STATIC_CACHE = 'gf-static-v2';

// 캐시할 외부 리소스
const EXTERNAL_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'
];

// 앱 핵심 파일
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── Install: 핵심 파일 캐시
self.addEventListener('install', function(event) {
  console.log('[SW] Installing v2.0...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL).catch(function(err) {
        console.warn('[SW] App shell cache failed:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: 이전 캐시 전부 삭제 (버전 업 시 강제 갱신)
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating v2.0...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name !== CACHE_NAME && name !== STATIC_CACHE;
          })
          .map(function(name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // POST 요청은 캐시 안 함
  if (event.request.method !== 'GET') return;

  // chrome-extension 등 무시
  if (!url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      var fetchPromise = fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ── Push 알림
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var options = {
    body: data.body || '방문 예정 거래처가 있습니다',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'GF Commander',
      options
    )
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
