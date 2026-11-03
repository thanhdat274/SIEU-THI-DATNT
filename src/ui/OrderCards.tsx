import type { CSSProperties } from 'react';
import { productById } from '../data/products';
import type { prodSuggestToday } from '../data/prodSuggest';

/** GĐ948: thẻ gợi ý giữa OrderPanel (tự làm / hàng hot / nhập gấp), tách nguyên văn. */
const banner: CSSProperties = { background: 'rgba(225, 112, 85, 0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8 };

export function ProdSuggCard({ items, onOpen }: { items: ReturnType<typeof prodSuggestToday>; onOpen: (panel: (typeof items)[number]['panel']) => void }) {
  return (
    <div style={{ ...banner, background: 'rgba(46, 204, 113, 0.12)', outline: '1px solid rgba(46,204,113,0.35)' }}>
      <b>🌾 Nên hôm nay — tự làm khi nên</b>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {items.map((s, i) => (
          <button key={i} onClick={() => onOpen(s.panel)}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span style={{ minWidth: 130 }}>{s.icon} {s.label} →</span>
            <span style={{ opacity: 0.85 }}>{s.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function HotWeekBanner({ hot, hotNextWeek, nextSupplierUnlock }: { hot: string[]; hotNextWeek: string[]; nextSupplierUnlock?: number }) {
  return (
    <div style={banner}>
      🔥 Tuần này khách săn: <b>{hot.map((id) => productById(id).name).join(', ')}</b>
      {hotNextWeek.length > 0 && (
        <span style={{ opacity: 0.85 }} title="Tuần mới bắt đầu Thứ 2 — nhập sẵn hôm nay để không lỡ nhịp">
          {' '}· 🔮 Tuần mai: <b>{hotNextWeek.map((id) => productById(id).name).join(', ')}</b>
        </span>
      )}
      {nextSupplierUnlock !== undefined && (
        <span style={{ opacity: 0.75 }}> · Mối mới mở ở cấp {nextSupplierUnlock}</span>
      )}
    </div>
  );
}

export function UrgentCard({ rows }: { rows: { id: string; reason: string; suggest: number }[] }) {
  return (
    <div style={{ ...banner, background: 'rgba(214, 48, 49, 0.16)' }}>
      <b>🚨 Cần nhập gấp</b>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ minWidth: 130 }}>{productById(r.id).name}</span>
            <span style={{ opacity: 0.85 }}>{r.reason}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.75 }}>✨ nên nhập {r.suggest} thùng</span>
          </div>
        ))}
      </div>
    </div>
  );
}
