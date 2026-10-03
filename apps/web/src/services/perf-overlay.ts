/**
 * Bảng đo FPS gắn qua URL `?perf=1` (port gọn từ perfOverlay.ts của tap-hoa-dau-hem).
 * Đo nhịp khung hình bằng requestAnimationFrame trong cửa sổ trượt 5 giây; không móc vào Pixi.
 */

const WINDOW_MS = 5000;
const REFRESH_MS = 500;

interface FrameSample {
  at: number;
  duration: number;
}

export function installPerfOverlay(): void {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('perf') !== '1') return;

  const samples: FrameSample[] = [];
  let previous = 0;
  let lastPaint = 0;
  let raf = 0;

  const root = document.createElement('section');
  root.setAttribute('aria-label', 'Đo hiệu năng');
  root.style.cssText = 'position:fixed;z-index:9999;top:calc(env(safe-area-inset-top,0px) + 8px);left:calc(env(safe-area-inset-left,0px) + 8px);width:min(255px,calc(100vw - 16px));font:12px/1.4 system-ui,sans-serif;color:#fff;background:rgba(25,20,17,.92);border:1px solid #c8a77c;border-radius:8px;box-shadow:0 2px 10px #0008;pointer-events:auto;touch-action:none;';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#3b2618;border-radius:8px 8px 0 0;font-weight:700;';
  header.innerHTML = '<span>Đo hiệu năng · 5 giây</span>';
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:5px;';
  const body = document.createElement('div');
  body.style.cssText = 'padding:7px 9px;white-space:pre-line;font-variant-numeric:tabular-nums;';

  const makeButton = (label: string, title: string, handler: () => void) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.style.cssText = 'border:0;border-radius:4px;padding:3px 6px;background:#f6e3c4;color:#3b2a1f;font:600 11px system-ui;';
    button.addEventListener('click', (event) => { event.stopPropagation(); handler(); });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
    return button;
  };
  const restore = makeButton('FPS', 'Mở bảng đo hiệu năng', () => { root.style.display = 'block'; restore.style.display = 'none'; });
  restore.style.cssText += 'display:none;position:fixed;z-index:9999;top:50%;left:calc(env(safe-area-inset-left,0px) + 8px);transform:translateY(-50%);pointer-events:auto;touch-action:none;';
  const hide = makeButton('Ẩn', 'Thu gọn bảng đo', () => { root.style.display = 'none'; restore.style.display = 'block'; });
  const reset = makeButton('Đặt lại', 'Xóa số liệu đang ghi', () => { samples.length = 0; previous = 0; });
  const copy = makeButton('Sao chép', 'Sao chép số liệu để gửi', () => {
    void navigator.clipboard?.writeText(body.textContent ?? '')
      .then(() => { copy.textContent = 'Đã chép'; setTimeout(() => { copy.textContent = 'Sao chép'; }, 1200); })
      .catch(() => { copy.textContent = 'Không chép được'; });
  });
  actions.append(reset, copy, hide);
  header.append(actions);
  root.append(header, body);
  document.body.append(root, restore);

  // Rebase sau khi đổi tab để việc trình duyệt giảm tốc nền không bị tính là giật.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') previous = 0; });

  const frame = (now: number) => {
    if (previous > 0 && document.visibilityState === 'visible') samples.push({ at: now, duration: now - previous });
    previous = now;
    while (samples.length && now - samples[0].at > WINDOW_MS) samples.shift();
    if (now - lastPaint >= REFRESH_MS) {
      lastPaint = now;
      const intervals = samples.map((item) => item.duration).sort((a, b) => a - b);
      const mean = intervals.length ? intervals.reduce((sum, n) => sum + n, 0) / intervals.length : 0;
      const p99 = intervals.length ? intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.99))] : 0;
      const over33 = intervals.filter((n) => n > 33.3).length;
      const over50 = intervals.filter((n) => n > 50).length;
      const canvas = document.querySelector('canvas');
      const gl = canvas ? (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) : null;
      const renderer = canvas ? (gl ? 'WebGL' : 'Canvas/khác') : '—';
      body.textContent = `FPS TB: ${mean ? (1000 / mean).toFixed(1) : 'đang đo…'}   ·   p1: ${p99 ? (1000 / p99).toFixed(1) : '—'}\nKhung >33 ms: ${over33}   ·   >50 ms: ${over50}\nSố mẫu: ${intervals.length} / 5 giây\n${renderer} · DPR ${window.devicePixelRatio || 1} · ${screen.width}×${screen.height}`;
    }
    raf = window.requestAnimationFrame(frame);
  };
  raf = window.requestAnimationFrame(frame);
  window.addEventListener('pagehide', () => window.cancelAnimationFrame(raf), { once: true });
}
