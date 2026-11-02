import type React from 'react';

/** Style dùng chung của các tab Kinh doanh (tách từ BusinessPanel, GĐ876). */
export const card: React.CSSProperties = { background: '#3a3a4d', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' };
export const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 };
export const pill: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' };
export const iconTile: React.CSSProperties = { width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 };
export const btn: React.CSSProperties = { marginLeft: 6, padding: '4px 10px', borderRadius: 6, border: 0, cursor: 'pointer', background: '#f1c40f', fontWeight: 600 };
export const sub: React.CSSProperties = { fontSize: 12, opacity: 0.75 };
export const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };
