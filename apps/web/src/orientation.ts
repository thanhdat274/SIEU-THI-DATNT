/**
 * Khóa màn hình ngang cho chế độ cảm ứng (PWA/điện thoại/máy tính bảng). Chỉ là nỗ lực "tốt nhất có thể":
 * trình duyệt/hệ điều hành có thể từ chối (iOS Safari không hỗ trợ, Chrome yêu cầu fullscreen/PWA đã cài và/hoặc thao tác của người dùng,
 * khóa xoay của hệ điều hành đang bật...). Thất bại KHÔNG phải lỗi: `RotateOverlay` (CSS, theo `orientation: portrait` + `data-input=touch`) là phương án dự phòng.
 * Không gọi trong vòng lặp render; chỉ gọi khi khởi tạo, khi vào game, lần chạm đầu tiên (nếu cần cử chỉ) và khi quay lại từ nền.
 */
type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

const RETRY_MIN_GAP_MS = 5000;
let lastAttempt = 0;
let installed = false;

function wantsLandscapeLock(): boolean {
  if (typeof document === 'undefined') return false;
  // Máy tính (chuột) không bị khóa hướng.
  return document.documentElement.dataset.input === 'touch';
}

export async function lockLandscape(): Promise<boolean> {
  if (!wantsLandscapeLock()) return false;
  const orientation = (typeof screen !== 'undefined' ? screen.orientation : undefined) as LockableOrientation | undefined;
  if (!orientation?.lock) return false;
  lastAttempt = Date.now();
  try {
    await orientation.lock('landscape');
    return true;
  } catch {
    // Bị từ chối (không phải fullscreen/PWA, cần cử chỉ, khóa xoay của hệ điều hành...): rơi về RotateOverlay.
    return false;
  }
}

/** Thử khóa khi khởi tạo; nếu bị từ chối thì thử lại đúng một lần ở lần chạm đầu tiên, và khi quay lại từ nền (cách nhau ≥ 5s). */
export function installOrientationLock(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  void lockLandscape().then((ok) => {
    if (ok) return;
    window.addEventListener('pointerdown', () => { void lockLandscape(); }, { once: true, passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastAttempt > RETRY_MIN_GAP_MS) void lockLandscape();
  });
}
