import type { ReactNode } from 'react';
import { formatMoney, productById, fmtMul } from '../../data/products';
import { festivalStock, type Festival } from '../../data/calendar';
import { prepItems, prepBonus, PREP_MIN_QTY } from '../../data/festivalPrep';
import type { festivalValue } from '../../data/festivalValue';
import { styles } from './shared';

type FV = ReturnType<typeof festivalValue>;
const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;

/** GĐ937: tách khỏi MorningPanel (nguyên văn thẻ lễ hội ĐANG diễn ra). */
export function FestivalNowCard({ festival, level, haveStock, fv, fvDelta }: {
  festival: Festival; level: number; haveStock: (id: string) => boolean; fv: FV; fvDelta: ReactNode;
}) {
  const stock = festivalStock(festival, level);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
      <b style={styles.cardTitle}>{festival.icon} {festival.name} đang diễn ra</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        👥 khách {pct(festival.traffic)}{festival.cost !== 1 && ` · 💰 giá nhập ${pct(festival.cost)}`}
        {festival.tolerance && ' · 😤 khách chịu giá cao'}
      </div>
      {stock.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Hàng nên bày sẵn: {stock.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ kho không có'}`).join(', ')}
        </div>
      )}
      {fv && fvDelta && (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          🎉 ước thêm {fvDelta}
        </div>
      )}
    </div>
  );
}

/** GĐ937: tách khỏi MorningPanel (nguyên văn thẻ lễ hội SẮP tới). */
export function FestivalSoonCard({ soon, level, storage, fv, fvDelta }: {
  soon: { festival: Festival; inDays: number }; level: number; storage: Record<string, number>; fv: FV; fvDelta: ReactNode;
}) {
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
      <b style={styles.cardTitle}>⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        🎊 Đón lễ: trữ sẵn{' '}
        {prepItems(soon.festival, level).map((id, i) => (
          <span key={id}>
            {i > 0 && ', '}
            {productById(id).name}
            {(storage[id] ?? 0) >= PREP_MIN_QTY
              ? <b style={{ color: '#2ecc71' }}> ✓</b>
              : <b style={{ color: '#f1c40f' }}> ⚠️ còn {Math.max(0, PREP_MIN_QTY - (storage[id] ?? 0))} thiếu</b>}
          </span>
        ))}
        <span style={{ opacity: 0.7 }}> · đủ trước {soon.inDays === 1 ? 'ngày mai' : 'lễ'} → <b style={{ color: '#2ecc71' }}>+{formatMoney(prepBonus(soon.festival, level))}</b> đón lễ</span>
      </div>
      {fv && (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          <b>Còn {fv.inDays} ngày:</b> khách ×{fmtMul(fv.traffic)} ({fvDelta})
          {fv.cost > 1 && <> · giá nhập +{Math.round((fv.cost - 1) * 100)}% (bán đắt vẫn đông)</>}
        </div>
      )}
    </div>
  );
}
