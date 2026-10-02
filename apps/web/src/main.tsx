import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ArtLab } from './components/ArtLab';
import { setDebugVisualTime } from '@game/renderer';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).has('art-lab') ? <ArtLab /> : <App />}
  </React.StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Khi SW mới được install và activate (deploy mới), reload trang để dùng assets mới.
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // SW mới vừa kích hoạt → reload để đảm bảo không còn assets cũ trong cache.
            window.location.reload();
          }
        });
      });
    }).catch((err: unknown) => {
      // Không throw — SW là tính năng PWA tuỳ chọn, lỗi không nên ảnh hưởng game.
      console.warn('[SW] Đăng ký thất bại:', err);
    });
  });
}

/**
 * Dev only: nhảy giờ/ngày chỉ về mặt hiển thị (ánh sáng, bóng cây, mưa), không đổi save hay mô phỏng.
 * URL: ?debugTime=ngày:giờ[:phút[:mưa]] (ví dụ ?debugTime=34:12:0:0.8). Console: setDebugTime(34, 12, 0, 0.8), clearDebugTime().
 */
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.setDebugTime = (day: number, hour: number, minute = 0, rain?: number) => setDebugVisualTime({ day, hour, minute, rain });
  w.clearDebugTime = () => setDebugVisualTime(null);
  const raw = new URLSearchParams(window.location.search).get('debugTime');
  if (raw) {
    const [day, hour, minute, rain] = raw.split(':').map(Number);
    if (Number.isFinite(day) && Number.isFinite(hour)) setDebugVisualTime({ day, hour, minute: Number.isFinite(minute) ? minute : 0, rain: Number.isFinite(rain) ? rain : undefined });
  }
}
