import { crisisDefById, crisisEffects, crisisPhaseLabel, type CrisisState } from '../../data/crisis';
import { formatMoney } from '../../data/products';
import { useGame } from '../../core/store';
import { styles } from './shared';

/** GĐ Hệ8-L3/L2 (SPEC-CHIEU-RONG §8.7) — Thẻ "🚧 Biến cố dài" trong Sổ đầu ngày.
 *  Chỉ hiện khi `biz.crisis` đang mở (mở/đóng bởi crisisNight ở endDay). Cho biết đợt nào, giai
 *  đoạn nào, hiệu ứng HÔM NAY bằng số, và 3 việc chuẩn bị còn làm được kèm giá (bấm là làm).
 *  Khi làm xong việc thì dòng hiệu ứng đổi theo crisisEffects (lấy max traffic / override kênh). */
export function CrisisCard({ biz, day }: { biz: { crisis?: CrisisState }; day: number }) {
  const st = biz.crisis;
  const def = st ? crisisDefById(st.defId) : undefined;
  const money = useGame((s) => s.money);
  const doPrep = useGame((s) => s.doCrisisPrep);
  if (!st || !def) return null;
  const e = crisisEffects(st, day);
  const phase = crisisPhaseLabel(def, day, st);
  const effects: string[] = [];
  if (e.traffic !== undefined && e.traffic !== 1) effects.push(`khách ×${e.traffic.toFixed(2)}`);
  if (e.channel) {
    if (e.channel.online !== undefined && e.channel.online !== 1) effects.push(`online ×${e.channel.online.toFixed(2)}`);
    if (e.channel.phone !== undefined && e.channel.phone !== 1) effects.push(`điện thoại ×${e.channel.phone.toFixed(2)}`);
  }
  if (e.dirt) effects.push(`bẩn sàn ×${e.dirt}`);
  if (e.supplyDelay) effects.push(`hàng mối trễ ${Math.round(e.supplyDelay * 100)}%`);
  const notDone = def.preps.filter((p) => !st.preps.includes(p.id));
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
      <b style={{ ...styles.cardTitle, color: '#a0522d' }}>{def.icon} {def.name} · {phase}</b>
      {effects.length > 0 && (
        <div style={{ marginTop: 2, color: '#8b0000' }}>Hôm nay: {effects.join(' · ')}.</div>
      )}
      {notDone.length > 0 ? (
        <div style={{ marginTop: 4 }}>Chuẩn bị để đỡ thiệt:
          {notDone.map((p) => (
            <div key={p.id} style={{ marginTop: 2 }}>
              <button
                onClick={() => doPrep(p.id)}
                disabled={money < p.cost}
                title={p.effect}
                style={{ background: 'transparent', border: '1px solid #b8860b', borderRadius: 4, padding: '1px 6px', color: '#a0522d', cursor: money < p.cost ? 'not-allowed' : 'pointer', fontSize: 11, marginRight: 4 }}
              >
                {money < p.cost ? '🔒' : '✔'} {p.label} · {formatMoney(p.cost)}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 4, color: '#2ecc71' }}>Đã chuẩn bị đủ — đợt này thiệt hại được làm dịu.</div>
      )}
    </div>
  );
}
