import { useGame } from '../../core/store';
import { productById } from '../../data/products';
import { CUM_DAYS, dateOfDoy, dayOfYear, FESTIVALS, festivalOn, festivalStock, gameDayOfDoy, isWeekend, MONTH_LENGTHS, weekdayOf, YEAR_DAYS } from '../../data/calendar';
import { Footer, styles } from './shared';

/** Lịch sự kiện cả năm: lưới 12 tháng tô màu theo dịp lễ, kèm hiệu ứng từng dịp để nhập hàng trước. */
export function CalendarPanel() {
  const day = useGame((s) => s.day);
  const level = useGame((s) => s.level);
  const closePanel = useGame((s) => s.closePanel);
  const doy = dayOfYear(day);
  const current = festivalOn(day);
  const sorted = [...FESTIVALS].sort((a, b) => {
    const dist = (f: typeof a) => f === current ? -1 : (f.from - doy + YEAR_DAYS) % YEAR_DAYS;
    return dist(a) - dist(b);
  });
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  const dateText = (doy0: number) => {
    const { month, day: d } = dateOfDoy(doy0);
    return `${d}/${month}`;
  };
  const rangeText = (f: typeof FESTIVALS[number]) => {
    const a = dateOfDoy(f.from), b = dateOfDoy(f.to);
    return a.month === b.month ? `${a.day}–${b.day}/${a.month}` : `${a.day}/${a.month}–${b.day}/${b.month}`;
  };
  const today = dateOfDoy(doy);
  return (
    <>
      <h2 style={styles.title}>🗓️ Lịch sự kiện</h2>
      <p style={styles.sub}>
        Một năm trong game dài 365 ngày theo lịch thật. Hôm nay là {weekdayOf(day)}, ngày {today.day}/{today.month}
        {current ? ` — đang trong ${current.icon} ${current.name}` : ''}. Ô nền sáng hơn là Thứ 7/Chủ nhật — cuối tuần
        khách ghé mua ăn vặt nhiều hơn. Xem trước dịp nào tới để nhập sẵn hàng:
        giá nhập thay đổi theo dịp, khách chịu giá cao với hàng mùa.
      </p>
      <div style={{ display: 'grid', gap: 3, marginBottom: 14, maxWidth: 660, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6 }}>
        {MONTH_LENGTHS.map((len, m) => (
          <div key={m} style={{ display: 'grid', gridTemplateColumns: `28px repeat(${len}, 1fr)`, gap: 2 }}>
            <span style={{ fontSize: 11, opacity: 0.6, alignSelf: 'center' }}>T{m + 1}</span>
            {Array.from({ length: len }, (_, d) => {
              const doy0 = CUM_DAYS[m] + d;
              const f = FESTIVALS.find((x) => doy0 >= x.from && doy0 <= x.to);
              const idx = f ? FESTIVALS.indexOf(f) : -1;
              const gd = gameDayOfDoy(doy0);
              const wknd = isWeekend(gd);
              return (
                <div
                  key={d}
                  title={`${d}/${m + 1} · ${weekdayOf(gd)}${f ? `: ${f.name}` : ''}${wknd ? ' · cuối tuần' : ''}`}
                  style={{
                    height: 16, borderRadius: 3, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: f ? `hsl(${(idx * 47) % 360} 55% 42%)` : wknd ? '#4a4a63' : '#3a3a4d',
                    outline: doy0 === doy ? '2px solid #fff' : undefined,
                    cursor: 'default',
                  }}
                >
                  {f ? f.icon : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, maxWidth: 660 }}>
        {sorted.map((f) => {
          const inDays = (f.from - doy + YEAR_DAYS) % YEAR_DAYS;
          const running = f === current;
          const goods = festivalStock(f, level);
          return (
            <div key={f.id} style={{ ...styles.card, alignItems: 'flex-start', outline: running ? '2px solid #f1c40f' : undefined }}>
              <span style={{ fontSize: 26 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>{f.name}</b>
                  <small style={{ opacity: 0.7 }}>
                    {running ? 'Đang diễn ra' : inDays === 0 ? 'Hôm nay' : `sau ${inDays} ngày`} · {rangeText(f)}
                  </small>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, margin: '2px 0' }}>{f.blurb}</div>
                <div style={{ fontSize: 12 }}>
                  👥 khách {pct(f.traffic)}
                  {f.cost !== 1 && ` · 💰 giá nhập ${pct(f.cost)}`}
                  {f.tolerance && ' · 😤 khách chịu giá cao'}
                  {goods.length > 0 && <small style={{ opacity: 0.75 }}> · hàng nên nhập: {goods.map((id) => productById(id).name).join(', ')}</small>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
