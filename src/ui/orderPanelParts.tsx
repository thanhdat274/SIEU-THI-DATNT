import type React from 'react';
import type { AssessLevel, BuyTone, Dir } from '../data/procure';

// GĐ57 "Mua khi rẻ" + GĐ103-2 dự phóng: nhãn/màu thuần đọc, không đổi kinh tế.

export const BUY_TONE_LABEL: Record<BuyTone, string> = { cheap: 'nửa rẻ', normal: 'giữa khung', pricey: 'nửa đắt' };
export const BUY_TONE_ICON: Record<BuyTone, string> = { cheap: '📉 rẻ', normal: '• thường', pricey: '📈 đắt' };
export const BUY_TONE_COLOR: Record<BuyTone, string> = { cheap: '#55efc4', normal: '#dfe6e9', pricey: '#ff7675' };
export const DIR_WORD: Record<Dir, string> = { cheaper: 'mai rẻ hơn', pricier: 'mai đắt hơn', flat: 'mai tương đương' };

export const ASSESS_STYLE: Record<AssessLevel, React.CSSProperties> = {
  ok: { color: '#bbb', opacity: 0.8 },
  near: { color: '#f1c40f' },
  over: { color: '#ff7675', background: 'rgba(231, 76, 60, 0.12)', borderRadius: 4, padding: '1px 6px' },
};


/** Thanh đo: phần đã có (base, đậm) + phần của đơn này (sáng), đỏ khi vượt. */
export function Meter({ label, used, max, base = 0, text }: { label: string; used: number; max: number; base?: number; text: string }) {
  const pct = (v: number) => `${Math.min(100, max > 0 ? (v / max) * 100 : 100)}%`;
  const over = used > max;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <b>{label}</b><span style={{ opacity: 0.8, color: over ? '#ff7675' : undefined }}>{text}</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#ffffff22', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: pct(used), background: over ? '#e67e22' : '#f1c40f' }} />
        <div style={{ position: 'absolute', inset: 0, width: pct(base), background: '#2ecc71' }} />
      </div>
    </div>
  );
}
