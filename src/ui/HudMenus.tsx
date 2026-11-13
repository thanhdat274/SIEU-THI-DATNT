import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ToolDef } from './HudToolButton';

const MoreMenuBody = lazy(() => import('./HudMoreBody').then((m) => ({ default: m.MoreMenuBody }))); // GĐ651: ruột menu Thêm
const SettingsPanel = lazy(() => import('./SettingsPanel').then((m) => ({ default: m.SettingsPanel })));

/** GĐ951: menu Thêm + menu tài khoản của Hud, tách nguyên văn. */
/** Các bảng ít dùng gom vào một nút để thanh công cụ vừa màn hình; có việc cần xem thì hiện chấm báo. */
export function MoreMenu({ tools, level, onHelp }: { tools: ToolDef[]; level: number; onHelp: () => void }) {
  const { open, setOpen, ref } = usePopover();
  const [keys, setKeys] = useState(false);
  // Panel Cài đặt sống ở đây (không trong menu) để bấm trong panel không bị tính là "bấm ra ngoài" làm đóng nó.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const alert = tools.some((t) => t.badge && !(t.lock !== undefined && level < t.lock) && !t.badge.includes('★'));
  return (
    <div className="hud-pop" ref={ref}>
      <button className="hud-tool" aria-haspopup="menu" aria-expanded={open} title="Thêm" onClick={() => { setOpen(!open); setKeys(false); }}>
        <span className="hud-tool-icon" aria-hidden="true">⋯</span>
        <span>Thêm</span>
        {alert && <span className="hud-badge hud-dot" aria-label="Có việc cần xem" />}
      </button>
      {open && (
        <div className="hud-menu hud-more" role="menu">
          <Suspense fallback={null}><MoreMenuBody tools={tools} level={level} onHelp={onHelp} keys={keys} setKeys={setKeys} setOpen={setOpen} onSettings={() => { setSettingsOpen(true); setOpen(false); }} /></Suspense>
        </div>
      )}
      {settingsOpen && <Suspense fallback={null}><SettingsPanel onClose={() => setSettingsOpen(false)} /></Suspense>}
    </div>
  );
}

/** Đóng popover khi bấm ra ngoài hoặc nhấn Esc. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export function AccountMenu({ name, photo, status, items }: {
  name: string; photo: string | null; status: string;
  items: { label: string; on: () => unknown; danger?: boolean; /** GĐ160: dòng nhỏ giải thích ngay dưới mục, không bấm được */ hint?: string }[];
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="hud-pop" ref={ref}>
      <button className="hud-chip hud-account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : <span className="hud-avatar">{name[0]}</span>}
        <span>
          <b>{name}</b>
          <small>{status}</small>
        </span>
        <span className="hud-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="hud-menu" role="menu">
          {items.map((it) => (
            <Fragment key={it.label}>
              <button role="menuitem" className={it.danger ? 'danger' : undefined} onClick={() => { setOpen(false); it.on(); }}>
                {it.label}
              </button>
              {it.hint && <div className="hud-menu-hint">{it.hint}</div>}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
