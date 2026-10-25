import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { Dropdown } from '../Dropdown';
import { HAPPY_FROM_MAX, HAPPY_FROM_MIN, HAPPY_HOURS, HAPPY_OFF_OPTIONS, happyHourActive } from '../../data/rhythm';
import { useClock, useGame } from '../../core/store';
import { CATEGORIES, formatMoney, unlockedProducts, type Product } from '../../data/products';
import { suggestPrice, referenceSell } from '../../data/pricing';
import { Footer, styles } from './shared';

export const PRICE_PAGE = 12;

export function PricePanel() {
  const { level, prices, setPrice, closePanel, sales, demand } = useGame();
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
            return (
              <tr key={p.id}>
                <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
                <td>{formatMoney(p.buy)}</td>
                <td title="Giá gợi ý hiện hành: nhích theo khan hiếm hàng">{formatMoney(ref)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={styles.btn} onClick={() => change(-step)}>−</button>
                  <b
                    style={{ display: 'inline-block', width: 80, color: ratio > 1.3 ? '#e74c3c' : ratio < 0.8 ? '#74b9ff' : ratio > 1 ? '#f1c40f' : '#fff' }}
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
                  <button style={styles.btn} onClick={() => change(step)}>+</button>
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
