import { useGame } from '../../core/store';
import { signHiepLuc } from '../../core/biz';
import { formatMoney } from '../../data/products';
import { HIEPLUC_COC, HIEPLUC_MIN, HIEPLUC_CAP, HIEPLUC_RATE, HIEPLUC_STREAK_PCT, HIEPLUC_STREAK_MAX, hiepLucPayoff } from '../../data/hiepLuc';
import { monthOf } from '../../data/calendar';
import type { BizState } from '../../data/biz';
import { Callout, styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ928: tách khỏi MorningPanel (nguyên văn thẻ việc chi nhánh + thẻ đối tác chi nhánh × quán nước). */
export function BranchChoresCard({ branchChores }: { branchChores: { icon: string; text: string; danger?: boolean }[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone="warn" title={t('panels_morning.tien_loi_24_7_viec_hom')} style={{ marginBottom: 8 }}>
      {branchChores.map((c, i) => (
        <button key={i} onClick={() => openPanel({ type: 'branch' })}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: c.danger ? '#e74c3c' : '#f1c40f', fontSize: 12, marginTop: 2, cursor: 'pointer', padding: 0 }}>
          {c.icon} {c.text}
        </button>
      ))}
    </Callout>
  );
}

export function HiepLucCard({ biz, day }: { biz: Pick<BizState, 'hiepLuc' | 'hiepLucMonth' | 'hiepLucStreak'>; day: number }) {
  const active = !!biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day);
  const combined = biz.hiepLucMonth ?? 0;
  const streak = biz.hiepLucStreak ?? 0;
  // GĐ1276: soi THƯỞNG hiệp lực — trước đây chỉ nói "được thưởng" không nói BAO NHIÊU. hiepLucMonth là doanh
  // thu chung người chơi tự tích lũy trong tháng (không phải nhu cầu khách), hiepLucPayoff = min(4%·gom, trần)
  // × chuỗi đơn điệu tăng theo gom → thưởng hiện tại là CẬN DƯỚI của thưởng cuối tháng ("tới ít nhất ~"). THUẦN đọc.
  const streakMul = Math.min(streak * HIEPLUC_STREAK_PCT, HIEPLUC_STREAK_MAX);
  return (
    <Callout tone="event" title={t('panels_morning.doi_tac_chi_nhanh_quan_nuoc')} style={{ marginBottom: 8 }}>
      {active ? (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {t('panels_morning.dang_hiep_luc_thang_nay_gom')}{' '}{formatMoney(combined)}/{formatMoney(HIEPLUC_MIN)} doanh thu chung{streak ? t('panels_morning.chuoi_thang', { streak }) : ''}{t('panels_morning.coc')}{' '}{formatMoney(HIEPLUC_COC)}{' '}{t('panels_morning.hoan_lai_cuoi_thang')}
          {combined >= HIEPLUC_MIN ? (
            <div style={{ marginTop: 2 }}>
              {t('panels_morning.du_nguong_thuong_dang_tien_toi')}{formatMoney(hiepLucPayoff(combined, streak))} ({Math.round(HIEPLUC_RATE * 100)}{t('panels_morning.doanh_thu_tran')}{' '}{formatMoney(HIEPLUC_CAP)}{t('panels_morning.chuoi')}{Math.round(streakMul * 100)}%).
            </div>
          ) : (
            <div style={{ marginTop: 2 }}>
              {t('panels_morning.con_kem')}{' '}{formatMoney(HIEPLUC_MIN - combined)}{' '}{t('panels_morning.nua_du_nguong_du_roi_thuong')}{' '}{Math.round(HIEPLUC_RATE * 100)}{t('panels_morning.doanh_thu_gom_tran')}{' '}{formatMoney(HIEPLUC_CAP)}{t('panels_morning.thang')}{streak ? t('panels_morning.chuoi_2', { v0: Math.round(streakMul * 100) }) : ''}.
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {t('panels_morning.ca_2_co_so_dang_mo')}{' '}{formatMoney(HIEPLUC_MIN)}{' '}{t('panels_morning.duoc_thuong')}{' '}{Math.round(HIEPLUC_RATE * 100)}{t('panels_morning.doanh_thu_tran_2')}{' '}{formatMoney(HIEPLUC_CAP)}{t('panels_morning.chuoi_moi_thang_lien_tiep')}{Math.round(HIEPLUC_STREAK_PCT * 100)}{t('panels_morning.toi_da')}{Math.round(HIEPLUC_STREAK_MAX * 100)}{t('panels_morning.coc_2')}{' '}{formatMoney(HIEPLUC_COC)}{' '}{t('panels_morning.hoan_lai')}
          <button onClick={signHiepLuc} style={{ display: 'block', marginTop: 4, ...styles.btn }}>
            {t('panels_morning.lap_doi_tac_coc')}{' '}{formatMoney(HIEPLUC_COC)}{t('panels_morning.hoan_cuoi_thang')}
          </button>
        </div>
      )}
    </Callout>
  );
}
