import type React from 'react';

/** Style dùng chung của bảng Cửa hàng tiện lợi và các tab tách riêng. */
export const st: Record<string, React.CSSProperties> = {
  event: { display: 'grid', gap: 6, padding: 10, borderRadius: 10, background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.5)' },
  chart: { display: 'flex', alignItems: 'stretch', gap: 2, height: 140, padding: '6px 0' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 },
  bars: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1 },
  bar: { flex: 1, minHeight: 1, borderRadius: '2px 2px 0 0' },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 4 },
  title: { margin: '0 0 8px' },
  sub: { fontSize: 13, opacity: 0.8, margin: '4px 0' },
  warn: { fontSize: 13, color: '#e67e22', margin: '2px 0' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  badge: { padding: '4px 10px', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 12 },
  tabs: { display: 'flex', gap: 6, margin: '4px 0 12px', flexWrap: 'wrap' },
  tab: { padding: '6px 10px', borderRadius: 8, border: 'none', color: '#222', cursor: 'pointer' },
  shift: { display: 'grid', gap: 6, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, background: '#3a3a4d', borderRadius: 10 },
  primary: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, cursor: 'pointer' },
  btn: { padding: '6px 10px', borderRadius: 8, border: 'none', background: '#fff', color: '#222', cursor: 'pointer' },
};
