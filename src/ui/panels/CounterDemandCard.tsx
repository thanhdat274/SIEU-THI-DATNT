import { useGame } from '../../core/store';
import { demandForecast } from '../../data/counterDemand';
import { professionBandMix, topSegmentsOf } from '../../data/professionDemand';
import { segmentHurt, recentLostByProduct, HIT_LABEL } from '../../data/segmentHurt';
import { productById } from '../../data/products';
import { counterThroughputNote } from '../../agents/customerEntity';
import { styles } from './shared';
import { t } from '../../core/i18n';

interface Props {
  demand: ReturnType<typeof demandForecast>;
  cleanStreak: number;
  cleanBest: number;
  cleanExtra: string;
}

/** GĐ920: tách khỏi MorningPanel (nguyên văn khối "Nhu cầu quầy hôm nay" GĐ78, thuần đọc). */
export function CounterDemandCard({ demand, cleanStreak, cleanBest, cleanExtra }: Props) {
  const openPanel = useGame((s) => s.openPanel);
  const level = useGame((s) => s.level);
  const day = useGame((s) => s.day);
  // GĐ1271 — "khung này AI đến?": soi phân khúc khách theo nghề cho khung giờ ĐÔNG NHẤT hôm nay
  // (nhu cầu quầy chỉ cho số khách/khung, không cho biết họ là ai). THUẦN đọc PROFESSIONS —
  // đúng trọng số pickProfession + món ưa thích professionWants; không đổi kinh tế/save/seed.
  const busiest = [...demand.bands].sort((a, b) => b.expected - a.expected)[0];
  const mix = busiest ? professionBandMix({ level, day, band: busiest, expected: busiest.expected }) : null;
  const segs = mix ? topSegmentsOf(mix) : [];
  // GĐ1276 — "phân khúc nào đang bị hụt?": quy lượt lỡ bán món trong 7 ngày gần (analytics) + lời chê
  // (reviews) về đúng món ưa của từng nghề → cho chủ biết nhóm khách nào cần nuôi. THUẦN đọc — không đổi
  // economy/save/seed, co-op an toàn. Chỉ hiện khi có tín hiệu thật (không ồn ngày ai cũng ổn).
  const analytics = useGame((s) => s.analytics);
  const reviews = useGame((s) => s.reviews);
  const topHurt = segmentHurt({ level, day, lostByProduct: recentLostByProduct(analytics, day), reviews })[0];
  return (
  <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '1px solid rgba(46,204,113,0.35)' }}>
    <b style={styles.cardTitle}>{t('panels_small.nhu_cau_quay_hom_nay')}</b>
    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
      ~{demand.expectedTotal}{' '}{t('panels_small.khach_du_kien_ca_ngay_dinh')}{' '}{demand.peakBands.join(', ')}{' '}{t('panels_small.uoc_luong_theo_nhip_le_thoi')}
    </div>
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
      {demand.bands.map((b, i) => (
        <div key={i} title={t('panels_small.khach_gio', { label: b.label, expected: b.expected, perHour: b.perHour })} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: '100%', height: Math.max(4, Math.round(b.pressure / 100 * 34)), background: b.peak ? '#2ecc71' : 'rgba(46,204,113,0.45)', borderRadius: 3 }} />
          {/* GĐ2368: cho nhãn co được — nowrap cứng từng đẩy min-content dãy chip ~308px
              (track lưới "Xem thêm" phình, cả cụm thẻ tràn khung ở màn hẹp); title trên chip giữ nhãn đầy đủ */}
          <span style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 12, marginTop: 4 }}>
      ⏰ {demand.bands.filter((b) => b.peak).slice(0, 2).map((b) => b.label).join(' · ') || demand.bands[0]?.label} đông: bày sẵn món &nbsp;
      <button onClick={() => openPanel({ type: 'order' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>{t('panels_small.cham_ke_mon_tu')}</button>
      · <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>{t('panels_small.du_nguoi_dung_quay')}</button>
    </div>
    {mix && segs.length > 0 && (
      <div style={{ fontSize: 12, marginTop: 3, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {t('panels_small.khung_dong_nhat')}{' '}<b>{mix.band.label}</b>: {segs.slice(0, 2).map((sg, i) => (
          <span key={sg.id}>
            {i > 0 && <>&nbsp;·&nbsp;</>}
            <span title={`${sg.name} — thích: ${sg.likes.slice(0, 4).join(', ') || 'nhiều món thoáng'} · nhạy giá ${sg.sensitivity} · kiên nhẫn ${sg.patience}`}>
              {sg.icon} {sg.name}{sg.likes[0] ? ` (hay mua ${sg.likes[0]})` : ''}
            </span>
          </span>
        ))}
      </div>
    )}
    {topHurt && (
      <div style={{ fontSize: 12, marginTop: 3, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <b>{t('panels_small.phan_khuc_dang_hut')}</b>{' '}
        <span title={`${topHurt.profession.name} — món ưa bị hụt: ${topHurt.affectedLikes.slice(0, 6).map((id) => productById(id)?.name ?? id).join(', ') || 'chưa xác định'}`}>
          {topHurt.profession.icon} {topHurt.profession.name}
          {topHurt.lost > 0 ? t('panels_small.luot_lo_mon', { lost: topHurt.lost }) : ''}
          {topHurt.complaints.slice(0, 2).map((c) => t('panels_small.che', { count: c.count, v1: HIT_LABEL[c.reason] })).join('')}
        </span>
      </div>
    )}
    <div style={{ fontSize: 11.5, marginTop: 3, opacity: 0.75 }}>{counterThroughputNote()}</div>
    <div style={{ fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {t('panels_small.nep_van_hanh_chuoi')}{' '}<b>{cleanStreak}</b>{' '}{t('panels_small.ngay_sach_ky_luc')}{' '}<b>{cleanBest}</b> · {cleanExtra}
    </div>
  </div>
  );
}
