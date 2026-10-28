import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { Dropdown } from '../Dropdown';
import { HAPPY_FROM_MAX, HAPPY_FROM_MIN, HAPPY_HOURS, HAPPY_OFF_OPTIONS, happyHourActive, happyWindowFit, happyHourReport } from '../../data/rhythm';
import { useClock, useGame } from '../../core/store';
import { CATEGORIES, formatMoney, unlockedProducts, type Product } from '../../data/products';
import { suggestPrice, referenceSell, productSensitivity, sensitivityLevel, priceForecast, formatDeltaK, FORECAST_FLAT_BAND } from '../../data/pricing';
import { marketTrend } from '../../data/market';
import { Footer, styles } from './shared';

export const PRICE_PAGE = 12;

/** Số thập phân kiểu VN cho ước tính "chừng 3,5 món". */
const fmtUnits = (v: number) => v.toFixed(1).replace('.', ',');

export function PricePanel() {
  const { level, prices, setPrice, closePanel, sales, demand, market, storage, furniture } = useGame();
  const stats = useGame((s) => s.stats);
  const happyHour = useGame((s) => s.happyHour);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const setHappyHour = useGame((s) => s.setHappyHour);
  const running = happyHourActive(happyHour, minutes);
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
      <h2 style={styles.title}>💲 Bảng giá</h2>
      <p style={styles.sub}>
        Giá cao hơn giá gợi ý thì lời nhiều hơn nhưng khách ít mua hơn (💸); đồ uống, bánh kẹo bị chê nhanh nhất, gạo, trứng ít bị ảnh hưởng.
        Giá rẻ hơn gợi ý thì thêm người ghé tiệm. Cột "Nên" gợi ý theo số bán mấy ngày gần đây.
        Giá gợi ý hiện hành nhích nhẹ mỗi ngày theo khan hiếm hàng trên thị trường (hàng cạn → giá thị trường nhích lên, tồn nhiều → hạ xuống).
        Mũi tên ⬆/⬇/• bên cạnh "Gợi ý" báo giá thị trường hôm nay đang trôi về đâu (khan → trụ/nâng giá; thừa → hạ giá xả).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }}>
        <b style={{ flex: 'none' }}>⏰ Giờ vàng</b>
        <span style={{ ...styles.sub, flex: '1 1 220px', minWidth: 180 }}>giảm giá đúng khung 2 tiếng, khách kéo về đông hơn (giảm {HAPPY_OFF_OPTIONS.join('/')}% → +{HAPPY_OFF_OPTIONS.map((o) => Math.round(o * 2.5)).join('/')}% khách)</span>
        {happyHour ? (
          <>
            <span
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: running ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.08)', color: running ? '#2ecc71' : undefined }}
              title={running ? 'Giờ vàng đang chạy' : 'Giờ vàng đã đặt, tự chạy đúng khung mỗi ngày'}
            >
              {running ? `● đang chạy tới ${happyHour.from + HAPPY_HOURS}h` : `mỗi ngày ${happyHour.from}h–${happyHour.from + HAPPY_HOURS}h`}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Dropdown
                value={String(happyHour.from)}
                onChange={(v) => setHappyHour({ ...happyHour, from: Number(v) })}
                options={Array.from({ length: HAPPY_FROM_MAX - HAPPY_FROM_MIN + 1 }, (_, i) => ({ value: String(HAPPY_FROM_MIN + i), label: `${HAPPY_FROM_MIN + i}h` }))}
                ariaLabel="Giờ bắt đầu giờ vàng"
              />
              <Dropdown
                value={String(happyHour.off)}
                onChange={(v) => setHappyHour({ ...happyHour, off: Number(v) })}
                options={HAPPY_OFF_OPTIONS.map((o) => ({ value: String(o), label: `giảm ${o}%` }))}
                ariaLabel="Mức giảm giờ vàng"
              />
            </span>
            <button style={styles.fire} onClick={() => setHappyHour(null)}>Tắt</button>
            {(() => {
              const fit = happyWindowFit(happyHour.from);
              const line = fit.verdict === 'dead'
                ? { icon: '✅', color: '#2ecc71', text: `giờ vắng (traffic ${fit.traffic.toFixed(1)}) — kéo thêm khách vào lúc vắng, đáng giá` }
                : fit.verdict === 'golden'
                  ? { icon: '⚠️', color: '#e74c3c', text: `trùng ${fit.goldenMinutes} phút giờ vàng tự nhiên — đang giảm giá cho khách vốn đã đông, lãng phí; nên chọn giờ vắng hơn` }
                  : { icon: '➖', color: '#f1c40f', text: `xen ${fit.goldenMinutes} phút giờ vàng — một nửa là giờ vắng, chấp nhận được` };
              return (
                <div style={{ width: '100%', flex: '1 1 100%', fontSize: 12, color: line.color, paddingTop: 2 }} title="So với nhịp tự nhiên: giảm giá đúng giờ vắng thì thêm khách biên rẻ nhất, trùng giờ vàng thì giảm giá cho khách vốn đã tới">
                  {line.icon} Cửa sổ {happyHour.from}h–{happyHour.from + HAPPY_HOURS}h: {line.text}.
                </div>
              );
            })()}
            {(() => {
              const r = happyHourReport(happyHour, stats.byHour);
              const verdict = !r.present
                ? { color: '#888', t: 'chưa có khách trong khung hôm nay' }
                : r.extraCustomers > 0 && r.discountCost < r.revenue
                  ? { color: '#2ecc71', t: `+${r.extraCustomers} khách nhờ giờ vàng · giảm giá −${formatMoney(r.discountCost)} trên doanh thu ${formatMoney(r.revenue)} — đáng giữ` }
                  : { color: '#f1c40f', t: `+${r.extraCustomers} khách nhờ giờ vàng nhưng giảm giá −${formatMoney(r.discountCost)} — cân nhắc giảm mức/đổi giờ` };
              return (
                <div style={{ width: '100%', flex: '1 1 100%', fontSize: 12, color: verdict.color, paddingTop: 2 }} title="Kết quả khung tính từ sổ theo giờ (stats.byHour): doanh thu trong khung đã trừ mức giảm, tiền giảm giá là ước tính">
                  📊 Khung hôm nay {r.from}h–{r.to}h: {r.present ? `${r.customers} khách · doanh thu ${formatMoney(r.revenue)} · ${verdict.t}` : verdict.t}.
                </div>
              );
            })()}
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)' }}>chưa đặt</span>
            <button style={styles.hire} onClick={() => setHappyHour({ from: 14, off: 10 })}>Bật từ 14h</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '10px 0 6px' }}>
        <Dropdown
          value={cat}
          onChange={(v) => { setCat(v as typeof cat); setPage(0); }}
          options={[{ value: 'all', label: `📂 Tất cả (${all.length})` }, ...Object.entries(CATEGORIES).map(([k, label]) => ({ value: k, label: `${label} (${all.filter((p) => p.category === k).length})` }))]}
          ariaLabel="Lọc theo ngành hàng"
        />
        <input
          style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid #ffffff33', background: '#1f1f2b', color: '#fff' }}
          placeholder="Tìm mặt hàng…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          aria-label="Tìm mặt hàng"
        />
        <span style={styles.sub}>{filtered.length} món</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr><th style={styles.left}>Mặt hàng</th><th>Giá nhập</th><th>Gợi ý</th><th>Giá bán</th><th>Lời / món</th><th>Bán/ngày</th><th>Nên</th></tr>
        </thead>
        <tbody>
          {shown.map((p) => {
            const ref = referenceSell(p.id);
            const price = prices[p.id] ?? p.sell;
            const step = 500;
            const change = (delta: number) => setPrice(p.id, Math.max(step, price + delta));
            const ratio = price / ref;
            const tip = suggestPrice(p.id, price, sales[p.id], demand[p.id]);
            const onHand = (storage[p.id] ?? 0) + furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => m + (t.productId === p.id ? t.count : 0), 0), 0);
            const trend = marketTrend(market[p.id] ?? 1, onHand, 0, demand[p.id] ?? 0);
            const trendMark = trend.dir === 'up' ? '⬆' : trend.dir === 'down' ? '⬇' : '•';
            const trendColor = trend.dir === 'up' ? '#2ecc71' : trend.dir === 'down' ? '#e74c3c' : '#888';
            const trendTip = trend.dir === 'up'
              ? `Giá thị trường đang nhích lên (hàng món này đang khan) — ngày mai gợi ý tăng, giữ/nâng giá được.`
              : trend.dir === 'down'
                ? `Giá thị trường đang hạ (hàng món này tồn nhiều) — ngày mai gợi ý giảm, hạ giá để bán nhanh.`
                : `Giá thị trường đang ổn định, gợi ý hầu như không đổi.`;
            return (
              <tr key={p.id}>
                <td style={styles.left}>
                  <ProductIcon product={p} /> {p.name}
                  {(() => {
                    const s = productSensitivity(p.id);
                    const lv = sensitivityLevel(s);
                    const conf: Record<string, { txt: string; col: string; bg: string }> = {
                      hot: { txt: '🔴 nhạy', col: '#e74c3c', bg: 'rgba(231,76,60,0.16)' },
                      mid: { txt: '🟠 vừa', col: '#f1c40f', bg: 'rgba(241,196,15,0.16)' },
                      soft: { txt: '🟢 bền', col: '#2ecc71', bg: 'rgba(46,204,113,0.16)' },
                    };
                    const c = conf[lv];
                    return (
                      <span
                        title={`Độ nhạy giá ${s.toFixed(1)} — ${lv === 'hot' ? 'khách bỏ hàng nhanh khi tăng giá, nên cẩn' : lv === 'soft' ? 'khách gần như vẫn mua dù giá cao, tăng được' : 'khách bớt mua khi tăng giá vừa phải'}`}
                        style={{ fontSize: 11, marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: c.bg, color: c.col, whiteSpace: 'nowrap' }}
                      >{c.txt}</span>
                    );
                  })()}
                </td>
                <td>{formatMoney(p.buy)}</td>
                <td title={`Giá gợi ý hiện hành (${formatMoney(ref)}): nhích theo khan hiếm hàng. ${trendTip}`}>
                  {formatMoney(ref)} <span style={{ color: trendColor, fontSize: 13 }}>{trendMark}</span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={styles.btn} aria-label="Giảm giá" onClick={() => change(-step)}>−</button>
                  <b
                    style={{ display: 'inline-block', width: 80, margin: '0 5px', textAlign: 'center', color: ratio > 1.3 ? '#e74c3c' : ratio < 0.8 ? '#74b9ff' : ratio > 1 ? '#f1c40f' : '#fff' }}
                    title={ratio > 1.3
                      ? 'Đắt hơn 30% giá gợi ý: rất nhiều khách chê và bỏ đi (💸)'
                      : ratio < 0.8
                        ? 'Rẻ hơn 20% giá gợi ý: bán được nhưng lời mỏng, cân nhắc tăng lại'
                        : ratio > 1
                          ? 'Hơi cao hơn gợi ý: một số khách nhạy giá sẽ chê (💸)'
                          : 'Trong biên giá hợp lý (0.8–1.3× giá gợi ý)'}
                  >
                    {formatMoney(price)}
                  </b>
                  <button style={styles.btn} aria-label="Tăng giá" onClick={() => change(step)}>+</button>
                  {price !== p.sell && (() => {
                    const fc = priceForecast(p.id, price, { soldPerDay: sales[p.id], wantedPerDay: demand[p.id] });
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
                        title={`Ước tính khi bán giá ${formatMoney(price)}: chừng ${fmtUnits(fc.unitsPerDay)} món/ngày, lãi chừng ${formatDeltaK(fc.profitPerDay).replace('+', '')}/ngày — so với giá đang đặt ban đầu ${formatMoney(p.sell)}: chừng ${fmtUnits(fc.baseUnitsPerDay)} món/ngày, lãi chừng ${formatDeltaK(fc.baseProfitPerDay).replace('+', '')}/ngày. Chỉ là ước tính "chừng" từ số bán trung bình mấy ngày qua nhân độ nhạy giá của món; chưa kể giờ vàng, khách quen hay đối thủ phá giá.`}
                      >
                        {icon} chừng {fmtUnits(fc.unitsPerDay)} món/ngày · lãi chừng {formatDeltaK(delta)}/ngày
                      </div>
                    );
                  })()}
                </td>
                <td style={{ color: price > p.buy ? '#2ecc71' : '#e74c3c' }}>{formatMoney(price - p.buy)}</td>
                <td title={`Khách hỏi mua ~${(demand[p.id] ?? 0).toFixed(1)} lượt/ngày`}>{(sales[p.id] ?? 0).toFixed(1)}</td>
                <td>{tip.action === 'hold' ? <span style={{ opacity: 0.5 }} title={tip.reason}>giữ</span> : (
                  <button style={styles.btn} title={tip.reason} onClick={() => setPrice(p.id, tip.price)}>
                    {tip.action === 'raise' ? '↑' : '↓'} {formatMoney(tip.price)}
                  </button>
                )}</td>
              </tr>
            );
          })}
          {!shown.length && (
            <tr><td style={styles.left} colSpan={7}>Không có mặt hàng nào khớp bộ lọc.</td></tr>
          )}
        </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
          <button style={styles.btn} disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Trước</button>
          <span style={{ fontSize: 13 }}>Trang {cur + 1}/{pages}</span>
          <button style={styles.btn} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Sau ›</button>
        </div>
      )}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => useGame.setState({ prices: {} })}>Về giá gợi ý</button>
        <button
          style={styles.hire}
          onClick={() => {
            const s = useGame.getState();
            const next: Record<string, number> = {};
            let changed = 0;
            for (const p of unlockedProducts(s.level)) {
              const price = s.prices[p.id] ?? p.sell;
              const tip = suggestPrice(p.id, price, s.sales[p.id], s.demand[p.id]);
              // Món chưa bán được lần nào thì về giá gợi ý hiện hành thay vì "giữ" vô thông tin
              const noData = (s.sales[p.id] ?? 0) === 0 && (s.demand[p.id] ?? 0) === 0;
              const target = tip.action === 'hold' && noData ? referenceSell(p.id) : tip.price;
              if (target !== price) changed++;
              next[p.id] = target;
            }
            useGame.setState({ prices: next });
            s.notify(`💲 Đã chỉnh giá ${changed}/${Object.keys(next).length} món mở theo cột "Nên"`);
          }}
        >
          ✨ Chỉnh tất cả về giá nên
        </button>
        <button style={styles.btn} onClick={() => useGame.getState().openPanel({ type: 'combos' })}>🎁 Combo</button>
      </Footer>
    </>
  );
}
