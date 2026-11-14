import { useGame } from '../../core/store';
import { shopHoursLabel } from '../../data/shopHours';
import { formatMoney } from '../../data/products';
import { blockedLabel, shortLabel } from '../shortLabel';
import {
  TIEM_XOI_COST_MUL, TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_TARGET, TIEM_XOI_UNLOCK,
  TIEM_XOI_WAGE, tiemXoiCapacity, tiemXoiHandQty, tiemXoiTarget, TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL, tiemXoiDineCap, tiemXoiRainMul, tiemXoiWeekendMul, tiemXoiLastLine, isXoiCungDay, tiemXoiCungMul, tiemXoiStaffValues, tiemXoiExpandPayback,
} from '../../data/tiemXoi';
import { Callout, styles } from './shared';
import { t } from '../../core/i18n';

/** Tiệm xôi (GĐ412): mục riêng trong bảng Quán nước — không thêm nútx HUD. Hiện txừ cấp mở khoá. */
export function TiemXoiSection() {
  const { biz, level, money, day, weather, storage, buyTiemXoi, hireTiemXoi, fireTiemXoi, steamXoiHand, expandTiemXoi } = useGame();
  const tx = biz.tiemXoi;
  const last = biz.tiemXoiLast;
  // GĐ1246 — "txừng thợ xôi đáng đồng lương?" (thuần đọc, song song quán nước GĐ188). Chỉ khi tiệm đang chạy có thợ.
  const staffValues = tx.open && tx.staff > 0 ? tiemXoiStaffValues(tx, level, storage, day) : [];
  // GĐ1247 — "Mở rộng bếp 20tr hồi vốn bao lâu?" (thuần đọc, song song quán nước GĐ193). Chỉ khi chưa mở rộng.
  const expandPay = tx.open && !tx.big ? tiemXoiExpandPayback(tx, level, storage, day) : null;
  if (!tx.open && level < TIEM_XOI_UNLOCK) return null;
  const off = Math.round((1 - TIEM_XOI_COST_MUL) * 100);
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10 }}>
      <b>{t('panels_xoi.tiem_xoi')}</b> <span style={{ fontSize: 12, opacity: 0.75 }}>{t('panels_xoi.ban_som')}{' '}{shopHoursLabel('tiemXoi')}</span>
      {!tx.open ? (
        <>
          <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>{t('panels_xoi.nau_xoi_so_luong_lon_re')}{' '}{off}{t('panels_xoi.moi_dem_bu_kho_toi')}{' '}{TIEM_XOI_TARGET}{' '}{t('panels_xoi.phan_mon')}</li>
            <li>{t('panels_xoi.quay_xoi_trong_tiem_van_dung')}</li>
            <li>{t('panels_xoi.gia')}{' '}{formatMoney(TIEM_XOI_PRICE)}{' '}{t('panels_xoi.tho')}{' '}{formatMoney(TIEM_XOI_WAGE)}{t('panels_xoi.ngay_toi_da')}{' '}{TIEM_XOI_MAX_STAFF}</li>
          </ul>
          <button style={{ ...styles.btn, marginLeft: 0, marginTop: 6 }} disabled={money < TIEM_XOI_PRICE} onClick={buyTiemXoi}>
            {shortLabel(t('panels_xoi.mo_tiem_xoi', { v0: formatMoney(TIEM_XOI_PRICE) }), TIEM_XOI_PRICE, money)}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {t('panels_xoi.tho_2')}{' '}{tx.staff}/{TIEM_XOI_MAX_STAFF}{' '}{t('panels_xoi.nau_toi_da')}{' '}{tiemXoiCapacity(tx.staff, !!tx.big)}{' '}{t('panels_xoi.phan_dem_giu')}{' '}{Math.round(tiemXoiTarget(tx) * tiemXoiCungMul(day))}{' '}{t('panels_xoi.phan_mon')}{isXoiCungDay(day) ? ' 🙏' : ''}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{t('panels_xoi.khach_ngoi_an_tai_tiem_toi')}{' '}{tiemXoiDineCap(tx.staff, !!tx.big)}{' '}{t('panels_xoi.suat_ngay_lay_xoi_trong_kho')}{' '}{tx.dineTotal ?? 0}{' '}{t('panels_xoi.suat_2')}{tiemXoiRainMul(weather) > 1 ? t('panels_xoi.mua_khach_vao_tru_1_2') : ''}{tiemXoiWeekendMul(day) > 1 ? t('panels_xoi.cuoi_tuan_1_15_suat') : ''}{isXoiCungDay(day) ? t('panels_xoi.ngay_cung_1_3_suat') : ''}</div>
          {!isXoiCungDay(day) && isXoiCungDay(day + 1) && <div style={{ fontSize: 12, opacity: 0.85 }}>{t('panels_xoi.mai_la_ngay_cung_khach_mua')}</div>}
          {last && (
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {tiemXoiLastLine(last)}
            </div>
          )}
          {staffValues.length > 0 && (
            <Callout
              tone={staffValues.some((v) => v.verdict !== 'ok') ? 'warn' : 'ok'}
              title={t('panels_xoi.tung_tho_dang_dong_luong')}
              style={{ marginTop: 6 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {staffValues.map((v) => (
                  <div key={v.index} style={{ fontSize: 12 }}>
                    <b style={{ color: v.verdict === 'ok' ? '#2ecc71' : '#e67e22' }}>
                      {v.verdict === 'ok' ? '✔' : v.verdict === 'warn' ? '◑' : '✖'}{' '}{t('panels_xoi.tho_thu')}{' '}{v.index}
                    </b>
                    {' · '}{formatMoney(v.marginalValue)}{t('panels_xoi.ngay_loi_nhuan_ban_xoi_nau')}{v.marginNet >= 0
                      ? t('panels_xoi.dang_luong_lai', { v0: formatMoney(v.wage), v1: formatMoney(v.marginNet) })
                      : v.ratio >= 0.5
                        ? t('panels_xoi.chua_dang_lo_ngay', { v0: formatMoney(v.wage), v1: formatMoney(-v.marginNet) })
                        : t('panels_xoi.nen_cho_nghi_kho_xoi_gan', {  })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                {t('panels_xoi.gia_tri_bien_loi_nhuan_ban')}
              </div>
            </Callout>
          )}
          <div style={{ marginTop: 6 }}>
            <button style={{ ...styles.btn, marginLeft: 0 }} disabled={tx.staff >= TIEM_XOI_MAX_STAFF || money < TIEM_XOI_HIRE_FEE} onClick={hireTiemXoi}>
              {blockedLabel(tx.staff >= TIEM_XOI_MAX_STAFF ? t('panels_xoi.du_tho', { TIEM_XOI_MAX_STAFF }) : null, t('panels_xoi.tuyen_tho', { v0: formatMoney(TIEM_XOI_HIRE_FEE) }), TIEM_XOI_HIRE_FEE, money)}
            </button>
            <button style={styles.btn} disabled={tx.staff <= 0} onClick={fireTiemXoi}>{t('panels_xoi.cho_nghi_1_tho')}</button>
            <button style={styles.btn} disabled={tx.handDay === day} onClick={() => steamXoiHand()} title={t('panels_xoi.phim_j_o_sap_xoi_cung')}>
              {t('panels_xoi.tu_do')}{' '}{tiemXoiHandQty(tx.staff)}{' '}{t('panels_xoi.phan')}{tx.handDay === day ? t('panels_xoi.mai_do_tiep') : ''}
            </button>
            {!tx.big && (() => {
              const seg = [];
              if (level >= TIEM_XOI_BIG_LEVEL && expandPay) {
                const c = expandPay.verdict === 'worth' ? '#2ecc71' : expandPay.verdict === 'slow' ? '#e67e22' : '#e74c3c';
                seg.push(
                  <div key="p" style={{ fontSize: 12, color: c, marginTop: 6 }}>
                    {expandPay.verdict === 'full'
                      ? <span>{t('panels_xoi.mo_rong_bep_chua_giup_gi')}</span>
                      : <span>{t('panels_xoi.uoc_hoi_von')}{' '}{formatMoney(expandPay.cost)}{t('panels_xoi.mo_rong_giup_ban_them')}{formatMoney(expandPay.netPerDay)}{t('panels_xoi.dem')}{expandPay.paybackDays}{' '}{t('panels_xoi.ngay_2')}{expandPay.verdict === 'worth' ? t('panels_xoi.dang') : t('panels_xoi.cham_can_nhac')}{' '}{t('panels_xoi.neu_kho_thieu_du_de_nau')}</span>}
                  </div>
                );
              }
              seg.push(
                <button key="b" style={styles.btn} disabled={level < TIEM_XOI_BIG_LEVEL || money < TIEM_XOI_BIG_COST} onClick={() => expandTiemXoi()}>
                  {level < TIEM_XOI_BIG_LEVEL ? t('panels_xoi.mo_rong_bep_cap', { TIEM_XOI_BIG_LEVEL }) : shortLabel(t('panels_xoi.mo_rong_bep_120_phan_nau', { v0: formatMoney(TIEM_XOI_BIG_COST) }), TIEM_XOI_BIG_COST, money)}
                </button>
              );
              return seg;
            })()}
          </div>
        </>
      )}
    </div>
  );
}
