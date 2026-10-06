import React, { useEffect, useState } from 'react';
import type { TutorialItem } from '@game/core';

const KEY = 'tiem-tap-hoa:tutorial-hidden';

const readHidden = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};
const writeHidden = (hidden: boolean): void => {
  try { if (hidden) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* bỏ qua: trình duyệt chặn lưu trữ */ }
};

// Neo ở góc trên trái, ngay dưới HUD: hai góc dưới dành cho cần xoay ảo (trái) và nút tương tác/zoom (phải).
// Chiều cao HUD đổi theo cỡ màn hình (có thể xuống dòng) nên đo thật thay vì số cố định.
const useHudBottom = (): number => {
  const [bottom, setBottom] = useState(76);
  useEffect(() => {
    const hud = document.querySelector<HTMLElement>('.game-hud');
    if (!hud) return;
    const measure = () => setBottom(Math.ceil(hud.getBoundingClientRect().bottom) + 8);
    measure();
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver === 'undefined') return () => window.removeEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(hud);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return bottom;
};

/** Checklist nhỏ; mặc định chỉ hiện bước tiếp theo, bấm để mở cả danh sách. Trạng thái từng mục đến từ save, chỉ việc ẩn/hiện được nhớ cục bộ. */
export const TutorialChecklist: React.FC<{ items: TutorialItem[] }> = ({ items }) => {
  const [hidden, setHidden] = useState(readHidden);
  const [expanded, setExpanded] = useState(false);
  const top = useHudBottom();
  const anchor: React.CSSProperties = { position: 'fixed', left: 'max(8px, var(--safe-l, 0px))', top, zIndex: 20 };
  const remaining = items.filter(item => !item.done);
  if (remaining.length === 0) return null;
  const doneCount = items.length - remaining.length;
  if (hidden) {
    return <button type="button" className="tutorial-chip" onClick={() => { setHidden(false); writeHidden(false); }} aria-label="Hiện checklist hướng dẫn" style={anchor}>Hướng dẫn ({remaining.length})</button>;
  }
  const next = remaining[0];
  const box: React.CSSProperties = { ...anchor, width: 'min(200px, calc(100vw - 16px))', padding: 8, background: 'var(--paper, #f3e8d3)', border: '2px solid var(--wood-dark, #5a3b24)', color: 'var(--ink, #2b2118)', fontSize: 13, opacity: 0.96 };
  return <aside aria-label="Checklist hướng dẫn" style={box}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded} style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
        <strong>Hướng dẫn ({doneCount}/{items.length}) {expanded ? '▾' : '▸'}</strong>
        {!expanded && <div style={{ marginTop: 2 }}>{next.label}</div>}
      </button>
      <button type="button" onClick={() => { setHidden(true); writeHidden(true); }} aria-label="Ẩn checklist hướng dẫn">Ẩn</button>
    </div>
    {expanded && <ul style={{ margin: '6px 0 0', paddingLeft: 18, maxHeight: 'calc(var(--dialog-avail-h) * 0.4)', overflowY: 'auto' }}>
      {items.map(item => <li key={item.id} style={{ textDecoration: item.done ? 'line-through' : undefined, opacity: item.done ? 0.6 : 1, fontWeight: item === next ? 700 : 400 }}>{item.label}</li>)}
    </ul>}
  </aside>;
};
