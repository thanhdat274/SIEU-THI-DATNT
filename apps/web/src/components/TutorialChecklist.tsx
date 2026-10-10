import React, { useState } from 'react';
import type { TutorialItem } from '@game/core';

const KEY = 'tiem-tap-hoa:tutorial-hidden';

const readHidden = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};
const writeHidden = (hidden: boolean): void => {
  try { if (hidden) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* bỏ qua: trình duyệt chặn lưu trữ */ }
};

// Neo ở góc trên trái, ngay dưới khối UI phía trên (--top-ui-height do responsive.ts đo; --account-chip-h chừa chỗ nút tài khoản nổi ở màn thấp).
// Hai góc dưới dành cho cần xoay ảo (trái) và nút tương tác/zoom (phải).
const TOP_ANCHOR = 'calc(var(--top-ui-height, 76px) + var(--space-2, 8px) + var(--account-chip-h, 0px))';

/** Checklist nhỏ; mặc định chỉ hiện bước tiếp theo, bấm để mở cả danh sách. Trạng thái từng mục đến từ save, chỉ việc ẩn/hiện được nhớ cục bộ. */
export const TutorialChecklist: React.FC<{ items: TutorialItem[] }> = ({ items }) => {
  const [hidden, setHidden] = useState(readHidden);
  const [expanded, setExpanded] = useState(false);
  const anchor: React.CSSProperties = { position: 'fixed', left: 'max(8px, var(--safe-l, 0px))', top: TOP_ANCHOR, zIndex: 20 };
  const remaining = items.filter(item => !item.done);
  if (remaining.length === 0) return null;
  const doneCount = items.length - remaining.length;
  if (hidden) {
    return <button type="button" className="tutorial-chip" onClick={() => { setHidden(false); writeHidden(false); }} aria-label="Hiện checklist hướng dẫn" style={anchor}>Hướng dẫn ({remaining.length})</button>;
  }
  const next = remaining[0];
  const box: React.CSSProperties = { ...anchor, width: 'min(200px, calc(100vw - 16px))', padding: 8, background: 'var(--color-panel)', border: '2px solid var(--color-green)', color: 'var(--color-text)', boxShadow: '2px 2px 0 rgba(38, 53, 43, 1)', fontSize: 'var(--fs-sm, 0.8rem)', opacity: 0.98 };
  return <aside aria-label="Checklist hướng dẫn" className="tutorial-checklist" style={box}>
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
