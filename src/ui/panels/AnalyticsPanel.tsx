import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { analyticsAdvice, itemHealthList, promoEffect, shelfCount, type ItemHealth } from '../../data/analytics';
import { profitMix } from '../../data/profitMix';
import { shelfSlotValue } from '../../data/shelfSlotValue';
import { furnitureDef } from '../../data/furniture';
import { shelfEfficiency } from '../../data/layout';
import { Callout, Footer, styles } from './shared';

const abcColor = { A: '#2ecc71', B: '#f1c40f', C: '#95a5a6' } as const;

/** Sổ phân tích 30 ngày: bảng sức khoẻ món, gợi ý việc cần làm, phân tích ABC và tác động combo/giờ vàng. */
export function AnalyticsPanel() {
  const { analytics, storage, furniture, demand, level, shelfHeat, shelfProfit, day, history, activeCombos, happyHour, biz, closePanel } = useGame();
  const onShelf = shelfCount(furniture);
  const list = itemHealthList(analytics, level, storage, onShelf, demand);
  const shelfIds = [...new Set(furniture.filter((f) => f.tiers.some((t) => t.count > 0)).map((f) => f.uid))];
  const advice = analyticsAdvice(list, shelfHeat, shelfIds);
  const efficiency = shelfEfficiency(furniture, shelfProfit, day);
  const comboFx = promoEffect(analytics, history, 'combo');
  const happyFx = promoEffect(analytics, history, 'happyHour');
  const adsFx = promoEffect(analytics, history, 'ads');
  const counts = { A: 0, B: 0, C: 0 } as Record<ItemHealth['abc'], number>;
  for (const h of list) counts[h.abc]++;
  return (
    <>
      {!!efficiency.length && (
        <>
          <h2 style={styles.title}>📐 Lời trên mỗi m² kệ</h2>
          <p style={styles.sub}>Kệ nào sinh lời nhiều nhất trên mỗi mét vuông sàn mỗi ngày — kệ cuối bảng chiếm chỗ mà ít lời, nên dời hoặc đổi hàng lời cao lên tầng ngang tầm mắt.</p>
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ opacity: 0.75, fontSize: 12 }}>
                  <th style={styles.left}>Kệ</th><th>Diện tích</th><th>Lời tích luỹ</th><th>Số ngày</th><th>Lời/m²/ngày</th>
                </tr>
              </thead>
              <tbody>
                {efficiency.map((e, i) => (
                  <tr key={e.uid}>
                    <td style={styles.left}>{furnitureDef(e.type).name} #{e.uid}</td>
                    <td>{e.area.toFixed(1)} m²</td>
                    <td>{formatMoney(e.profit)}</td>
                    <td>{e.days}</td>
                    <td style={{ color: i === 0 ? '#2ecc71' : i === efficiency.length - 1 && efficiency.length > 2 ? '#e67e22' : undefined }}>
                      <b>{formatMoney(e.perM2Day)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
          {(() => {
            const mix = profitMix(list);
            if (mix.top.length === 0) return null;
            return (
              <Callout tone={mix.fragile ? 'warn' : 'accent'} style={{ marginBottom: 10 }} title={`📈 Lời 30 ngày: ${formatMoney(mix.totalProfit30)} · top ${mix.top.length} món gánh ${Math.round(mix.topShare * 100)}%`}>
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {mix.top.map((t) => `${t.name} ${formatMoney(t.profit30)} (${Math.round(t.share * 100)}%)`).join(' · ')}
                  {mix.negativeCount > 0 && ` · ${mix.negativeCount} món đang lỗ tổng ${formatMoney(mix.negativeLoss30)}.`}
                  {mix.fragile
                    ? ' Chỉ dựa vài món — đứt nguồn món đó là mất phần lớn lời, nên đa dạng thêm.'
                    : ' Lời dàn đều, bớt rủi ro tập trung.'}
                </div>
              </Callout>
            );
          })()}
          {(() => {
            const slot = shelfSlotValue(list, onShelf);
            if (!slot.actionable) return null;
            const worst = slot.slow.slice(0, 3);
            return (
              <Callout tone="warn" style={{ marginBottom: 10 }} title={`🔎 Món đang chiếm kệ lép vốn (${worst.length}${slot.slow.length > worst.length ? '+' : ''}): nên bày bớt / đổi món`}>
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {worst.map((s) => `${s.name} (${s.onShelf} ô · ${formatMoney(s.perSlot ?? 0)}/ô/ngày)`).join(' · ')}
                  {slot.best != null
                    ? ` · món khoẻ nhất kệ đạt ${formatMoney(slot.best)}/ô/ngày — ${worst.length} món trên đang chiếm chỗ mà sinh lời non nửa ngưỡng đó.`
                    : ' · đang lỗ, dọn sớm cho kệ thoáng.'}
                </div>
              </Callout>
            );
          })()}
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
            {adsFx ? `Quảng cáo: ${formatMoney(adsFx.withAvg)}/ngày vs ${formatMoney(adsFx.withoutAvg)}/ngày (${adsFx.withDays} vs ${adsFx.withoutDays} ngày).` : ''}
            {activeCombos.length ? 'Đang chạy combo.' : ''}{happyHour ? ' Đang đặt giờ vàng.' : ''}
          </p>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
