import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { butcherValueToday, recentMeatRevenue } from '../../data/butcherValue';
import type { BizState } from '../../data/biz';
import { Callout, styles } from './shared';

/** GĐ927: tách khỏi MorningPanel (nguyên văn thẻ người bán thịt cá + thẻ hụi). */
export function ButcherCard({ butcherV, recentMeat, meatMissed }: { butcherV: ReturnType<typeof butcherValueToday>; recentMeat: ReturnType<typeof recentMeatRevenue>; meatMissed: number }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone={butcherV.present ? 'warn' : 'danger'} strong={!butcherV.present} style={{ marginBottom: 8 }}
      title={<>🔪 {butcherV.present
        ? `Người bán thịt cá ${butcherV.skill}★ trực hôm nay — bán được ~${butcherV.pct}% nhu cầu thịt cá`
        : 'Không có người bán thịt cá trực hôm nay — khách chỉ mua ~22% nhu cầu thịt cá'}</>}
      actions={
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
            {butcherV.present ? '👥 Nâng/bồi dưỡng người bán thịt cá →' : '👥 Xếp người bán thịt cá →'}
          </button>
          <button onClick={() => openPanel({ type: 'analytics' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
            📊 Xem sổ thịt cá →
          </button>
        </div>
      }>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {butcherV.present
          ? `Hệ số cầu ${butcherV.factor.toFixed(2).replace('.', ',')} so với mốc ${butcherV.maxFactor.toFixed(2).replace('.', ',')} (người bán 5★).`
          : 'Quầy thịt cá (650k) đang hầu như đứng im — người bán thịt cá làm tăng gấp ~4,6 lần nhu cầu ban đầu.'}
      </div>
      {recentMeat.revenue > 0 && meatMissed > 0 && (
        <div style={{ fontSize: 12, marginTop: 2, color: '#f1c40f' }}>
          💸 Gần đây thịt cá thu ~{formatMoney(recentMeat.revenue)}/ngày{butcherV.present
            ? ` — lên 5★ thêm ~${formatMoney(meatMissed)}/ngày`
            : ` — thuê người bán 5★ có thể thêm ~${formatMoney(meatMissed)}/ngày`}
        </div>
      )}
    </Callout>
  );
}

export function HuiCard({ hui }: { hui: NonNullable<BizState['hui']> }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
      <b style={styles.cardTitle}>🤝 Đang góp hụi {formatMoney(hui.daily)}/ngày</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        Đã góp {hui.paidDays}/{hui.members} ngày{!hui.received && ` · ngày ${hui.turnDay} tới lượt hốt ${formatMoney(hui.daily * hui.members)}`}.
      </div>
    </div>
  );
}
