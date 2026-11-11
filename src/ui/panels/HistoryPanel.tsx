import { trendMark } from '../trendMark';
import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { useGame, type DayRecord, type ItemLine } from '../../core/store';
import { furnitureDef } from '../../data/furniture';
import { formatMoney, productById } from '../../data/products';
import { describeRep, meetsRep, REP_FACTORS, REP_INFO, REP_MIN_SAMPLES, reputationOf, type RepSample } from '../../data/reputation';
import { repPayoff, repPayoffFocus } from '../../data/repPayoff';
import { nearExpiryAstray } from '../../data/nearExpiryAstray';
import { regularRep, REGULARS } from '../../data/regulars';
import { ACTION_LABEL, type Advice, type HourStat } from '../../data/advice';
import { SUPPLY_CONTRACTS } from '../../data/contracts';
import { starColor, Footer, styles } from './shared';

export function AdviceCard({ title, items, onAct }: { title: string; items: Advice[]; onAct: (a: Advice) => void }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={styles.cardTitle}>{title}</b>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ flex: 1 }}>{a.icon} {a.text}</span>
          {a.action && <button style={{ ...styles.btn, whiteSpace: 'nowrap' }} onClick={() => onAct(a)}>{ACTION_LABEL[a.action]}</button>}
        </div>
      ))}
    </div>
  );
}

