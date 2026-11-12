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
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #e67e22' }}>
      <b style={{ ...styles.cardTitle, color: '#e67e22' }}>{def.icon} {def.name} · {phase}</b>
      {effects.length > 0 && (
        <div style={{ marginTop: 2, color: '#ff7675' }}>Hôm nay: {effects.join(' · ')}.</div>
      )}
      {notDone.length > 0 ? (
        <div style={{ marginTop: 4 }}>Chuẩn bị để đỡ thiệt:
          {notDone.map((p) => (
            <div key={p.id} style={{ marginTop: 4 }}>
              <button
                onClick={() => doPrep(p.id)}
                disabled={money < p.cost}
                title={p.effect}
                style={{ background: 'rgba(241, 196, 15, 0.14)', border: '1px solid rgba(241, 196, 15, 0.45)', borderRadius: 4, padding: '2px 8px', color: '#f5d799', cursor: money < p.cost ? 'not-allowed' : 'pointer', fontSize: 11, marginRight: 4, opacity: money < p.cost ? 0.5 : 1 }}
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

/** L4 — Bảng tổng kết cuối đợt (SPEC-CHIEU-RONG §8.3/§8.7): sáng ngày sau đợt kết thúc, tóm tắt
 *  nhờ chuẩn bị cứu được bao nhiêu + lợi sau đợt (đường mới). `lastCrisis` do crisisNight ghi đêm đóng.
 *  Chỉ hiện ĐÚNG một buổi sáng (endDay + 1), rồi thôi. */
export function CrisisSummaryCard({
  biz,
  day,
}: {
  biz: { lastCrisis?: { defId: string; endDay: number; loss: number; saved: number }; roadBoon?: boolean };
  day: number;
}) {
  const last = biz.lastCrisis;
  // Bảng tổng kết chỉ hiện sáng ngay sau ngày đợt khép (lastCrisis.endDay), không hiện lại sau đó.
  if (!last || last.endDay !== day - 1) return null;
  const def = crisisDefById(last.defId);
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #2ecc71' }}>
      <b style={{ ...styles.cardTitle, color: '#2ecc71' }}>✅ {def?.icon} Đợt {def?.name} đã kết thúc</b>
      <div style={{ marginTop: 2 }}>
        {last.saved > 0
          ? <>Nhờ {last.saved >= 750_000 ? 'chuẩn bị kỹ càng' : 'các việc chuẩn bị'}, đợt này thiệt hại được làm dịu, ước cứu được <b>{formatMoney(last.saved)}</b>.</>
          : <>Bạn đã trải qua đợt này mà không chuẩn bị gì — may là vẫn vượt qua được.</>}
      </div>
      {def && biz.roadBoon && <div style={{ marginTop: 2, color: '#2ecc71' }}>Đường mới khang trang — từ nay khách ghé thêm một chút.</div>}
    </div>
  );
}
