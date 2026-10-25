import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { analyticsAdvice, itemHealthList, promoEffect, shelfCount, type ItemHealth } from '../../data/analytics';
import { Footer, styles } from './shared';

const abcColor = { A: '#2ecc71', B: '#f1c40f', C: '#95a5a6' } as const;

/** Sổ phân tích 30 ngày: bảng sức khoẻ món, gợi ý việc cần làm, phân tích ABC và tác động combo/giờ vàng. */
export function AnalyticsPanel() {
  const { analytics, storage, furniture, demand, level, shelfHeat, history, activeCombos, happyHour, biz, closePanel } = useGame();
  const onShelf = shelfCount(furniture);
  const list = itemHealthList(analytics, level, storage, onShelf, demand);
  const shelfIds = [...new Set(furniture.filter((f) => f.tiers.some((t) => t.count > 0)).map((f) => f.uid))];
  const advice = analyticsAdvice(list, shelfHeat, shelfIds);
  const comboFx = promoEffect(analytics, history, 'combo');
  const happyFx = promoEffect(analytics, history, 'happyHour');
  const counts = { A: 0, B: 0, C: 0 } as Record<ItemHealth['abc'], number>;
  for (const h of list) counts[h.abc]++;
  return (
    <>
      <h2 style={styles.title}>🩺 Sức khoẻ món hàng (30 ngày)</h2>
      {!list.length ? (
        <p style={styles.sub}>Chưa có số liệu: bán hàng một vài ngày là sổ tự ghi, phân tích hiện lên ở đây.</p>
      ) : (
        <>
          {!!advice.length && (
            <>
              <p style={styles.sub}><b>Gợi ý hôm nay</b></p>
              <div style={{ display: 'grid', gap: 4, maxWidth: 620, marginBottom: 12 }}>
                {advice.map((a, i) => (
                  <div key={i} style={{ ...styles.card, fontSize: 13 }}>{a.icon} {a.text}</div>
                ))}
              </div>
            </>
          )}
          <p style={styles.sub}>
            Phân tích ABC: nhóm <b style={{ color: abcColor.A }}>A</b> là {counts.A} món mang ~80% tổng lời,
            nhóm <b style={{ color: abcColor.B }}>B</b> {counts.B} món, còn lại <b>{counts.C}</b> món nhóm C — nhóm C nhiều quá thì dọn bớt cho kệ thoáng.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ opacity: 0.75, fontSize: 12 }}>
                  <th style={styles.left}>Món</th>
                  <th>ABC</th>
                  <th>Bán/tháng</th>
                  <th>Lời/tháng</th>
                  <th>Biên lãi</th>
                  <th>Hàng còn</th>
                  <th>Hỏng</th>
                  <th>Lỡ bán</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 25).map((h) => (
                  <tr key={h.id}>
                    <td style={styles.left}>{h.name}</td>
                    <td><b style={{ color: abcColor[h.abc] }}>{h.abc}</b></td>
                    <td>{Math.round(h.qty30)}</td>
                    <td style={{ color: h.profit30 >= 0 ? undefined : '#e74c3c' }}>{formatMoney(h.profit30)}</td>
                    <td>{Math.round(h.margin * 100)}%</td>
                    <td>{h.daysLeft === null ? '—' : h.daysLeft > 30 ? '>30 ngày' : `${h.daysLeft.toFixed(1)} ngày`}</td>
                    <td style={{ color: h.spoilShare > 0.2 ? '#e67e22' : undefined }}>{Math.round(h.spoilShare * 100)}%</td>
                    <td style={{ color: h.lostShare > 0.3 ? '#e67e22' : undefined }}>{Math.round(h.lostShare * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length > 25 && <p style={styles.sub}>Và {list.length - 25} món nữa, xếp theo lời giảm dần.</p>}
          <p style={styles.sub}>
            <b>Combo & giờ vàng:</b> {comboFx
              ? `ngày chạy combo doanh thu ${formatMoney(comboFx.withAvg)}/ngày vs ${formatMoney(comboFx.withoutAvg)} ngày thường (so sánh ${comboFx.withDays} vs ${comboFx.withoutDays} ngày).`
              : 'Chạy combo vài ngày là có số so sánh ngay tại đây.'}
            {' '}{happyFx
              ? `Giờ vàng: ${formatMoney(happyFx.withAvg)}/ngày vs ${formatMoney(happyFx.withoutAvg)}/ngày.`
              : ''}{' '}
            {activeCombos.length ? 'Đang chạy combo.' : ''}{happyHour ? ' Đang đặt giờ vàng.' : ''}
          </p>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