/** Khách ghé theo giờ: cột cao nhất là giờ đông nhất. */
export function HourChart({ hours, peak, quiet }: { hours: HourStat[]; peak?: number; quiet?: number }) {
  const max = Math.max(1, ...hours.map((h) => h.customers));
  // Nhiều giờ (>12) thì cột hẹp trên điện thoại: số khách chỉ ghi ở giờ đông nhất (còn lại xem tooltip),
  // nhãn giờ ghi giờ chẵn — để cột co được, không tràn khung (GĐ547).
  const dense = hours.length > 12;
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={styles.cardTitle}>🕒 Khách theo giờ</b>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 6 }}>
        {hours.map((h) => (
          <div key={h.hour} title={`${h.hour}h: ${h.customers} khách · ${formatMoney(h.revenue)}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{(!dense || h.hour === peak) && h.customers ? h.customers : ''}</span>
            <div style={{ width: '100%', height: `${(h.customers / max) * 50}px`, minHeight: h.customers ? 2 : 0, borderRadius: 3, background: h.hour === peak ? '#e67e22' : h.hour === quiet ? '#95a5a6' : '#3498db' }} />
            <span style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap' }}>{!dense || h.hour % 2 === 0 ? `${h.hour}h` : ''}</span>
          </div>
        ))}
      </div>
      {peak !== undefined && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          🟠 Đông nhất {peak}h–{peak + 1}h{quiet !== undefined && <> · ⚪ vắng nhất {quiet}h–{quiet + 1}h (lúc rảnh để dọn dẹp, châm hàng)</>}
        </div>
      )}
    </div>
  );
}

/** Danh tiếng 5 mặt, mặt yếu nhất kèm cách sửa, và những gì danh tiếng đang mở hoặc còn khoá. */
export function ReputationCard({ log }: { log: RepSample[] }) {
  const { level, regulars, furniture } = useGame();
  const rep = reputationOf(log);
  // GĐ148: định lượng phần thưởng khách-vào-cửa của danh tiếng (customers.ts:197)
  const plants = furniture.filter((f) => f.type === 'plant').length;
  const payoff = repPayoff(rep, level, plants);
  const focus = repPayoffFocus(rep, level);
  // Chưa đủ lượt khách: reputationOf trả placeholder 3.0 — không được hiện như điểm thật (GĐ37)
  const insufficient = rep.samples < REP_MIN_SAMPLES;
  // GĐ1303: soi phạt kép — bán hàng cận hạn âm thầm kéo sao 'Chất lượng món' xuống
  const astray = nearExpiryAstray(log);
  const aStar = astray.qualityStar;
  const fStar = astray.freshStar;
  const showAstray = !insufficient && aStar !== null && fStar !== null && astray.dragged > 0 && fStar - aStar >= 0.05;
  const gated = [
    ...SUPPLY_CONTRACTS.filter((c) => c.rep && c.unlock <= level + 5).map((c) => ({ name: `${c.icon} Hợp đồng ${c.title}`, need: c.rep! })),
    ...REGULARS.filter((r) => !regulars[r.id]?.visits && r.unlock <= level + 5 && regularRep(r)).map((r) => ({ name: `💛 Khách quen ${r.name}`, need: regularRep(r)! })),
  ].filter((g) => !meetsRep(rep, g.need)).slice(0, 4);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>⭐ Danh tiếng {insufficient ? 'chưa đủ khách' : `${rep.overall.toFixed(1)}★`}</b>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{rep.samples} lượt khách gần nhất</span>
      </div>
      {insufficient && <div style={{ fontSize: 12, opacity: 0.75 }}>Cần ít nhất {REP_MIN_SAMPLES} lượt khách mới chấm được để có điểm thật.</div>}
      {REP_FACTORS.map((k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4, opacity: insufficient ? 0.4 : 1 }}>
          <span style={{ width: 130 }}>{REP_INFO[k].icon} {REP_INFO[k].name}</span>
          <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
            <div style={{ width: `${((rep.factors[k] - 1) / 4) * 100}%`, height: '100%', borderRadius: 3, background: starColor(Math.round(rep.factors[k])) }} />
          </div>
          <span style={{ width: 30, textAlign: 'right' }}>{insufficient ? '—' : rep.factors[k].toFixed(1)}</span>
        </div>
      ))}
      {showAstray && (
        <div style={{ fontSize: 12, marginTop: 6, color: '#e67e22' }}>
          🍲 {astray.dragged} lượt mua cận hạn: chấm 0.4/0.8★ — 'Chất lượng món' {aStar!.toFixed(1)}★, nếu tươi ~{fStar!.toFixed(1)}★.
        </div>
      )}
      {rep.weakest && rep.factors[rep.weakest] < 4 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>💡 Yếu nhất: <b>{REP_INFO[rep.weakest].name}</b>. {REP_INFO[rep.weakest].low}{!payoff.insufficient && focus.gainKhach > 0 && (
          <span style={{ color: '#e67e22' }}> Nâng mặt này lên 4★ được thêm <b>~{focus.gainKhach} khách/ngày</b>.</span>
        )}</div>
      )}
      {!payoff.insufficient && (
        <div style={{ fontSize: 12, marginTop: 6, color: payoff.extraKhach >= 0 ? '#2ecc71' : '#e74c3c' }}>
          🚶 Danh tiếng làm <b>{Math.abs(payoff.pct * 100).toFixed(0)}%</b> người đi đường ghé{payoff.extraKhach >= 0 ? ' hơn' : ' ít hơn'} →{' '}
          <b>{payoff.extraKhach >= 0 ? '~+' : '~−'}{Math.abs(payoff.extraKhach)} khách/ngày</b>
          <span style={{ opacity: 0.75 }}> (cấp {level}). Nâng 0.5★: thêm ~{payoff.nextStarKhach} khách/ngày.</span>
        </div>
      )}
      {gated.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
          🔒 Danh tiếng sẽ mở: {gated.map((g) => `${g.name} (${describeRep(g.need)})`).join(' · ')}
        </div>
      )}
      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Danh tiếng cao thì nhiều người đi đường ghé hơn, mở khách quen mới, hợp đồng và mục tiêu dịp lễ lớn.</div>
    </div>
  );
}

/** Bảng theo món: bấm tiêu đề để sắp xếp. */
export function ItemTable({ lines }: { lines: (ItemLine & { id: string; gross: number })[] }) {
  const [sort, setSort] = useState<'qty' | 'revenue' | 'gross'>('gross');
  if (!lines.length) return <p style={styles.sub}>Hôm nay chưa bán được món nào.</p>;
  const rows = [...lines].sort((a, b) => b[sort] - a[sort]);
  const head = (key: typeof sort, label: string) => (
    <th style={{ cursor: 'pointer', textDecoration: sort === key ? 'underline' : undefined }} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead>
        <tr><th style={styles.left}>Mặt hàng</th>{head('qty', 'Số món')}{head('revenue', 'Doanh thu')}{head('gross', 'Lãi gộp')}<th>Lãi/món</th></tr>
      </thead>
      <tbody>
        {rows.map((l) => {
          const p = productById(l.id);
          return (
            <tr key={l.id}>
              <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.revenue)}</td>
              <td style={{ color: l.gross >= 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(l.gross)}{formatMoney(l.gross)}</td>
              <td style={{ opacity: 0.8 }}>{formatMoney(Math.round(l.gross / l.qty))}</td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}

/** Đọc nhanh số tiền cho nhãn trên cột: 850k · 1,2tr (chỉ dùng khi cột thưa, còn chỗ). */
const compactMoney = (v: number) =>
  v >= 1_000_000 ? `${(Math.round(v / 100_000) / 10).toLocaleString('vi-VN')}tr` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : `${v}`;

/** Cột doanh thu và cột "tiền vào − tiền ra" của các ngày gần đây.
 *  GĐ1254 thiết kế lại theo QA người dùng (trước đây 2 vạch 7px lẻ loi giữa cột rộng xơi trống,
 *  không có baseline nên cột ngắn trông "lơ lửng", ngày doanh thu ~0 biến mất khỏi biểu đồ):
 *  cột chiếm ~72% bề rộng cột (co giãn theo số ngày, trần 56px), đường baseline liền mạch dưới cột,
 *  ngày lặng vẫn hiện vạch xám ngắn ở baseline, ngày thưa (≤8) có nhãn số đọc nhanh trên cột. */
export function HistoryChart({ history }: { history: DayRecord[] }) {
  if (history.length < 2) return null;
  const max = Math.max(1, ...history.map((h) => Math.max(h.revenue, Math.abs(h.profit))));
  const H = 70;
  // Cột thưa thì có chỗ in nhãn số; đông ngày (14–30 cột) chỉ đọc tooltip.
  const labeled = history.length <= 8;
  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}>
        <span style={{ opacity: 0.75 }}>{history.length} ngày gần đây</span>
        {([['#f1c40f', 'Doanh thu'], ['#2ecc71', 'Tiền vào − ra: lãi'], ['#e74c3c', 'Tiền vào − ra: lỗ']] as const).map(([color, label]) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Hàng cột: baseline liền mạch là đường viền dưới của cả khung cột */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: H + (labeled ? 14 : 0), borderBottom: '2px solid rgba(255,255,255,0.18)' }}>
          {history.map((h) => (
            <div key={h.day} title={`Ngày ${h.day}: doanh thu ${formatMoney(h.revenue)}, tiền vào − ra ${formatMoney(h.profit)}, ${h.customers} khách`}
              style={{ flex: '1 1 40px', minWidth: 0, maxWidth: 72, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '72%', maxWidth: 56, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                {h.revenue <= 0 && h.profit === 0 ? (
                  // Ngày nghỉ/không bán: vạch xám ngắn ở baseline để biểu đồ không bị "lỗ hổng"
                  <div style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: labeled ? 14 : 0 }} />
                ) : (
                  <>
                    {labeled && <span style={{ fontSize: 11, opacity: 0.85, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{compactMoney(h.revenue)}</span>}
                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                      <div style={{ flex: 1, minWidth: 6, height: Math.max(3, (h.revenue / max) * H), background: '#f1c40f', borderRadius: 2 }} />
                      <div style={{ flex: 1, minWidth: 6, height: Math.max(3, (Math.abs(h.profit) / max) * H), background: h.profit >= 0 ? '#2ecc71' : '#e74c3c', borderRadius: 2 }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Hàng nhãn ngày — cùng hệ chia cột với hàng cột để nhãn đứng đúng dưới cột của nó */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {history.map((h) => (
            <span key={h.day} style={{ flex: '1 1 40px', minWidth: 0, maxWidth: 72, textAlign: 'center', fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>{h.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sổ theo dõi: biểu đồ doanh thu – lãi – khách – sao của tối đa 30 ngày gần nhất (kèm số hôm nay đang chạy). */
export function HistoryPanel() {
  const { history, stats, day, closePanel } = useGame();
  const shelfHeat = useGame((s) => s.shelfHeat);
  const furnitureList = useGame((s) => s.furniture);
  const today: DayRecord = {
    day,
    revenue: stats.revenue,
    profit: stats.revenue - stats.spent - (stats.wages ?? 0) - (stats.rent ?? 0),
    customers: stats.customers,
    unhappy: stats.unhappy,
  };
  const days = [...history, today].slice(-14);
  const W = 620;
  const H = 190;
  const padL = 8;
  const padB = 22;
  const stepX = days.length > 1 ? (W - padL * 2) / (days.length - 1) : 0;
  const maxMoney = Math.max(...days.map((d) => Math.max(d.revenue, d.profit)), 1);
  const maxCust = Math.max(...days.map((d) => d.customers), 1);
  const x = (i: number) => padL + i * stepX;
  const yMoney = (v: number) => H - padB - (Math.max(v, 0) / maxMoney) * (H - padB - 10);
  const yCust = (v: number) => H - padB - (v / maxCust) * (H - padB - 10);
  const line = (pick: (d: DayRecord) => number) => days.map((d, i) => `${x(i)},${yMoney(pick(d))}`).join(' ');
  // Đường sao 1–5: vẽ trên cùng khung hình, càng cao càng tốt
  const rated = days.map((d, i) => ({ d, i })).filter(({ d }) => typeof d.rating === 'number');
  const ratingLine = rated.map(({ d, i }) => `${x(i)},${H - padB - ((d.rating! - 1) / 4) * (H - padB - 10)}`).join(' ');
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  const avgProfit = days.reduce((n, d) => n + d.profit, 0) / days.length;
  const zero = H - padB;
  return (
    <>
      <h2 style={styles.title}>📈 Sổ theo dõi 30 ngày</h2>
      <p style={styles.sub}>Doanh thu và lãi từng ngày (lãi hôm nay chưa trừ lương/tiền nhà tới khi sang ngày mới). Cột xám là số lượt khách. Dùng để nhìn đà tăng trưởng: nhập thêm hàng thì doanh thu có nhích không, khách có đông dần không.</p>
      {/* GĐ2349 — ngày đầu chưa có số liệu ngày trước: không vẽ ô SVG trắng trống, hiện lời dẫn */}
      {history.length === 0 ? (
        <div style={{ ...styles.card, justifyContent: 'flex-start', maxWidth: 560 }}>
          🌱 Mới khai trương — chưa có số liệu ngày trước. Bán vài ngày rồi quay lại đây xem đà tăng trưởng
          (doanh thu/lãi/khách từng ngày so cạnh nhau).
        </div>
      ) : (
      <>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, background: '#fafbfc', borderRadius: 8, border: '1px solid #e3e6ea' }}>
        <line x1={padL} y1={zero} x2={W - padL} y2={zero} stroke="#d6dae0" />
        {days.map((d, i) => (
          <g key={d.day}>
            <rect x={x(i) - 6} y={yCust(d.customers)} width={12} height={Math.max(1, zero - yCust(d.customers))} fill="#d9dee5" opacity={0.9}>
              <title>{`Ngày ${d.day}: ${d.customers} lượt khách`}</title>
            </rect>
                <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#8a919c">{d.day}</text>
          </g>
        ))}
        <polyline points={line((d) => d.revenue)} fill="none" stroke="#3498db" strokeWidth={2} />
        <polyline points={line((d) => d.profit)} fill="none" stroke="#2ecc71" strokeWidth={2} />
        {rated.length > 1 && <polyline points={ratingLine} fill="none" stroke="#f1c40f" strokeWidth={2} strokeDasharray="5 3" />}
      </svg>
      <p style={{ ...styles.sub, marginTop: 8 }}>
        <span style={{ color: '#3498db' }}>━ Doanh thu</span> · <span style={{ color: '#2ecc71' }}>━ Lãi</span> · <span style={{ color: '#f1c40f' }}>╌ ⭐ đánh giá</span> · ▮ Khách
      </p>
      <p style={styles.row}>
        🏆 Lãi nhất: <b>ngày {best.day}</b> — doanh thu {formatMoney(best.revenue)}, lãi {formatMoney(best.profit)}
      </p>
      <p style={{ ...styles.row, flexWrap: 'wrap' }}>📊 Lãi bình quân {days.length} ngày: <b>{formatMoney(avgProfit)}</b>/ngày · khách bình quân <b>{Math.round(days.reduce((n, d) => n + d.customers, 0) / days.length)}</b> lượt/ngày</p>
      </>
      )}
      {/* Heatmap vị trí kệ: kệ nào bán chạy nhất kể từ khi đặt (xem bản đồ màu ở màn 🏪 Sắp xếp → 🔥) */}
      {(() => {
        const ranked = furnitureList
          .filter((f) => furnitureDef(f.type).tiers > 0)
          .map((f) => ({ f, sold: shelfHeat[f.uid] ?? 0 }))
          .sort((a, b) => b.sold - a.sold);
        if (!ranked.length || ranked.every((r) => r.sold === 0)) return null;
        const top = ranked[0];
        const worst = ranked[ranked.length - 1];
        return (
          <p style={styles.row}>
            🔥 Kệ bán chạy nhất: <b>{furnitureDef(top.f.type).name}</b> ({top.sold} món)
            {worst.sold < top.sold && <> · kệ ế nhất: {furnitureDef(worst.f.type).name} ({worst.sold} món)</>}
            <> · xem bản đồ màu ở <b>🏪 Sắp xếp → 🔥</b>, kệ gần cửa/lối đi được khách để ý hơn</>
          </p>
        );
      })()}
      <Footer onClose={closePanel} />
    </>
  );
}
