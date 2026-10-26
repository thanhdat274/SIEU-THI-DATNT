/* Service worker cho game Tạp Hóa 3D.
 * Chiến lược:
 *  - Trang chính (/ và /*.html): network-first, fallback về bản cache (offline vẫn mở được).
 *  - Tài nguyên tĩnh (/assets/*, /icons/*, font): cache-first (nhanh, tiết kiệm mạng).
 *  - API (/api, /ws): không cache (dữ liệu thời gian thực).
 * Điều này giúp game có thể được "cài ra màn hình chính" trên iPhone/iOS
 * và vẫn mở được khi không có mạng (dùng bản đã tải).
 */
const VERSION = 'tap-hoa-3d-v1';
const CACHE_NAME = `static-${VERSION}`;
const RUNTIME_CACHE = 'runtime-v1';

// Luôn đi qua mạng (real-time, login, cloud) — không cache
const NETWORK_ONLY = ['/api', '/ws'];

self.addEventListener('install', (event) => {
  // Chờ tới khi bản cũ hoàn toàn bị thay thế mới activate
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.clients.claim())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Chèn danh sách file build (đã hash) từ script build — nếu có
// Danh sách này do scripts/generate-precache.mjs sinh ra sau mỗi lần build.

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Chỉ xử lý cùng origin, GET
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Bỏ qua các endpoint mạng
  if (NETWORK_ONLY.some((p) => url.pathname.startsWith(p))) return;

  // Bỏ qua các request mang tính chi tiết / streaming không cần cache
  if (request.destination === 'video' || request.destination === 'audio') return;

  // Trang chính và HTML: network-first rồi fallback cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match(request)))
    );
    return;
  }

  // Tài nguyên tĩnh: cache-first, đẩy bản mới vào runtime cache
  if (/\.(?:js|css|png|jpg|jpeg|webp|svg|glb|woff2?|json|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // Mọi thứ khác: chỉ mạng
  return;
});
