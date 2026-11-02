import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import type { MarketClearValue } from '../../data/chophien';
import { Callout, styles } from './shared';

/** GĐ921: tách khỏi MorningPanel (nguyên văn thẻ "Chợ phiên đầu ngõ" — gánh hàng dư ra chợ). */
export function MarketSurplusCard({ chophien }: { chophien: MarketClearValue }) {
  const sellMarketSurplus = useGame((s) => s.sellMarketSurplus);
  return (
    <Callout tone="ok" title="🧺 Hôm nay chợ phiên đầu ngõ" style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {chophien.rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
            <span style={{ minWidth: 150 }}>{r.name}: {r.qty} món</span>
            <span style={{ opacity: 0.8 }}>~{formatMoney(r.est)} · {r.reason === 'cold' ? 'cần lạnh dư' : 'bán chậm'}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        Gánh ~{chophien.units} món dư ra bán, thu về ~<b>{formatMoney(chophien.total)}</b> thay vì để ế/hỏng.
      </div>
      <button onClick={() => sellMarketSurplus()}
        style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#2ecc71' }}>
        🧺 Gánh bán ngay (+~{formatMoney(chophien.total)})
      </button>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Chợ trả thấp hơn giá bán lẻ nhưng giải phóng hàng tồn — mỗi phiên một lần.</div>
    </Callout>
  );
}
