import { CATEGORIES, type Product } from '../../data/products';
import type * as React from 'react';

export const CATEGORY_ORDER = Object.keys(CATEGORIES);

export const byCategory = (a: Product, b: Product) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

/** Hạn gần nhất của hàng đang bày: đỏ khi còn 1 ngày, cam khi còn 2–3 ngày. */
export function LifeBadge({ life, sale }: { life: number | null; sale: number }) {
  if (life === null) return <span style={{ width: 64 }} />;
  const color = life <= 1 ? '#d63031' : life <= 3 ? '#e17055' : undefined;
  return (
    <span style={{ minWidth: 64, fontSize: 12, color, opacity: color ? 1 : 0.7, whiteSpace: 'nowrap' }} title={sale ? `Lô cận hạn, tự bán giảm ${sale * 100}%` : 'Hạn dùng còn lại của lô cũ nhất'}>
      ⏳ {life} ngày{sale > 0 && <b> −{sale * 100}%</b>}
    </span>
  );
}

export function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ ...styles.card, display: 'block', padding: '6px 10px' }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{icon} {label}</div>
      <b style={{ fontSize: 13 }}>{value}</b>
    </div>
  );
}

export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const starColor = (n: number) => (n >= 4 ? '#2ecc71' : n === 3 ? '#f1c40f' : '#e74c3c');

export function Footer({ onClose, closeLabel = 'Đóng', children }: { onClose: () => void; closeLabel?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      {children}
      <button style={{ ...styles.btn, background: '#f1c40f' }} onClick={onClose}>{closeLabel}</button>
    </div>
  );
}

export const Swatch = ({ color }: { color: number }) => (
  <span style={{
    display: 'inline-block', width: 12, height: 12, borderRadius: 3, verticalAlign: 'middle',
    background: `#${color.toString(16).padStart(6, '0')}`, border: '1px solid #0004',
  }} />
);

export const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    pointerEvents: 'auto', position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)',
  },
  panel: {
    background: '#2b2b3a', color: '#fff', borderRadius: 12, padding: '18px 22px',
    // Chừa đáy màn hình cho dock nút của HUD — hết cảnh dãy nút cuối panel bị dock đè lên
    minWidth: 'min(360px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 108px)', overflow: 'auto',
    boxSizing: 'border-box',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  title: { margin: '0 0 4px' },
  sub: { margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 14, textAlign: 'right' },
  left: { textAlign: 'left', padding: '6px 8px 6px 0' },
  row: { display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' },
  select: { flex: 1 },
  card: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#3a3a4d', borderRadius: 8 },
  btn: { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginLeft: 4, fontSize: 13 },
  close: {
    position: 'sticky', top: 0, float: 'right', zIndex: 1, width: 30, height: 30, marginLeft: 8,
    border: 'none', borderRadius: 15, cursor: 'pointer', fontSize: 15, background: '#fff', color: '#222',
  },
};
