import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { useState } from 'react';
import { MARKET_TIERS, MARKET_MULT_MAX, MARKET_MULT_MIN, marketClearValue, marketTierQuote, marketTierUnlocked, type MarketClearValue, type MarketTier } from '../../data/chophien';
import { itemHealthList, shelfCount } from '../../data/analytics';
import { Callout, styles } from './shared';

/** GĐ921: tách khỏi MorningPanel (nguyên văn thẻ "Chợ phiên đầu ngõ" — gánh hàng dư ra chợ). */
export function MarketSurplusCard({ chophien }: { chophien: MarketClearValue }) {
  const sellMarketSurplus = useGame((s) => s.sellMarketSurplus);
  const level = useGame((s) => s.level);
  if (level >= MARKET_TIERS.phuong.unlock) return <MarketTierCard level={level} />;
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

/** GĐ1518 chợ 3 cấp: chọn cấp chợ + tự đặt giá, báo giá trùng khớp kết quả bán thật. */
function MarketTierCard({ level }: { level: number }) {
  const sellMarketSurplus = useGame((s) => s.sellMarketSurplus);
  const [tier, setTier] = useState<MarketTier>('phuong');
  const [mult, setMult] = useState(1);
  const s = useGame.getState();
  const def = MARKET_TIERS[tier];
  const shelved = shelfCount(s.furniture);
  const raw = marketClearValue({ day: s.day, storage: s.storage, shelved,
    health: itemHealthList(s.analytics, s.level, s.storage, shelved, s.demand), maxItems: def.maxItems, maxUnits: def.maxUnits });
  const q = raw ? marketTierQuote(raw, tier, mult) : null;
  return (
    <Callout tone="ok" title="🧺 Hôm nay có phiên chợ" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {(Object.keys(MARKET_TIERS) as MarketTier[]).map((t) => {
          const open = marketTierUnlocked(t, level);
          return <button key={t} disabled={!open} onClick={() => setTier(t)}
            style={{ ...styles.btn, flex: 1, fontSize: 11, opacity: open ? 1 : 0.4, background: t === tier ? '#2ecc71' : undefined }}>
            {MARKET_TIERS[t].name}{open ? '' : ` (cấp ${MARKET_TIERS[t].unlock})`}
          </button>;
        })}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>Tối đa {def.maxItems} loại / {def.maxUnits} món · phí sạp {Math.round(def.fee * 100)}%</div>
      {tier !== 'xom' && (
        <label style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          Giá rao: <b>{mult.toFixed(1)}×</b> giá chợ (rao cao bán được ít)
          <input type="range" min={MARKET_MULT_MIN} max={MARKET_MULT_MAX} step={0.1} value={mult}
            onChange={(e) => setMult(Number(e.target.value))} style={{ width: '100%' }} />
        </label>
      )}
      {q && q.units > 0 ? (
        <>
          <div style={{ fontSize: 12 }}>Bán {q.units} món · {formatMoney(q.gross)} − phí {formatMoney(q.fee)} = <b>{formatMoney(q.net)}</b></div>
          <button onClick={() => sellMarketSurplus({ tier, mult })}
            style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#2ecc71' }}>🧺 Bán ở {def.name} (+{formatMoney(q.net)})</button>
        </>
      ) : <div style={{ fontSize: 12, opacity: 0.7 }}>Giá này không bán được món nào — hạ giá rao xuống.</div>}
    </Callout>
  );
}
