import { useEffect, useState } from 'react';
import { t } from '../core/i18n';

/**
 * GĐ1821 — Hộp xác nhận chung của game, thay cho `window.confirm` (hộp xám của trình duyệt, hiện
 * tên miền, lạc tông). Gọi `askConfirm(...)` ở bất kỳ đâu → Promise<boolean>; `<ConfirmHost/>`
 * gắn một lần trong HUD vẽ modal cùng phong cách bảng (nền --hud-bg-solid, nút vàng/đỏ).
 */
export interface ConfirmOptions {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
  /** Hành động phá hủy (xóa, cho nghỉ...) → nút xác nhận màu đỏ. */
  danger?: boolean;
}
interface Pending extends ConfirmOptions { message: string; resolve: (ok: boolean) => void }

let current: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function askConfirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => { current = { message, ...opts, resolve }; emit(); });
}

function close(ok: boolean) {
  const p = current;
  current = null;
  emit();
  p?.resolve(ok);
}

export function ConfirmHost() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      else if (e.key === 'Enter') { e.stopPropagation(); close(true); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const p = current;
  if (!p) return null;
  return (
    <div className="hud-confirm-backdrop" onClick={() => close(false)}>
      <div className="hud-confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="hud-confirm-title">{p.title ?? (p.danger ? t('hud.xac_nhan') : t('hud.xac_nhan_2'))}</div>
        <div className="hud-confirm-msg">{p.message}</div>
        <div className="hud-confirm-actions">
          <button className="hud-confirm-cancel" onClick={() => close(false)}>{p.cancelLabel ?? t('hud.huy_2')}</button>
          <button className={p.danger ? 'hud-confirm-ok danger' : 'hud-confirm-ok'} autoFocus onClick={() => close(true)}>{p.okLabel ?? t('hud.dong_y')}</button>
        </div>
      </div>
    </div>
  );
}
