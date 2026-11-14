import type { CSSProperties } from 'react';
import { productById } from '../data/products';
import type { prodSuggestToday } from '../data/prodSuggest';
import { t } from '../core/i18n';

/** GĐ948: thẻ gợi ý giữa OrderPanel (tự làm / hàng hot / nhập gấp), tách nguyên văn. */
const banner: CSSProperties = { background: 'rgba(225, 112, 85, 0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8 };

export function ProdSuggCard({ items, onOpen }: { items: ReturnType<typeof prodSuggestToday>; onOpen: (panel: (typeof items)[number]['panel']) => void }) {
  return (
    <div style={{ ...banner, background: 'rgba(46, 204, 113, 0.12)', outline: '1px solid rgba(46,204,113,0.35)' }}>
      <b>{t('order.nen_hom_nay_tu_lam_khi')}</b>
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
      {t('order.tuan_nay_khach_san')}{' '}<b>{hot.map((id) => productById(id).name).join(', ')}</b>
      {hotNextWeek.length > 0 && (
        <span style={{ opacity: 0.85 }} title={t('order.tuan_moi_bat_dau_thu_2')}>
          {' '}{t('order.tuan_mai')}{' '}<b>{hotNextWeek.map((id) => productById(id).name).join(', ')}</b>
        </span>
      )}
      {nextSupplierUnlock !== undefined && (
        <span style={{ opacity: 0.75 }}>{' '}{t('order.moi_moi_mo_o_cap')}{' '}{nextSupplierUnlock}</span>
      )}
    </div>
  );
}

export function UrgentCard({ rows }: { rows: { id: string; reason: string; suggest: number }[] }) {
  return (
    <div style={{ ...banner, background: 'rgba(214, 48, 49, 0.16)' }}>
      <b>{t('order.can_nhap_gap')}</b>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ minWidth: 130 }}>{productById(r.id).name}</span>
            <span style={{ opacity: 0.85 }}>{r.reason}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.75 }}>{t('order.nen_nhap')}{' '}{r.suggest}{' '}{t('order.thung_2')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
