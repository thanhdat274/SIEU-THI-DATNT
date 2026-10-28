import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { computeRecords, recordFeedToday } from '../../data/records';
import { Footer, styles } from './shared';

/** Sổ Kỷ Lục: cột mốc cá nhân cao nhất — mồi "phá kỷ lục của chính mình" để quay lại mỗi ngày. */
export function RecordsPanel() {
  const { history, soldEver, comboHitCount, level, biz, stats, closePanel } = useGame();
  const r = computeRecords({ history, soldEver, comboHitCount, level, prestigeBonus: biz.prestige.bonus });
  const fresh = r.daysTracked === 0;
  const feed = recordFeedToday(stats, r);
  const fmt = (f: (typeof feed)[number], v: number) => (f.unit === 'money' ? formatMoney(v) : `${v} lượt`);
  const card = (icon: string, label: string, value: React.ReactNode, tip?: string) => (
    <div style={{ ...styles.card, gap: 8, padding: '10px 12px', flex: '1 1 220px', minWidth: 200 }} title={tip}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{icon} {label}</div>
      <b style={{ fontSize: 15 }}>{value}</b>
    </div>
  );
  return (
    <>
      <h2 style={styles.title}>🏆 Sổ kỷ lục</h2>
      <p style={styles.sub}>
        Các cột mốc cao nhất của riêng tiệm bạn. Kỷ lục ngày tính trong {r.daysTracked} ngày theo dõi gần nhất
        — cứ phá kỷ lục của chính mình, tiệm ngày càng lớn. Không đổi cách chơi, chỉ để tự hào và trả lời "đã đi được bao xa".
      </p>
      {!fresh && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '2px 0 8px' }}>
            {feed.map((f) => (
              <div
                key={f.label}
                title="So với kỷ lục 1 ngày trọn vẹn — hôm nay chưa tính đơn online/ghi sổ nên thường còn tăng thêm cuối ngày"
                style={{ ...styles.card, gap: 4, padding: '8px 12px', flex: '1 1 200px', minWidth: 190, borderColor: f.beating ? '#27ae60' : undefined }}
              >
                <div style={{ fontSize: 13, opacity: 0.75 }}>{f.icon} {f.label}</div>
                <b style={{ fontSize: 15, color: f.beating ? '#27ae60' : undefined }}>{fmt(f, f.today)}</b>
                {f.beating ? (
                  <div style={{ fontSize: 12, color: '#27ae60', fontWeight: 600 }}>🔥 Đã phá kỷ lục! (cũ {fmt(f, f.best!)})</div>
                ) : f.best !== null && f.remaining > 0 ? (
                  <div style={{ fontSize: 12, ...(f.remaining <= Math.round(f.best * 0.2) ? { color: '#c9a20a', fontWeight: 600 } : { opacity: 0.7 }) }}>
                    🎯 Còn {fmt(f, f.remaining)} nữa là phá kỷ lục (kỷ lục {fmt(f, f.best)})
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p style={{ ...styles.sub, marginTop: -2 }}>Số hôm nay còn có thể cộng thêm đơn online… cuối ngày mới tính tổng. Càng gần kỷ lục, {`"còn bao nhiêu nữa"`} càng rõ để dứt điểm trước khi ngủ.</p>
        </>
      )}
      {fresh ? (
        <p style={styles.row}>🌱 Mới khai trương! Chơi qua vài ngày để có kỷ lục đầu tiên.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {card('💰', 'Thu nhập cao nhất / ngày', r.bestRevenueDay ? `${formatMoney(r.bestRevenueDay.value)} (ngày ${r.bestRevenueDay.day})` : '—')}
          {card('💹', 'Lãi cao nhất / ngày', r.bestProfitDay ? `${formatMoney(r.bestProfitDay.value)} (ngày ${r.bestProfitDay.day})` : '—')}
          {card('🧑‍🤝‍🧑', 'Đông khách nhất / ngày', r.bestCustomersDay ? `${r.bestCustomersDay.value} lượt (ngày ${r.bestCustomersDay.day})` : '—')}
          {card('📚', 'Tổng thu nhập theo dõi', formatMoney(r.totalRevenue))}
          {card('🚶', 'Tổng lượt khách', `${r.totalCustomers}`)}
          {card('⭐', 'Cấp hiện tại', `${r.level}${r.prestigeBonus > 0 ? ` · NG+ ${Math.round(r.prestigeBonus * 100)}%` : ''}`)}
          {card('📦', 'Món yêu thích nhất', r.favoriteProduct ? `${r.favoriteProduct.name} (${r.favoriteProduct.qty})` : '—')}
          {card('🎁', 'Combo kích hoạt nhất', r.bestCombo ? `${r.bestCombo.name} (${r.bestCombo.hits} lần)` : '—')}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
