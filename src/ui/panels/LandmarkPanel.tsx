import { useGame } from '../../core/store';
import { feedCost, landmark2Progress, landmarkProgress, LANDMARK_STAGES, LANDMARK2_STAGES, LANDMARK_TARGETS, LANDMARK2_TARGETS } from '../../data/landmark';
import { landmarkPayoff } from '../../data/landmarkPayoff';
import { formatMoney } from '../../data/products';
import { Footer, styles } from './shared';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

const formatMoneyShort = (v: number) => v >= 1_000_000 ? `${fmtNum((v / 1_000_000))}tr` : `${fmtNum(Math.round(v / 1000))}k`;
const TOTAL = LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1];
const TOTAL2 = LANDMARK2_TARGETS[LANDMARK2_TARGETS.length - 1];

/** Công trình khu phố — Sân chơi Trẻ Em (GĐ40): mỗi ngày góp một lượt cho tới khi khánh thành.
 *  GĐ732: sân chơi xong → dự án thứ 2 "Đèn Đường Ngõ 1" (20 lượt) — payoff khách đêm +15%. */
export function LandmarkPanel() {
  const { day, level, money, contributeLandmark, closePanel } = useGame();
  const landmark = useGame((s) => s.biz.landmark);
  const { contributions, lastContributeDay } = landmark;
  const history = useGame((s) => s.history);
  const prog = landmarkProgress(contributions);
  const prog2 = landmark2Progress(contributions);
  const isP2 = prog.done;

  // ── Dự án 2: Đèn Đường Ngõ 1 (GĐ732) ──
  if (isP2) {
    const p2 = prog2 ?? { index: 0, into: 0, pct: 0, done: false };
    const stage = LANDMARK2_STAGES[p2.index];
    const alreadyToday = p2.done || lastContributeDay === day;
    const cost = feedCost(p2.index, level);
    const broke = !p2.done && !alreadyToday && money < cost;
    const disabled = p2.done || alreadyToday || broke;
    const nextStage = p2.index < LANDMARK2_STAGES.length - 1 ? LANDMARK2_STAGES[p2.index + 1] : null;
    const doneTurns = contributions - TOTAL;
    return (
      <>
        <h2 style={styles.title}>{t('brand.cong_trinh_den_duong_ngo_1')}</h2>
        <p style={styles.sub}>
          {t('brand.san_choi_da_xong_gio_ca')}{' '}<b>{t('brand.den_duong')}</b>{t('brand.dem_hem_sang_sua_khach_dem')}{' '}<b>+15%</b>{' '}{t('brand.khi_thap_sang_moi_ngay_gop')}{' '}<b>{TOTAL2 - TOTAL}{' '}{t('brand.luot')}</b>{' '}{t('brand.la_thap_sang')}
        </p>
        <div style={{ margin: '6px 0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
            <span>{t('brand.luot_gop_du_an_den')}{' '}{doneTurns}/{TOTAL2 - TOTAL}</span>
            <span>{Math.round(p2.pct * 100)}%</span>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: '#3a3a4d', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${p2.pct * 100}%`, borderRadius: 7, background: '#f1c40f', transition: 'width .3s' }} />
          </div>
        </div>
        <div style={{ ...styles.card, marginTop: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 30 }}>{p2.done ? '💡' : stage.icon}</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 15 }}>{p2.done ? t('brand.da_thap_sang') : `${stage.icon} ${stage.title}`}</b>
            <div style={{ fontSize: 13, opacity: 0.8, margin: '2px 0' }}>{p2.done ? t('brand.den_duong_ngo_1_thap_sang') : stage.desc}</div>
            {!p2.done && <small style={{ opacity: 0.7 }}>{t('brand.trong_giai_doan')}{' '}{p2.into}/{LANDMARK2_TARGETS[p2.index] - TOTAL}{' '}{t('brand.luot')}</small>}
          </div>
        </div>
        {nextStage ? (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            {t('brand.giai_doan_ke_tiep')}{' '}<b>{nextStage.icon} {nextStage.title}</b> ({nextStage.desc}{t('brand.thuong')}{' '}
            <b>+{formatMoneyShort(nextStage.bonusMoney)} + {nextStage.bonusXp} XP</b>
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 13, color: '#a3e4a3' }}>
            {t('brand.den_thap_sang_ca_ngo_khach')}
          </div>
        )}
        <p style={{ margin: '12px 0 4px', fontSize: 13 }}>
          {t('brand.chi_phi_mot_luot_gop_hom')}{' '}<b>{formatMoneyShort(cost)}</b>
          {p2.done && t('brand.khong_can_gop_nua')}
        </p>
        <button
          style={{ ...styles.btn, marginLeft: 0, background: disabled ? '#666' : '#e67e22', color: '#fff', cursor: disabled ? 'default' : 'pointer', padding: '8px 14px', fontSize: 14 }}
          onClick={contributeLandmark}
          disabled={disabled}
        >
          {p2.done ? t('brand.da_thap_sang_2') : alreadyToday ? t('brand.hom_nay_da_gop') : t('brand.gop_vat_lieu_1_hom_nay', { v0: formatMoneyShort(cost) })}
        </button>
        {broke && !p2.done && !alreadyToday && (
          <small style={{ display: 'block', margin: '6px 0 0', color: '#f0a35c' }}>{t('brand.chua_du_tien_mua_vat_lieu')}{' '}{formatMoneyShort(cost)})</small>
        )}
        <Footer onClose={closePanel} />
      </>
    );
  }

  // ── Dự án 1: Sân chơi (nguyên vẹn từ GĐ40) ──
  const stage = LANDMARK_STAGES[prog.index];
  const done = prog.done;
  const alreadyToday = !done && lastContributeDay === day;
  const cost = feedCost(prog.index, level);
  const broke = !done && !alreadyToday && money < cost;
  const nextStage = prog.index < LANDMARK_STAGES.length - 1 ? LANDMARK_STAGES[prog.index + 1] : null;
  const disabled = done || alreadyToday || broke;
  const disabledReason = done
    ? t('brand.san_choi_da_khanh_thanh_roi')
    : alreadyToday
      ? t('brand.hom_nay_da_gop_roi_mai')
      : broke
        ? t('brand.chua_du_tien_mua_vat_lieu_2', { v0: formatMoneyShort(cost) })
        : undefined;
  // GĐ158 — thẻ soi sáng "góp bao nhiêu, còn bao nhiêu, đáng không" (thuần đọc, không đổi kinh tế/save).
  const payoff = landmarkPayoff(landmark, level, history);
  const gain = payoff.dailyGainEst;
  const smallGain = gain !== null && gain < 1_000;

  return (
    <>
      <h2 style={styles.title}>{t('brand.cong_trinh_san_choi')}</h2>
      <p style={styles.sub}>
        {t('brand.hem_cung_nhau_gop_vat_lieu')}{' '}{TOTAL}{' '}{t('brand.luot_la_khanh_thanh_ca_hem')}
      </p>

      {/* Tiến độ tổng */}
      <div style={{ margin: '6px 0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
          <span>{t('brand.da_gop')}{' '}{contributions}/{TOTAL}{' '}{t('brand.luot')}</span>
          <span>{Math.round(prog.pct * 100)}%</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, background: '#3a3a4d', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog.pct * 100}%`, borderRadius: 7, background: '#2ecc71', transition: 'width .3s' }} />
        </div>
      </div>

      {/* Giai đoạn đang ở */}
      <div style={{ ...styles.card, marginTop: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 30 }}>{done ? '🏟️' : stage.icon}</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 15 }}>{done ? t('brand.khanh_thanh') : `${stage.icon} ${stage.title}`}</b>
          <div style={{ fontSize: 13, opacity: 0.8, margin: '2px 0' }}>{done ? t('brand.san_choi_dau_hem_da_hoan') : stage.desc}</div>
          {!done && (
            <small style={{ opacity: 0.7 }}>
              {t('brand.trong_giai_doan')}{' '}{prog.into}/{LANDMARK_TARGETS[prog.index]}{' '}{t('brand.luot')}
            </small>
          )}
        </div>
      </div>

      {/* Phần thưởng giai đoạn kế tiếp */}
      {nextStage ? (
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
          {t('brand.giai_doan_ke_tiep')}{' '}<b>{nextStage.icon} {nextStage.title}</b> ({nextStage.desc}{t('brand.thuong')}{' '}
          <b>+{formatMoneyShort(nextStage.bonusMoney)} + {nextStage.bonusXp} XP</b>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 13, color: '#a3e4a3' }}>
          {t('brand.da_hoan_thanh_ca_4_giai')}
        </div>
      )}

      {/* GĐ158 — Soi sáng: góp bao nhiêu, còn bao nhiêu, đáng không (thuần đọc) */}
      <div style={{ ...styles.card, display: 'block', marginTop: 12 }}>
        <b style={{ fontSize: 13 }}>{t('brand.gop_bao_nhieu_dang_khong')}</b>
        <div style={{ fontSize: 12, opacity: 0.88, marginTop: 4, lineHeight: 1.55 }}>
          {payoff.done ? (
            <>
              <div>
                {t('brand.da_khanh_thanh_da_gop_uoc')}<b>{formatMoney(payoff.spentEst)}</b>
                {gain !== null && !smallGain ? (
                  <>{' '}{t('brand.khach_tiem_chinh_dong_them_6')}{' '}<b>+{formatMoney(gain)}{t('brand.ngay_3')}</b>{' '}{t('brand.tu_ngay_khanh_thanh')}</>
                ) : (
                  <>{' '}{t('brand.khach_tiem_chinh_dong_them_6_2')}</>
                )}
              </div>
              {smallGain && (
                <div>{t('brand.doanh_thu_dong_them_khiem_ton')}</div>
              )}
            </>
          ) : (
            <>
              <div>
                {t('brand.da_gop_2')}<b>{payoff.contributedTurns}</b>{' '}{t('brand.luot_uoc')}<b>{formatMoney(payoff.spentEst)}</b>{t('brand.con')}{' '}
                <b>{payoff.remainingTurns}</b>{' '}{t('brand.luot_2')}<b>{formatMoney(payoff.remainingCostEst)}</b>{' '}{t('brand.nua_la_khanh_thanh')}
              </div>
              {gain === null ? (
                <div>{t('brand.ban_hang_vai_ngay_de_uoc')}</div>
              ) : smallGain ? (
                <div>{t('brand.khach_dong_them_khiem_ton_gop')}</div>
              ) : (
                <div>
                  {t('brand.xong_roi_khach_tiem_chinh_dong')}{' '}<b>+{formatMoney(gain)}{t('brand.ngay_3')}</b>{' '}{t('brand.toan_bo_khoan_gop_hoa_lai')}<b>{payoff.paybackDays}</b>{' '}{t('brand.ngay_ban')}
                </div>
              )}
              <div>{t('brand.moi_ngay_gop_1_luot_la')}</div>
            </>
          )}
        </div>
      </div>

      {/* Chi phí hôm nay + nút góp */}
      <p style={{ margin: '12px 0 4px', fontSize: 13 }}>
        {t('brand.chi_phi_mot_luot_gop_hom')}{' '}<b>{formatMoneyShort(cost)}</b>
        {done && t('brand.khong_can_gop_nua')}
      </p>
      <button
        style={{ ...styles.btn, marginLeft: 0, background: disabled ? '#666' : '#e67e22', color: '#fff', cursor: disabled ? 'default' : 'pointer', padding: '8px 14px', fontSize: 14 }}
        onClick={contributeLandmark}
        disabled={disabled}
        title={disabledReason}
      >
        {done ? t('brand.da_khanh_thanh') : alreadyToday ? t('brand.hom_nay_da_gop') : t('brand.gop_vat_lieu_1_hom_nay_2', { v0: formatMoneyShort(cost) })}
      </button>
      {disabledReason && !done && (
        <small style={{ display: 'block', margin: '6px 0 0', color: '#f0a35c' }}>{disabledReason}</small>
      )}

      <Footer onClose={closePanel} />
    </>
  );
}
