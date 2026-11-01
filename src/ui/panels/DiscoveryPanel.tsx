import { useState } from 'react';
import { useGame } from '../../core/store';
import { CATEGORIES, formatMoney } from '../../data/products';
import {
  DISCOVERY_MILESTONES, discoveryReward, discoveryRows, nextMilestone, soldCount, totalProducts,
  type DiscoveryStatus,
} from '../../data/discovery';
import { Footer, styles } from './shared';

const CATEGORY_LABEL = { ...CATEGORIES, all: 'Tất cả ngành' } as const;
const STATUS_ALL = 'all' as const;
type StatusFilter = DiscoveryStatus | typeof STATUS_ALL;

const STATUS_LABEL: Record<DiscoveryStatus | typeof STATUS_ALL, string> = {
  sold: '✅ Đã bán',
  unbought: 'Chưa bán',
  locked: '🔒 Khóa',
  all: 'Tất cả trạng thái',
};
const STATUS_COLOR: Record<DiscoveryStatus, string> = {
  sold: '#2ecc71', unbought: '#e5c07b', locked: '#7f8c8d',
};

/** Sổ tay Tiệm (GĐ36): album thu thập hàng hóa — đã khám phá/đã bán được bao nhiêu món, kèm mốc thưởng. */
export function DiscoveryPanel() {
  const { level, storage, furniture, soldEver, biz, closePanel } = useGame();
  const [cat, setCat] = useState<string>('all');
  const [stat, setStat] = useState<StatusFilter>('all');
  const [maxLevel, setMaxLevel] = useState<number>(level);

  const rows = discoveryRows(level, storage, furniture, soldEver);
  const total = totalProducts();
  const sold = soldCount(soldEver);
  const claimed = biz.discoveryClaimed ?? [];
  const next = nextMilestone(sold, claimed);
  const pct = total > 0 ? (sold / total) * 100 : 0;

  // Bộ lọc: ngành + trạng thái + mở khóa tới cấp 'maxLevel' (để cao hơn cấp hiện tại là nhìn trước món sắp mở)
  const filtered = rows.filter((r) =>
    (cat === 'all' || r.category === cat) &&
    (stat === 'all' || r.status === stat) &&
    r.unlock <= maxLevel,
  );

  const catCounts: Record<string, number> = { all: total };
  for (const r of rows) catCounts[r.category] = (catCounts[r.category] ?? 0) + 1;

  return (
    <>
      <h2 style={styles.title}>🔍 Sổ tay Tiệm — Album hàng hóa</h2>
      <p style={styles.sub}>
        Đã bán và khám phá hàng của tiệm. Bán món nào ở quầy hoặc giao đơn (điện thoại, tiệc, hợp đồng, app)
        là món đó được đánh dấu <b style={{ color: STATUS_COLOR.sold }}>đã bán</b>. Mở khóa đủ cấp là nắm được
        "tiệm có gì, sắp có gì".
      </p>

      {/* Tiến độ tổng */}
      <div style={styles.card}>
        <span style={{ fontSize: 15 }}>📦</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>{sold} / {total} món</b>
          <div style={{ height: 10, background: '#2a2a3a', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#2ecc71', borderRadius: 6 }} />
          </div>
          <small style={{ opacity: 0.75 }}>{pct.toFixed(1)}% hàng của tiệm đã từng bán</small>
        </div>
      </div>

      {/* Mốc thưởng */}
      <p style={{ ...styles.sub, marginTop: 12 }}><b>Mốc thu thập</b> — mỗi mốc nhận thưởng nhỏ một lần khi đạt đủ N món đã bán.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 4 }}>
        {DISCOVERY_MILESTONES.map((m) => {
          const got = claimed.includes(m);
          const reached = sold >= m;
          const r = discoveryReward(m);
          return (
            <div key={m} style={{ ...styles.card, flexDirection: 'column', alignItems: 'flex-start', opacity: reached ? 1 : 0.55 }}>
              <b style={{ color: got ? STATUS_COLOR.sold : '#f1c40f' }}>{got ? '✅' : reached ? '🎯' : '🔒'} Mốc {m}</b>
              <small style={{ opacity: 0.8 }}>{formatMoney(r.money)} · +{r.xp} XP</small>
            </div>
          );
        })}
      </div>
      {next && <p style={{ ...styles.sub, color: '#f1c40f' }}>💡 Còn {next - sold} món nữa là tới mốc {next} (thưởng {formatMoney(discoveryReward(next).money)}).</p>}

      {/* Bộ lọc — GĐ264/265: @390 hai select Chia đôi bề rộng bị cắt chữ giữa từ → cho wrap,
          select hẹp quá 180px thì rơi xuống dòng chiếm trọn bề rộng (chỉ đụng bảng này). */}
      <div style={{ ...styles.row, flexWrap: 'wrap' }}>
        <select style={{ ...styles.select, minWidth: 180 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          {['all', ...Object.keys(CATEGORIES)].map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]} ({catCounts[c] ?? 0})</option>
          ))}
        </select>
        <select style={{ ...styles.select, minWidth: 180 }} value={stat} onChange={(e) => setStat(e.target.value as StatusFilter)}>
          {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div style={styles.row}>
        <label style={{ fontSize: 13, opacity: 0.75 }}>📈 Tới cấp:</label>
        <input type="number" min={1} max={100} value={maxLevel} style={{ width: 90 }} onChange={(e) => setMaxLevel(Math.max(1, Math.min(100, Number(e.target.value) || level)))} />
        <small style={{ opacity: 0.6 }}>(mặc định = cấp hiện tại, để cao hơn để "nhìn trước")</small>
      </div>

      {/* Danh sách */}
      {filtered.length === 0 ? (
        <p style={styles.sub}>Không có món nào khớp bộ lọc.</p>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: '38vh', border: '1px solid #0004', borderRadius: 8, padding: 6 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ ...styles.card, margin: '4px 0', padding: '6px 10px' }} title={r.status === 'locked' ? `Mở khóa cấp ${r.unlock}` : `Đã bán ${r.soldQty} món`}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#' + r.color.toString(16).padStart(6, '0'), border: '1px solid #0004', flex: '0 0 auto' }} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>{r.name}</b>
                <small style={{ opacity: 0.7, marginLeft: 8 }}>{CATEGORIES[r.category]}</small>
              </div>
              <small style={{ opacity: 0.7 }}>{formatMoney(r.sell)}</small>
              <span style={{ fontSize: 12, color: r.status === 'sold' ? STATUS_COLOR.sold : r.status === 'unbought' ? (r.owned ? '#e67e22' : STATUS_COLOR.unbought) : STATUS_COLOR.locked, whiteSpace: 'nowrap' }}>
                {r.status === 'sold' ? (`✅ đã bán${r.soldQty > 0 ? ' · ' + r.soldQty : ''}`) : r.status === 'locked' ? (`🔒 cấp ${r.unlock}`) : (r.owned ? '📦 đang có' : 'chưa bán')}
              </span>
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
