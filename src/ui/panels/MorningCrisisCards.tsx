import { crisisDefById, crisisEffects, crisisPhaseLabel, type CrisisState } from '../../data/crisis';
import { formatMoney } from '../../data/products';
import { useGame } from '../../core/store';
import { styles } from './shared';
import { t } from '../../core/i18n';

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
  if (e.traffic !== undefined && e.traffic !== 1) effects.push(t('panels_morning.khach', { v0: e.traffic.toFixed(2) }));
  if (e.channel) {
    if (e.channel.online !== undefined && e.channel.online !== 1) effects.push(`online ×${e.channel.online.toFixed(2)}`);
    if (e.channel.phone !== undefined && e.channel.phone !== 1) effects.push(t('panels_morning.dien_thoai', { v0: e.channel.phone.toFixed(2) }));
  }
  if (e.dirt) effects.push(t('panels_morning.ban_san', { dirt: e.dirt }));
  if (e.supplyDelay) effects.push(t('panels_morning.hang_moi_tre', { v0: Math.round(e.supplyDelay * 100) }));
  const notDone = def.preps.filter((p) => !st.preps.includes(p.id));
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #e67e22' }}>
      <b style={{ ...styles.cardTitle, color: '#e67e22' }}>{def.icon} {def.name} · {phase}</b>
      {effects.length > 0 && (
        <div style={{ marginTop: 2, color: '#ff7675' }}>{t('panels_morning.hom_nay')}{' '}{effects.join(' · ')}.</div>
      )}
      {notDone.length > 0 ? (
        <div style={{ marginTop: 4 }}>{t('panels_morning.chuan_bi_de_do_thiet')}
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
        <div style={{ marginTop: 4, color: '#2ecc71' }}>{t('panels_morning.da_chuan_bi_du_dot_nay')}</div>
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
      <b style={{ ...styles.cardTitle, color: '#2ecc71' }}>✅ {def?.icon}{' '}{t('panels_morning.dot')}{' '}{def?.name}{' '}{t('panels_morning.da_ket_thuc')}</b>
      <div style={{ marginTop: 2 }}>
        {last.saved > 0
          ? <>{t('panels_morning.nho')}{' '}{last.saved >= 750_000 ? t('panels_morning.chuan_bi_ky_cang') : t('panels_morning.cac_viec_chuan_bi')}{t('panels_morning.dot_nay_thiet_hai_duoc_lam')}{' '}<b>{formatMoney(last.saved)}</b>.</>
          : <>{t('panels_morning.ban_da_trai_qua_dot_nay')}</>}
      </div>
      {def && biz.roadBoon && <div style={{ marginTop: 2, color: '#2ecc71' }}>{t('panels_morning.duong_moi_khang_trang_tu_nay')}</div>}
    </div>
  );
}
