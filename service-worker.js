// HVAC 관리 시스템 Service Worker
// Version: 1.0.0

const CACHE_VERSION = 'hvac-v1.0.0';
const CACHE_NAME = `hvac-cache-${CACHE_VERSION}`;

// 캐시할 파일 목록
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/inspection.html',
  '/dashboard.html',
  '/equipment-list.html',
  '/equipment-search.html',
  '/equipment-history.html',
  '/qr-generator.html',
  '/css/style.css',
  '/css/inspection.css',
  '/css/dashboard.css',
  '/css/equipment-list.css',
  '/css/equipment-search.css',
  '/css/equipment-history.css',
  '/js/main.js',
  '/js/firebase-config.js',
  '/js/inspection.js',
  '/js/dashboard.js',
  '/js/equipment-search.js',
  '/js/equipment-history.js',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Service Worker 설치 이벤트
self.addEventListener('install', event => {
  console.log('[Service Worker] 설치 중...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 파일 캐싱 중...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료 ✅');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch(error => {
        console.error('[Service Worker] 설치 실패:', error);
      })
  );
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('[Service Worker] 활성화 중...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 이전 버전 캐시 삭제
            if (cacheName !== CACHE_NAME && cacheName.startsWith('hvac-cache-')) {
              console.log('[Service Worker] 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 활성화 완료 ✅');
        return self.clients.claim(); // 모든 클라이언트 제어
      })
  );
});

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백 전략
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Firebase 요청은 캐싱하지 않음
  if (url.hostname.includes('firebasestorage') || 
      url.hostname.includes('firebaseapp') ||
      url.hostname.includes('googleapis')) {
    return;
  }
  
  // 외부 리소스 (CDN)는 네트워크 우선
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 성공하면 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 가져오기
          return caches.match(request);
        })
    );
    return;
  }
  
  // 로컬 파일: 네트워크 우선, 캐시 폴백
  event.respondWith(
    fetch(request)
      .then(response => {
        // 200번대 응답만 캐싱
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 가져오기
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[Service Worker] 캐시에서 제공:', request.url);
              return cachedResponse;
            }
            
            // HTML 요청이고 캐시도 없으면 index.html 제공
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // 오프라인 페이지 제공 (선택사항)
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
      })
  );
});

// 백그라운드 동기화 (선택사항 - 추후 구현)
self.addEventListener('sync', event => {
  console.log('[Service Worker] 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'sync-inspections') {
    event.waitUntil(
      // 오프라인에서 저장한 점검 데이터를 Firebase에 업로드
      syncInspections()
    );
  }
});

// 푸시 알림 (선택사항 - 추후 구현)
self.addEventListener('push', event => {
  console.log('[Service Worker] 푸시 알림 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: '열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('HVAC 관리', options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 알림 클릭:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 동기화 함수 (추후 구현)
async function syncInspections() {
  try {
    // IndexedDB에서 오프라인 점검 데이터 가져오기
    // Firebase에 업로드
    console.log('[Service Worker] 점검 데이터 동기화 완료');
  } catch (error) {
    console.error('[Service Worker] 동기화 실패:', error);
    throw error;
  }
}

// 메시지 수신 (선택사항)
self.addEventListener('message', event => {
  console.log('[Service Worker] 메시지 수신:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] 로드 완료', CACHE_VERSION);
