export type AppUpdateResult = 'unsupported' | 'up-to-date' | 'updating' | 'offline' | 'error';

/**
 * Kiểm tra bản mới của PWA thủ công. SW mới tự skipWaiting/activate và main.tsx tự reload khi activate,
 * nên 'updating' nghĩa là trang sắp được tải lại với bản mới.
 */
export async function checkForAppUpdate(): Promise<AppUpdateResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  if (!navigator.onLine) return 'offline';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'unsupported';
    await reg.update();
    return reg.installing || reg.waiting ? 'updating' : 'up-to-date';
  } catch {
    return 'error';
  }
}
