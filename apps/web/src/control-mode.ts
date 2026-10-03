import { useSyncExternalStore } from 'react';

/** auto: theo thiết bị (cảm ứng chính → hiện nút); touch: luôn hiện cần xoay + nút; keyboard: chỉ phím/chuột. */
export type ControlMode = 'auto' | 'touch' | 'keyboard';

const STORAGE_KEY = 'tiem-tap-hoa.control-mode';
const MODES: readonly ControlMode[] = ['auto', 'touch', 'keyboard'];
const listeners = new Set<() => void>();

function read(): ControlMode {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return MODES.includes(stored as ControlMode) ? (stored as ControlMode) : 'auto';
  } catch { return 'auto'; }
}

let current: ControlMode = read();

/** CSS đọc thuộc tính này trên <html> để hiện/ẩn `.touch-controls`. */
export function applyControlMode(mode: ControlMode = current): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.controls = mode;
}

export function getControlMode(): ControlMode { return current; }

export function setControlMode(mode: ControlMode): void {
  current = mode;
  // localStorage có thể bị chặn (chế độ riêng tư): vẫn áp dụng cho phiên hiện tại.
  try { globalThis.localStorage?.setItem(STORAGE_KEY, mode); } catch { /* bỏ qua */ }
  applyControlMode(mode);
  listeners.forEach((fn) => fn());
}

export function useControlMode(): ControlMode {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, getControlMode);
}

applyControlMode();
