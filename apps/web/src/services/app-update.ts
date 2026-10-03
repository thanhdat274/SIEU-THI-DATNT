/**
 * Cập nhật PWA có chủ đích: SW mới chỉ "chờ" (không skipWaiting tự động) cho tới khi người chơi bấm cập nhật,
 * để còn lưu tiến trình trước khi tải lại trang.
 */
export type AppUpdateResult = 'unsupported' | 'up-to-date' | 'available' | 'offline' | 'error';

type Listener = () => void;
const listeners = new Set<Listener>();
let waitingWorker: ServiceWorker | null = null;
let beforeApply: (() => Promise<boolean>) | null = null;

function setWaiting(worker: ServiceWorker | null): void {
  if (waitingWorker === worker) return;
  waitingWorker = worker;
  listeners.forEach(listener => listener());
}

export const subscribeAppUpdate = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const isAppUpdateReady = (): boolean => waitingWorker !== null;

/** App đăng ký bước lưu (local/cloud) chạy trước khi tải lại. Trả false để hủy cập nhật. */
export function setBeforeApplyUpdate(handler: (() => Promise<boolean>) | null): void {
  beforeApply = handler;
}

/** Gọi một lần ở main.tsx (chỉ production). */
export function watchAppUpdates(reg: ServiceWorkerRegistration): void {
  const track = (worker: ServiceWorker | null) => {
    if (!worker) return;
    const onState = () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
      if (worker.state === 'redundant' && waitingWorker === worker) setWaiting(null);
    };
    worker.addEventListener('statechange', onState);
    onState();
  };
  if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
  track(reg.installing);
  reg.addEventListener('updatefound', () => track(reg.installing));
  // App PWA có thể mở nhiều ngày: kiểm tra định kỳ và khi quay lại tab.
  const recheck = () => { if (navigator.onLine) void reg.update().catch(() => {}); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recheck(); });
  window.setInterval(recheck, 30 * 60 * 1000);
}

export async function checkForAppUpdate(): Promise<AppUpdateResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  if (!navigator.onLine) return 'offline';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'unsupported';
    await reg.update();
    const installing = reg.installing;
    if (installing) {
      await new Promise<void>(resolve => {
        const timer = window.setTimeout(resolve, 20000);
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' || installing.state === 'redundant') { window.clearTimeout(timer); resolve(); }
        });
      });
    }
    return reg.waiting || waitingWorker ? 'available' : 'up-to-date';
  } catch {
    return 'error';
  }
}

/** Lưu tiến trình rồi kích hoạt SW mới và tải lại. Trả false nếu bước lưu từ chối. */
export async function applyAppUpdate(): Promise<boolean> {
  const worker = waitingWorker;
  if (!worker) return false;
  if (beforeApply && !(await beforeApply())) return false;
  let reloaded = false;
  const reload = () => { if (!reloaded) { reloaded = true; window.location.reload(); } };
  navigator.serviceWorker.addEventListener('controllerchange', reload);
  worker.postMessage({ type: 'SKIP_WAITING' });
  window.setTimeout(reload, 4000);
  return true;
}
