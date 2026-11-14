import { useGame } from '../../core/store';
import { CATEGORIES, formatMoney } from '../../data/products';
import { useState } from 'react';
import { MARKET_TIERS, MARKET_HOT_BONUS, marketHotCategory, MARKET_MULT_MAX, MARKET_MULT_MIN, marketClearValue, marketTierQuote, marketTierUnlocked, type MarketClearValue, type MarketTier } from '../../data/chophien';
import { itemHealthList, shelfCount } from '../../data/analytics';
import { Callout, styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ921: tách khỏi MorningPanel (nguyên văn thẻ "Chợ phiên đầu ngõ" — gánh hàng dư ra chợ). */
export function MarketSurplusCard({ chophien }: { chophien: MarketClearValue }) {
  const sellMarketSurplus = useGame((s) => s.sellMarketSurplus);
  const level = useGame((s) => s.level);
  if (level >= MARKET_TIERS.phuong.unlock) return <MarketTierCard level={level} />;
  return (
    <Callout tone="ok" title={t('panels_small.hom_nay_cho_phien_dau_ngo')} style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {chophien.rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
            <span style={{ minWidth: 150 }}>{r.name}: {r.qty}{' '}{t('panels_small.mon')}</span>
            <span style={{ opacity: 0.8 }}>~{formatMoney(r.est)} · {r.reason === 'cold' ? t('panels_small.can_lanh_du') : t('panels_small.ban_cham')}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {t('panels_small.ganh')}{chophien.units}{' '}{t('panels_small.mon_du_ra_ban_thu_ve')}<b>{formatMoney(chophien.total)}</b>{' '}{t('panels_small.thay_vi_de_e_hong')}
      </div>
      <button onClick={() => sellMarketSurplus()}
        style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#2ecc71' }}>
        {t('panels_small.ganh_ban_ngay')}{formatMoney(chophien.total)})
      </button>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>{t('panels_small.cho_tra_thap_hon_gia_ban')}</div>
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
    <Callout tone="ok" title={t('panels_small.hom_nay_co_phien_cho')} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {(Object.keys(MARKET_TIERS) as MarketTier[]).map((mt) => {
          const open = marketTierUnlocked(mt, level);
          return <button key={mt} disabled={!open} onClick={() => setTier(mt)}
            style={{ ...styles.btn, flex: 1, fontSize: 11, opacity: open ? 1 : 0.4, background: mt === tier ? '#2ecc71' : undefined }}>
            {MARKET_TIERS[mt].name}{open ? '' : t('panels_small.cap_6', { v0: MARKET_TIERS[mt].unlock })}
          </button>;
        })}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>{t('panels_small.toi_da')}{' '}{def.maxItems}{' '}{t('panels_small.loai')}{' '}{def.maxUnits}{' '}{t('panels_small.mon_phi_sap')}{' '}{Math.round(def.fee * 100)}%</div>
      {tier !== 'xom' && <div style={{ fontSize: 11, marginTop: 2 }}>{t('panels_small.sap_thu_mua_hom_nay')}{' '}<b>{CATEGORIES[marketHotCategory(s.day)]}</b>{' '}{t('panels_small.tra_them')}{' '}{Math.round(MARKET_HOT_BONUS * 100)}%</div>}
      {tier !== 'xom' && (
        <label style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          {t('panels_small.gia_rao')}{' '}<b>{mult.toFixed(1)}×</b>{' '}{t('panels_small.gia_cho_rao_cao_ban_duoc')}
          <input type="range" min={MARKET_MULT_MIN} max={MARKET_MULT_MAX} step={0.1} value={mult}
            onChange={(e) => setMult(Number(e.target.value))} style={{ width: '100%' }} />
        </label>
      )}
      {q && q.units > 0 ? (
        <>
          <div style={{ fontSize: 12 }}>{t('panels_small.ban')}{' '}{q.units}{' '}{t('panels_small.mon_2')}{' '}{formatMoney(q.gross)}{' '}{t('panels_small.phi')}{' '}{formatMoney(q.fee)} = <b>{formatMoney(q.net)}</b></div>
          <button onClick={() => sellMarketSurplus({ tier, mult })}
            style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#2ecc71' }}>{t('panels_small.ban_o')}{' '}{def.name} (+{formatMoney(q.net)})</button>
        </>
      ) : <div style={{ fontSize: 12, opacity: 0.7 }}>{t('panels_small.gia_nay_khong_ban_duoc_mon')}</div>}
    </Callout>
  );
}
