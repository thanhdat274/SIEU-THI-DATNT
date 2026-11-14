import { trendMark as profitMark } from '../trendMark';
import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { Dropdown } from '../Dropdown';
import { HAPPY_FROM_MAX, HAPPY_FROM_MIN, HAPPY_HOURS, HAPPY_OFF_OPTIONS, happyHourActive, happyWindowFit, happyHourReport } from '../../data/rhythm';
import { useClock, useGame } from '../../core/store';
import { CATEGORIES, formatMoney, unlockedProducts, type Product, fmtMul } from '../../data/products';
import { suggestPrice, referenceSell, productSensitivity, sensitivityLevel, priceForecast, formatDeltaK, FORECAST_FLAT_BAND, priceSideMark } from '../../data/pricing';
import { segmentPriceFallout } from '../../data/segmentPricing';
import { dayEffects } from '../../data/calendar';
import { marketTrend } from '../../data/market';
import { priceGap } from '../../data/priceGap';
import { Footer, styles, Callout } from './shared';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

export const PRICE_PAGE = 12;

/** Số thập phân kiểu VN cho ước tính "chừng 3,5 món". */
const fmtUnits = (v: number) => v.toFixed(1).replace('.', ',');

export function PricePanel() {
  const { level, day, weatherSeed, prices, setPrice, closePanel, sales, demand, market, storage, furniture } = useGame();
  const stats = useGame((s) => s.stats);
  const happyHour = useGame((s) => s.happyHour);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const setHappyHour = useGame((s) => s.setHappyHour);
  const running = happyHourActive(happyHour, minutes);
  // GĐ251: hệ số "khách chịu giá" hôm nay — đang lễ (Tết 0.5...) thì gợi ý giá tính theo khách lễ
  const priceEffects = dayEffects(weatherSeed, day, level);
  const tolOf = (id: string) => priceEffects.tolerance(id);
  // Lọc theo ngành + tìm theo tên, rồi phân trang cho đỡ kéo dài
  const [cat, setCat] = useState<'all' | Product['category']>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const all = unlockedProducts(level);
  const filtered = all.filter((p) => (cat === 'all' || p.category === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PRICE_PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PRICE_PAGE, cur * PRICE_PAGE + PRICE_PAGE);
  return (
    <>
      <h2 style={styles.title}>{t('panels_stock.bang_gia')}</h2>
      <p style={styles.sub}>
        {t('panels_stock.gia_cao_hon_gia_goi_y')}
      </p>
      {priceEffects.festival && (
        <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 10, background: 'rgba(241,196,15,0.12)', color: '#f1c40f', margin: '4px 0 8px' }}>
          {t('panels_stock.dang')}{' '}{priceEffects.festival.name}{' '}{t('panels_stock.khach_chiu_gia_cao_hon_mon')}{fmtMul(priceEffects.festival.tolerance ?? 1)}{t('panels_stock.cot_nen_da_tinh_dieu_chinh')}
        </div>
      )}
      {(() => {
        const gap = priceGap(all.map((p) => ({ id: p.id, price: prices[p.id] ?? p.sell, soldPerDay: sales[p.id], wantedPerDay: demand[p.id], tolerance: tolOf(p.id) })));
        if (!gap.actionable) return null;
        const top = gap.offenders.slice(0, 3);
        return (
          <Callout tone="warn" style={{ marginBottom: 8 }} title={t('panels_stock.gia_hom_nay_dang_de_hut', { v0: formatMoney(gap.totalMissedPerDay), count: gap.count })}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {top.map((o) => t('panels_stock.ngay', { name: o.name, v1: formatMoney(o.gainPerDay) })).join(' · ')}
              {gap.offenders.length > top.length ? t('panels_stock.mon_nua', { v0: gap.offenders.length - top.length }) : ''}
              {t('panels_stock.dieu_chinh_gia_theo_mui_gan')}
            </div>
          </Callout>
        );
      })()}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }}>
        <b style={{ flex: 'none' }}>{t('panels_stock.gio_vang')}</b>
        <span style={{ ...styles.sub, flex: '1 1 220px', minWidth: 180 }}>{t('panels_stock.giam_gia_dung_khung_2_tieng')}{' '}{HAPPY_OFF_OPTIONS.join('/')}% → +{HAPPY_OFF_OPTIONS.map((o) => Math.round(o * 2.5)).join('/')}{t('panels_stock.khach')}</span>
        {happyHour ? (
          <>
            <span
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: running ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.08)', color: running ? '#2ecc71' : undefined }}
              title={running ? t('panels_stock.gio_vang_dang_chay') : t('panels_stock.gio_vang_da_dat_tu_chay')}
            >
              {running ? t('panels_stock.dang_chay_toi_h', { v0: happyHour.from + HAPPY_HOURS }) : t('panels_stock.moi_ngay_h_h', { from: happyHour.from, v1: happyHour.from + HAPPY_HOURS })}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Dropdown
                value={String(happyHour.from)}
                onChange={(v) => setHappyHour({ ...happyHour, from: Number(v) })}
                options={Array.from({ length: HAPPY_FROM_MAX - HAPPY_FROM_MIN + 1 }, (_, i) => ({ value: String(HAPPY_FROM_MIN + i), label: `${HAPPY_FROM_MIN + i}h` }))}
                ariaLabel={t('panels_stock.gio_bat_dau_gio_vang')}
              />
              <Dropdown
                value={String(happyHour.off)}
                onChange={(v) => setHappyHour({ ...happyHour, off: Number(v) })}
                options={HAPPY_OFF_OPTIONS.map((o) => ({ value: String(o), label: t('panels_stock.giam', { o }) }))}
                ariaLabel={t('panels_stock.muc_giam_gio_vang')}
              />
            </span>
            <button style={{ ...styles.btn, background: '#e74c3c', color: '#fff' }} onClick={() => setHappyHour(null)}>{t('panels_stock.tat')}</button>
            {(() => {
              const fit = happyWindowFit(happyHour.from);
              const line = fit.verdict === 'dead'
                ? { icon: '✅', color: '#2ecc71', text: t('panels_stock.gio_vang_traffic_keo_them_khach', { v0: fit.traffic.toFixed(1) }) }
                : fit.verdict === 'golden'
                  ? { icon: '⚠️', color: '#e74c3c', text: t('panels_stock.trung_phut_gio_vang_tu_nhien', { goldenMinutes: fit.goldenMinutes }) }
                  : { icon: '➖', color: '#f1c40f', text: t('panels_stock.xen_phut_gio_vang_mot_nua', { goldenMinutes: fit.goldenMinutes }) };
              return (
                <div style={{ width: '100%', flex: '1 1 100%', fontSize: 12, color: line.color, paddingTop: 2 }} title={t('panels_stock.so_voi_nhip_tu_nhien_giam')}>
                  {line.icon}{' '}{t('panels_stock.cua_so')}{' '}{happyHour.from}h–{happyHour.from + HAPPY_HOURS}h: {line.text}.
                </div>
              );
            })()}
            {(() => {
              const r = happyHourReport(happyHour, stats.byHour);
              const verdict = !r.present
                ? { color: '#888', t: t('panels_stock.chua_co_khach_trong_khung_hom') }
                : r.extraCustomers > 0 && r.discountCost < r.revenue
                  ? { color: '#2ecc71', t: t('panels_stock.khach_nho_gio_vang_giam_gia', { extraCustomers: r.extraCustomers, v1: formatMoney(r.discountCost), v2: formatMoney(r.revenue) }) }
                  : { color: '#f1c40f', t: t('panels_stock.khach_nho_gio_vang_nhung_giam', { extraCustomers: r.extraCustomers, v1: formatMoney(r.discountCost) }) };
              return (
                <div style={{ width: '100%', flex: '1 1 100%', fontSize: 12, color: verdict.color, paddingTop: 2 }} title={t('panels_stock.ket_qua_khung_tinh_tu_so')}>
                  {t('panels_stock.khung_hom_nay')}{' '}{r.from}h–{r.to}h: {r.present ? t('panels_stock.khach_doanh_thu', { customers: r.customers, v1: formatMoney(r.revenue), t: verdict.t }) : verdict.t}.
                </div>
              );
            })()}
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)' }}>{t('panels_stock.chua_dat')}</span>
            <button style={{ ...styles.btn, background: '#2ecc71', color: '#1d1f2b', fontWeight: 700 }} onClick={() => setHappyHour({ from: 14, off: 10 })}>{t('panels_stock.bat_tu_14h')}</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '10px 0 6px' }}>
        <Dropdown
          value={cat}
          onChange={(v) => { setCat(v as typeof cat); setPage(0); }}
          options={[{ value: 'all', label: t('panels_stock.tat_ca', { length: all.length }) }, ...Object.entries(CATEGORIES).map(([k, label]) => ({ value: k, label: `${label} (${all.filter((p) => p.category === k).length})` }))]}
          ariaLabel={t('panels_stock.loc_theo_nganh_hang')}
        />
        <input
          style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid #ffffff33', background: '#1f1f2b', color: '#fff' }}
          placeholder={t('panels_stock.tim_mat_hang')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          aria-label={t('panels_stock.tim_mat_hang_2')}
        />
        <span style={styles.sub}>{filtered.length}{' '}{t('panels_stock.mon')}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr><th style={styles.left}>{t('panels_stock.mat_hang')}</th><th>{t('panels_stock.gia_nhap')}</th><th>{t('panels_stock.goi_y')}</th><th>{t('panels_stock.gia_ban')}</th><th>{t('panels_stock.loi_mon')}</th><th>{t('panels_stock.ban_ngay')}</th><th>{t('panels_stock.nen')}</th></tr>
        </thead>
        <tbody>
          {shown.map((p) => {
            const ref = referenceSell(p.id);
            const price = prices[p.id] ?? p.sell;
            const step = 500;
            const change = (delta: number) => setPrice(p.id, Math.max(step, price + delta));
            const ratio = price / ref;
            const tip = suggestPrice(p.id, price, sales[p.id], demand[p.id], tolOf(p.id));
            const onHand = (storage[p.id] ?? 0) + furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => m + (t.productId === p.id ? t.count : 0), 0), 0);
            const trend = marketTrend(market[p.id] ?? 1, onHand, 0, demand[p.id] ?? 0);
            const trendMark = trend.dir === 'up' ? '⬆' : trend.dir === 'down' ? '⬇' : '•';
            const trendColor = trend.dir === 'up' ? '#2ecc71' : trend.dir === 'down' ? '#e74c3c' : '#888';
            const trendTip = trend.dir === 'up'
              ? t('panels_stock.gia_thi_truong_dang_nhich_len', {  })
              : trend.dir === 'down'
                ? t('panels_stock.gia_thi_truong_dang_ha_hang', {  })
                : t('panels_stock.gia_thi_truong_dang_on_dinh', {  });
            return (
              <tr key={p.id}>
                <td style={styles.left}>
                  <ProductIcon product={p} /> {p.name}
                  {(() => {
                    const s = productSensitivity(p.id);
                    const lv = sensitivityLevel(s);
                    const conf: Record<string, { txt: string; col: string; bg: string }> = {
                      hot: { txt: t('panels_stock.nhay'), col: '#e74c3c', bg: 'rgba(231,76,60,0.16)' },
                      mid: { txt: t('panels_stock.vua'), col: '#f1c40f', bg: 'rgba(241,196,15,0.16)' },
                      soft: { txt: t('panels_stock.ben'), col: '#2ecc71', bg: 'rgba(46,204,113,0.16)' },
                    };
                    const c = conf[lv];
                    return (
                      <span
                        title={`Độ nhạy giá ${s.toFixed(1)} — ${lv === 'hot' ? 'khách bỏ hàng nhanh khi tăng giá, nên cẩn' : lv === 'soft' ? 'khách gần như vẫn mua dù giá cao, tăng được' : 'khách bớt mua khi tăng giá vừa phải'}${tolOf(p.id) < 1 ? ` · Hôm nay lễ (${priceEffects.festival?.name}): khách chịu giá cao, nhạy giá thực tế ×${fmtMul(tolOf(p.id))}` : ''}`}
                        style={{ fontSize: 11, marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: c.bg, color: c.col, whiteSpace: 'nowrap' }}
                      >{c.txt}</span>
                    );
                  })()}
                  {(() => {
                    // GĐ1284 — "giá này đang đuổi đi phân khúc nào?" (chỉ khi giá cao hơn gợi ý & có nghề ưa món bị đuổi)
                    const fo = level && day ? segmentPriceFallout({ productId: p.id, price, level, day }) : null;
                    if (!fo) return null;
                    const row = fo.rows[0];
                    return (
                      <div style={{ fontSize: 11, marginTop: 2, color: '#e67e22' }}>
                        💡 {row.profession.icon} {row.profession.name}{' '}{t('panels_stock.nhay_2')}{' '}{row.sensitivity}{t('panels_stock.bi_gia_cao_duoi')}{row.losePct}{t('panels_stock.luot_ha_ve')}{fmtNum(fo.reference)}{t('panels_stock.d')}
                      </div>
                    );
                  })()}
                </td>
                <td>{formatMoney(p.buy)}</td>
                <td title={t('panels_stock.gia_goi_y_hien_hanh_nhich', { v0: formatMoney(ref), trendTip })}>
                  {formatMoney(ref)} <span style={{ color: trendColor, fontSize: 13 }}>{trendMark}</span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={styles.btn} aria-label={t('panels_stock.giam_gia')} onClick={() => change(-step)}>−</button>
                  <b
                    style={{ display: 'inline-block', width: 80, margin: '0 5px', textAlign: 'center', color: ratio > 1.3 ? '#e74c3c' : ratio < 0.8 ? '#3498db' : ratio > 1 ? '#f1c40f' : '#fff' }}
                    title={ratio > 1.3
                      ? t('panels_stock.dat_hon_30_gia_goi_y')
                      : ratio < 0.8
                        ? t('panels_stock.re_hon_20_gia_goi_y')
                        : ratio > 1
                          ? t('panels_stock.hoi_cao_hon_goi_y_mot')
                          : t('panels_stock.trong_bien_gia_hop_ly_0')}
                  >
                    {formatMoney(price)}
                  </b>
                  <button style={styles.btn} aria-label={t('panels_stock.tang_gia')} onClick={() => change(step)}>+</button>
                  {(() => {
                    // GĐ1224/1225 — bề mặt hai phía giá ngay trên ô giá (pure priceSideMark: rẻ → +% khách; đắt → % đơn chịu mua)
                    const mk = priceSideMark(p.id, price);
                    if (!mk) return null;
                    return (
                      <div style={{ whiteSpace: 'nowrap', fontSize: 11, marginTop: 2, color: mk.side === 'low' ? '#3498db' : '#e74c3c', opacity: 0.9 }} title={mk.tooltip}>
                        {mk.line}
                      </div>
                    );
                  })()}
                  {price !== p.sell && (() => {
                    const fc = priceForecast(p.id, price, { soldPerDay: sales[p.id], wantedPerDay: demand[p.id] }, tolOf(p.id));
                    if (!fc) return null;
                    const up = fc.profitRatio > 1 + FORECAST_FLAT_BAND;
                    const down = fc.profitRatio < 1 - FORECAST_FLAT_BAND || fc.unitsRatio < 1 - FORECAST_FLAT_BAND;
                    const flat = !up && !down;
                    const icon = flat ? '➖' : up ? '📈' : '📉';
                    const color = flat ? '#bbb' : up ? '#2ecc71' : '#ff7675';
                    const delta = fc.profitPerDay - fc.baseProfitPerDay;
                    return (
                      <div
                        style={{ whiteSpace: 'normal', fontSize: 11, lineHeight: '15px', maxWidth: 140, marginTop: 2, color, opacity: flat ? 0.75 : undefined }}
                        title={t('panels_stock.uoc_tinh_khi_ban_gia_chung', { v0: formatMoney(price), v1: fmtUnits(fc.unitsPerDay), v2: formatDeltaK(fc.profitPerDay).replace('+', ''), v3: formatMoney(p.sell), v4: fmtUnits(fc.baseUnitsPerDay), v5: formatDeltaK(fc.baseProfitPerDay).replace('+', '') })}
                      >
                        {icon}{' '}{t('panels_stock.chung')}{' '}{fmtUnits(fc.unitsPerDay)}{' '}{t('panels_stock.mon_ngay_lai_chung')}{' '}{formatDeltaK(delta)}{t('panels_stock.ngay_2')}
                      </div>
                    );
                  })()}
                </td>
                <td style={{ color: price > p.buy ? '#2ecc71' : '#e74c3c' }}>{profitMark(price - p.buy)}{formatMoney(price - p.buy)}</td>
                <td title={t('panels_stock.khach_hoi_mua_luot_ngay', { v0: (demand[p.id] ?? 0).toFixed(1) })}>{(sales[p.id] ?? 0).toFixed(1)}</td>
                <td>{tip.action === 'hold' ? <span style={{ opacity: 0.5 }} title={tip.reason}>{t('panels_stock.giu')}</span> : (
                  <button style={styles.btn} title={tip.reason} onClick={() => setPrice(p.id, tip.price)}>
                    {tip.action === 'raise' ? '↑' : '↓'} {formatMoney(tip.price)}
                  </button>
                )}</td>
              </tr>
            );
          })}
          {!shown.length && (
            <tr><td style={styles.left} colSpan={7}>{t('panels_stock.khong_co_mat_hang_nao_khop')}</td></tr>
          )}
        </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
          <button style={styles.btn} disabled={cur === 0} onClick={() => setPage(cur - 1)}>{t('panels_stock.truoc')}</button>
          <span style={{ fontSize: 13 }}>Trang {cur + 1}/{pages}</span>
          <button style={styles.btn} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Sau ›</button>
        </div>
      )}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => {
          const { prices, setPrices } = useGame.getState();
          setPrices(Object.fromEntries(Object.entries(prices).map(([id, from]) => [id, { from, to: null }])));
        }}>{t('panels_stock.ve_gia_goi_y')}</button>
        <button
          style={{ ...styles.btn, background: '#2ecc71', color: '#1d1f2b', fontWeight: 700 }}
          onClick={() => {
            const s = useGame.getState();
            const changes: Parameters<typeof s.setPrices>[0] = {};
            let changed = 0;
            let total = 0;
            for (const p of unlockedProducts(s.level)) {
              total++;
              const price = s.prices[p.id] ?? p.sell;
              const tip = suggestPrice(p.id, price, s.sales[p.id], s.demand[p.id], dayEffects(s.weatherSeed, s.day, s.level).tolerance(p.id));
              // Món chưa bán được lần nào thì về giá gợi ý hiện hành thay vì "giữ" vô thông tin
              const noData = (s.sales[p.id] ?? 0) === 0 && (s.demand[p.id] ?? 0) === 0;
              const target = tip.action === 'hold' && noData ? referenceSell(p.id) : tip.price;
              if (target !== price) changed++;
              if (target !== s.prices[p.id]) changes[p.id] = { from: s.prices[p.id], to: target };
            }
            s.setPrices(changes);
            s.notify(t('panels_stock.da_chinh_gia_mon_mo_theo', { changed, total }));
          }}
        >
          {t('panels_stock.chinh_tat_ca_ve_gia_nen')}
        </button>
        <button style={styles.btn} onClick={() => useGame.getState().openPanel({ type: 'combos' })}>🎁 Combo</button>
      </Footer>
    </>
  );
}
