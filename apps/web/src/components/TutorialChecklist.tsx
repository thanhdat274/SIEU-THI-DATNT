import React, { useState } from 'react';
import type { TutorialItem } from '@game/core';

const KEY = 'tiem-tap-hoa:tutorial-hidden';

const readHidden = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};
const writeHidden = (hidden: boolean): void => {
  try { if (hidden) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* bỏ qua: trình duyệt chặn lưu trữ */ }
};

/** Checklist nhỏ; trạng thái từng mục đến từ save, chỉ việc ẩn/hiện được nhớ cục bộ. */
export const TutorialChecklist: React.FC<{ items: TutorialItem[] }> = ({ items }) => {
  const [hidden, setHidden] = useState(readHidden);
  const remaining = items.filter(item => !item.done);
  if (remaining.length === 0) return null;
  if (hidden) {
    return <button type="button" className="tutorial-chip" onClick={() => { setHidden(false); writeHidden(false); }} aria-label="Hiện checklist hướng dẫn" style={{ position: 'fixed', right: 8, bottom: 62, zIndex: 20 }}>Hướng dẫn ({remaining.length})</button>;
  }
  const next = remaining[0];
  return <aside aria-label="Checklist hướng dẫn" style={{ position: 'fixed', right: 8, bottom: 62, zIndex: 20, maxWidth: 240, maxHeight: 'calc(50vh - 62px)', overflowY: 'auto', padding: 10, background: 'var(--paper, #f3e8d3)', border: '2px solid var(--wood-dark, #5a3b24)', color: 'var(--ink, #2b2118)', fontSize: 13 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <strong>Hướng dẫn ({items.length - remaining.length}/{items.length})</strong>
      <button type="button" onClick={() => { setHidden(true); writeHidden(true); }} aria-label="Ẩn checklist hướng dẫn">Ẩn</button>
    </div>
    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
      {items.map(item => <li key={item.id} style={{ textDecoration: item.done ? 'line-through' : undefined, opacity: item.done ? 0.6 : 1, fontWeight: item === next ? 700 : 400 }}>{item.label}</li>)}
    </ul>
  </aside>;
};
