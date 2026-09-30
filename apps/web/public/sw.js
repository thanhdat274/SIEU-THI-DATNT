// Service worker: chơi offline. Shell + tài nguyên cùng origin được cache khi đã tải một lần.
// Đổi VERSION khi cần buộc máy khách bỏ cache cũ.
const VERSION = 'v1';
const CACHE = `tap-hoa-${VERSION}`;
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tap-hoa-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return; // API/Firebase/WebSocket luôn đi thẳng ra mạng
  if (sameOrigin && url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Ưu tiên mạng để nhận bản mới, rơi về shell đã cache khi offline.
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      void caches.open(CACHE).then(cache => cache.put('./', copy));
      return response;
    }).catch(() => caches.match('./')));
    return;
  }

  // Tài nguyên tĩnh: cache trước, cập nhật nền.
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response.ok || response.type === 'opaque') {
        const copy = response.clone();
        void caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached);
    return cached ?? network;
  }));
});
