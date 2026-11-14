import { trendMark } from '../trendMark';
import { shopHoursLabel } from '../../data/shopHours';
import type * as React from 'react';
import { useGame } from '../../core/store';
import { formatMoney, fmtMul } from '../../data/products';
import { QUAN_NUOC_HIRE_FEE, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_UNLOCK, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, QUAN_WEATHER_MUL, quanWeekendMul, quanMatchMul, isQuanMatchDay, type QuanNuocPrice } from '../../data/quanNuoc';
import { quanNuocProjection, quanNuocCupSupply, quanNuocRestockTip, quanNuocBuildPayback, quanPricePayoff } from '../../data/quanNuocInsights';
import { quanStatusChips } from '../../data/quanNuocStatus';
import { quanNuocStaffValues } from '../../data/quanNuocStaffValue';
import { teahouseHaulRead } from '../../data/teahouseHaul';
import { Callout, CALLOUT_TONE, Footer, styles } from './shared';
import { ZoneMapSection } from './ZoneMapSection';
import { TiemXoiSection } from './TiemXoiSection';
import { QuanMenuSection } from './QuanMenuSection';
import { WEATHER } from '../../data/weather';
import { quanHotNote } from '../../data/quanRecipes';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

// Chip trạng thái dùng đúng bảng màu ngữ cảnh chuẩn của dự án (Callout, GĐ166) — bộ màu riêng
// gần-giống-but-lệch làm palette cả panel loãng.
const CHIP_BG = { ok: CALLOUT_TONE.ok, warn: CALLOUT_TONE.warn, bad: CALLOUT_TONE.danger, info: CALLOUT_TONE.info } as const;

/** Thứ tự hiển thị 3 mức giờ bán: bình dân → vừa phải → đắt hơn. */
const PRICE_ORDER: readonly QuanNuocPrice[] = ['re', 'vua', 'cao'];

/** Nút pill chọn mức: đang chọn nền vàng giống Tabs trong shared để UI nhất quán. */
const pill = (on: boolean): React.CSSProperties => ({
  ...styles.btn, marginLeft: 0, borderRadius: 999,
  background: on ? '#f1c40f' : '#fff', fontWeight: on ? 700 : undefined,
});

/** Chú giải nút mức giá từ hệ số dữ liệu: "Giá ×1.3 nhưng khách −25%". */
const priceTip = (mul: number, traffic: number) => {
  const pct = Math.round(Math.abs(traffic - 1) * 100);
  const khach = traffic === 1 ? t('panels_quan.khach_nhu_cu') : t('panels_quan.khach', { v0: traffic > 1 ? '+' : '−', pct });
  return t('panels_quan.gia_nhung', { v0: fmtMul(mul), khach });
};

/** Quán Nước Đầu Ngõ: quán nước ở đầu hẻm, nguyên liệu lấy thẳng từ kho tiệm. */
export function QuanNuocPanel() {
  const { biz, level, money, storage, weather, forecast, day, buyQuanNuoc, hireQuanNuoc, fireQuanNuoc, setQuanNuocPrice, closePanel, openPanel } = useGame();
  const quan = biz.quanNuoc;
  const last = biz.quanNuocLast;
  const locked = level < QUAN_NUOC_UNLOCK;
  const canBuild = !locked && money >= QUAN_NUOC_PRICE;
  const canHire = quan.staff < QUAN_NUOC_MAX_STAFF && money >= QUAN_NUOC_HIRE_FEE;
  // GĐ127: mồi quyết định — dự phóng ROI thuê thêm (thuần đọc kho hiện tại, chặn bởi tồn đồ uống).
  const drinkUnits = quanNuocCupSupply(quan, level, storage);
  const hireProj = quan.open && quan.staff < QUAN_NUOC_MAX_STAFF ? quanNuocProjection({ ...quan, staff: quan.staff + 1 }, level, drinkUnits, weather, day) : null;
  const tonightProj = quan.open ? quanNuocProjection(quan, level, drinkUnits, weather, day) : null;
  // GĐ1268: lời ròng mỗi mức Giờ bán (cùng nhân viên/kho/thời tiết/ngày) — soi TRƯỚC khi chọn (THUẦN)
  const pricePayoff = quan.open ? quanPricePayoff(quan, level, drinkUnits, weather, day) : null;
  // GĐ188: "người thứ N đáng đồng lương?" — chiều xuống (nên giữ bớt ai / sa thải ai). Thuần đọc.
  const staffValues = quan.open ? quanNuocStaffValues(quan.price, level, quan.staff, drinkUnits) : [];
  // GĐ190: thanh nạp kho — thiếu bao nhiêu ly để bán đủ tối nay + nút nhảy sang Nhập hàng.
  const restockTip = quan.open ? quanNuocRestockTip(quan, level, storage, last, weather, day) : null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <h2 style={styles.title}>{t('panels_quan.quan_nuoc_dau_ngo')}</h2>
      <p style={styles.sub}>{t('panels_quan.quan_chuyen_nuoc_o_dau_hem')}{' '}{shopHoursLabel('quanNuoc')}{' '}{t('panels_quan.nguyen_lieu_lay_thang_tu_kho')}</p>
      {quan.open && (
        <div role="status" aria-label={t('panels_quan.trang_thai_quan_hom_nay')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 8px' }}>
          {quanStatusChips(quan, level, drinkUnits, weather, day).map((c) => (
            <span key={c.id} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: CHIP_BG[c.tone], color: '#fff', whiteSpace: 'nowrap' }}>
              {c.icon} {c.text}
            </span>
          ))}
        </div>
      )}
      {quan.open && QUAN_WEATHER_MUL[weather] !== 1 && (
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>
          {WEATHER[weather].icon} {WEATHER[weather].name}{t('panels_quan.khach_quan')}{' '}{QUAN_WEATHER_MUL[weather] > 1 ? t('panels_quan.dong') : t('panels_quan.vang')}{' '}{t('panels_quan.hon')}{fmtMul(QUAN_WEATHER_MUL[weather])} — {QUAN_WEATHER_MUL[weather] > 1 ? t('panels_quan.nap_them_do_uong') : t('panels_quan.bot_nhap_cho_do_ton')}
        </p>
      )}
      {quan.open && quanWeekendMul(day) !== 1 && (
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>{t('panels_quan.cuoi_tuan_khach_ngoi_quan_dong')}{fmtMul(quanWeekendMul(day))}{' '}{t('panels_quan.nap_them_nguyen_lieu')}</p>
      )}
      {quan.open && isQuanMatchDay(day, weather) && (
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>{t('panels_quan.toi_nay_co_tran_bong_khach')}{fmtMul(quanMatchMul(day, weather))}{' '}{t('panels_quan.nap_them_do_uong_2')}</p>
      )}
      {quan.open && !isQuanMatchDay(day, weather) && isQuanMatchDay(day + 1, forecast[0] ?? 'sunny') && ( // GĐ645: mai dự báo mưa thì không báo trận
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>{t('panels_quan.mai_co_tran_bong_neu_troi')}</p>
      )}
      {quan.open && quanHotNote(quan.menu ?? [], weather, level, day) && (
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>{quanHotNote(quan.menu ?? [], weather, level, day)}</p>
      )}
      {!quan.open ? (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <b>{t('panels_quan.xay_quan_o_dau_hem')}</b>
            <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>{t('panels_quan.can_cap')}{' '}<b>{QUAN_NUOC_UNLOCK}</b>{' '}{t('panels_quan.gia_xay')}{' '}<b>{formatMoney(QUAN_NUOC_PRICE)}</b>{' '}{t('panels_quan.tra_mot_lan_so_huu_luon')}</li>
              <li>{t('panels_quan.ban_nuoc_nguyen_lieu_san_trong')}</li>
              <li>{t('panels_quan.phi_tuyen')}{' '}{formatMoney(QUAN_NUOC_HIRE_FEE)}{t('panels_quan.nguoi_luong')}{' '}{formatMoney(QUAN_NUOC_WAGE)}{t('panels_quan.ngay_toi_da')}{' '}{QUAN_NUOC_MAX_STAFF}{' '}{t('panels_quan.nhan_vien')}</li>
              <li>{t('panels_quan.ba_muc_gio_ban_binh_dan')}</li>
            </ul>
            {!locked && (() => { // GĐ193: ước hồi vốn — quyết định mua (giá 25tr) có đáng không
              const bp = quanNuocBuildPayback(level);
              if (bp.verdict === 'noMenu') return null;
              const c = bp.verdict === 'worth' ? '#2ecc71' : bp.verdict === 'slow' ? '#e67e22' : '#e74c3c';
              return (
                <div style={{ fontSize: 12, marginTop: 6, color: c }}>
                  {t('panels_quan.uoc_hoi_von_25tr')}{' '}
                  {bp.verdict === 'notworth'
                    ? t('panels_quan.dang_lo_ngay_1_nhan_vien', { v0: formatMoney(-bp.netPerDay) })
                    : t('panels_quan.ngay_loi_ngay', { paybackDays: bp.paybackDays ?? 0, v1: formatMoney(bp.netPerDay) })}{' '}
                  {t('panels_quan.neu_kho_du')}
                </div>
              );
            })()}
          </div>
          <button
            style={{
              ...styles.btn, marginLeft: 0, marginTop: 10, padding: '8px 14px', fontWeight: 700,
              background: canBuild ? '#2ecc71' : '#555', color: '#fff',
              opacity: canBuild ? 1 : 0.6, cursor: canBuild ? 'pointer' : 'not-allowed',
            }}
            disabled={!canBuild}
            title={locked ? t('panels_quan.mo_o_cap', { QUAN_NUOC_UNLOCK }) : money < QUAN_NUOC_PRICE ? t('panels_quan.chua_du_tien_can', { v0: formatMoney(QUAN_NUOC_PRICE) }) : t('panels_quan.xay_quan_va_bat_dau_ban')}
            onClick={buyQuanNuoc}
          >
            {t('panels_quan.xay_quan')}{formatMoney(QUAN_NUOC_PRICE)})
          </button>
          {locked
            ? <p style={{ fontSize: 13, color: '#e67e22', margin: '6px 0 0' }}>{t('panels_quan.mo_o_cap_2')}{' '}{QUAN_NUOC_UNLOCK}.</p>
            : money < QUAN_NUOC_PRICE && <p style={{ fontSize: 13, color: '#e67e22', margin: '6px 0 0' }}>{t('panels_quan.chua_du_tien_co_the_vay')}</p>}
        </>
      ) : (
        <>
          <div style={{ ...styles.card }}>
            <b style={{ flex: 1 }}>{t('panels_quan.nhan_vien_2')}{' '}{quan.staff}/{QUAN_NUOC_MAX_STAFF}{' '}{t('panels_quan.luong')}{' '}{formatMoney(quan.staff * QUAN_NUOC_WAGE)}{t('panels_quan.ngay')}</b>
            <button
              style={{
                ...styles.btn, background: canHire ? '#2ecc71' : '#555', color: '#fff',
                opacity: canHire ? 1 : 0.6, cursor: canHire ? 'pointer' : 'not-allowed',
              }}
              disabled={!canHire}
              title={quan.staff >= QUAN_NUOC_MAX_STAFF
                ? t('panels_quan.quan_chi_giu_duoc_nhan_vien', { QUAN_NUOC_MAX_STAFF })
                : money < QUAN_NUOC_HIRE_FEE ? t('panels_quan.chua_du_phi_tuyen', { v0: formatMoney(QUAN_NUOC_HIRE_FEE) }) : t('panels_quan.tuyen_them_nhan_vien_pha_che')}
              onClick={hireQuanNuoc}
            >
              {t('panels_quan.tuyen')}{formatMoney(QUAN_NUOC_HIRE_FEE)})
            </button>
            <button
              style={{
                ...styles.btn, background: quan.staff > 0 ? '#e74c3c' : '#555', color: '#fff',
                opacity: quan.staff > 0 ? 1 : 0.6, cursor: quan.staff > 0 ? 'pointer' : 'not-allowed',
              }}
              disabled={quan.staff <= 0}
              title={quan.staff <= 0 ? t('panels_quan.chua_co_nhan_vien_nao') : t('panels_quan.sa_thai_mot_nhan_vien_bot')}
              onClick={fireQuanNuoc}
            >
              {t('panels_quan.sa_thai')}
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.75, margin: '2px 0 6px' }}>
            {t('panels_quan.moi_nhan_vien_don_them_khach')}{' '}<b>{t('panels_quan.gio_ban')}</b>{' '}{t('panels_quan.ben_duoi')}
          </p>
          {hireProj && tonightProj && (
            <div style={{ fontSize: 12, margin: '0 0 6px', color: hireProj.served > tonightProj.served && hireProj.profit - tonightProj.profit >= 0 ? '#2ecc71' : '#e67e22' }}>
              {hireProj.served > tonightProj.served && hireProj.profit - tonightProj.profit >= 0
                ? t('panels_quan.du_phong_thue_them_1_nguoi', { v0: formatMoney(hireProj.profit), v1: formatMoney(tonightProj.profit), v2: formatMoney(hireProj.profit - tonightProj.profit), v3: formatMoney(QUAN_NUOC_WAGE) })
                : hireProj.served > tonightProj.served
                  ? t('panels_quan.thue_them_1_nguoi_chua_dang', { v0: formatMoney(hireProj.served - tonightProj.served), v1: formatMoney(QUAN_NUOC_WAGE), v2: formatMoney(hireProj.profit), v3: formatMoney(tonightProj.profit) })
                  : t('panels_quan.thue_them_khong_dang_kho_chi', { drinkUnits, v1: formatMoney(hireProj.profit), v2: formatMoney(tonightProj.profit) })}
            </div>
          )}
          <div style={{ ...styles.card }}>
            <b style={{ flex: 'none' }}>{t('panels_quan.gio_ban_2')}</b>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRICE_ORDER.map((id) => {
                const o = QUAN_PRICE_OPTIONS[id];
                return (
                  <button key={id} style={pill(quan.price === id)} title={priceTip(o.mul, o.traffic)} onClick={() => setQuanNuocPrice(id)}>
                    {o.label}
                  </button>
                );
              })}
            </div>
            {quan.open && pricePayoff && (
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.9, lineHeight: 1.5 }}>
                <b style={{ marginRight: 4 }}>{t('panels_quan.loi_rong_toi_nay_tung_muc')}</b>
                {PRICE_ORDER.map((id) => {
                  const p = pricePayoff[id];
                  const now = quan.price === id;
                  const col = p.profit >= 0 ? '#2ecc71' : '#e74c3c';
                  return (
                    <span key={id} style={{ marginRight: 10, color: now ? '#f1c40f' : undefined }}>
                      {QUAN_PRICE_OPTIONS[id].label} <b style={{ color: now ? '#f1c40f' : col }}>{formatMoney(p.profit)}</b>{now ? ' ✓' : ''}
                    </span>
                  );
                })}
                {pricePayoff.vua.served === 0 && <span style={{ opacity: 0.6 }}>{t('panels_quan.kho_can_do_uong_nhap_truoc')}</span>}
              </div>
            )}
          </div>
          {last && (
            <div style={{ ...styles.card, display: 'block', borderLeft: `3px solid ${(last.profit ?? last.revenue) < 0 ? '#e74c3c' : '#2ecc71'}` }}>
              <b>{t('panels_quan.hom_qua')}{' '}{last.served}/{last.wanted} ly · doanh thu {formatMoney(last.revenue)}</b>
              {last.wages !== undefined && last.profit !== undefined && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {t('panels_quan.luong_2')}{formatMoney(last.wages)}{' '}{t('panels_quan.loi_rong')}{' '}<b style={{ color: last.profit >= 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(last.profit)}{formatMoney(last.profit)}</b>
                </div>
              )}
              {last.event === 'brewer' && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#e67e22' }}>{t('panels_quan.hom_qua_may_pha_hong_quan')}</div>
              )}
              {last.event === 'cart' && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#e67e22' }}>{t('panels_quan.hom_qua_co_xe_nuoc_moc')}</div>
              )}
              {last.served < last.wanted && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#e67e22' }}>{t('panels_quan.kho_thieu_do_uong_nhap_nuoc')}</div>
              )}
            </div>
          )}
          {restockTip && (
            <Callout
              tone={restockTip.verdict}
              title={restockTip.verdict === 'danger' ? t('panels_quan.thieu_do_uong_toi_nay') : t('panels_quan.sap_an_kho_kho_chung')}
              style={{ marginTop: 6 }}
            >
              <div style={{ fontSize: 12 }}>
                {restockTip.verdict === 'danger'
                  ? t('panels_quan.hom_qua_da_bo_lo_d', { v0: fmtNum(restockTip.missedRevenue), wanted: restockTip.wanted, have: restockTip.have, shortfall: restockTip.shortfall })
                  : t('panels_quan.dem_nay_quan_can_ly_nhung', { wanted: restockTip.wanted, have: restockTip.have, shortfall: restockTip.shortfall })}
                <button
                  style={{ ...styles.btn, marginLeft: 0, padding: '2px 10px', background: restockTip.verdict === 'danger' ? '#e74c3c' : '#e67e22', color: '#fff' }}
                  onClick={() => openPanel({ type: 'order' })}
                >
                  {t('panels_quan.nhap_hang')}
                </button>
              </div>
            </Callout>
          )}
          {quan.open && (() => {
            const hr = teahouseHaulRead(drinkUnits, quan, level, day);
            if (hr.daysLeft >= 3) return null;
            const tone = hr.verdict === 'danger' ? 'danger' : 'warn';
            const nights = hr.daysLeft === Infinity ? t('panels_quan.vo_han') : t('panels_quan.dem', { v0: Math.ceil(hr.daysLeft) });
            return (
              <Callout tone={tone} title={hr.verdict === 'danger' ? t('panels_quan.kho_do_uong_sap_can') : t('panels_quan.quan_an_kho_kho_chung')} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12 }}>
                  {t('panels_quan.kho_chung_chi_con')}{' '}<b>{hr.haveNow} ly</b>{' '}{t('panels_quan.do_uong_quan_tieu')}<b>{hr.needPerNight}{' '}{t('panels_quan.ly_dem')}</b>{' '}{t('panels_quan.con')}{' '}{nights}.
                  {hr.haulNow
                    ? t('panels_quan.nen_cho_them_do_uong_ve')
                    : t('panels_quan.quan_dang_dong_khong_dung_kho')}{' '}
                  <button
                    style={{ ...styles.btn, marginLeft: 0, padding: '2px 10px', background: '#e67e22', color: '#fff' }}
                    onClick={() => openPanel({ type: 'order' })}
                  >
                    {t('panels_quan.nhap_do_uong')}
                  </button>
                </div>
              </Callout>
            );
          })()}
          {staffValues.length > 0 && (            <Callout
              tone={staffValues.some((v) => v.verdict !== 'ok') ? 'warn' : 'ok'}
              title={t('panels_quan.tung_nguoi_dang_dong_luong')}
              style={{ marginTop: 6 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {staffValues.map((v) => (
                  <div key={v.index} style={{ fontSize: 12 }}>
                    <b style={{ color: v.verdict === 'ok' ? '#2ecc71' : '#e67e22' }}>
                      {v.verdict === 'ok' ? '✔' : v.verdict === 'warn' ? '◑' : '✖'}{' '}{t('panels_quan.nguoi_thu')}{' '}{v.index}
                    </b>
                    {' · '}{v.marginalValue >= 0 ? '+' : ''}{formatMoney(v.marginalValue)}{' '}{t('panels_quan.ngay_2')}
                    {v.marginNet >= 0
                      ? t('panels_quan.dang_luong_lai', { v0: formatMoney(v.wage), v1: formatMoney(v.marginNet) })
                      : v.ratio >= 0.5
                        ? t('panels_quan.chua_dang_lo_ngay', { v0: formatMoney(v.wage), v1: formatMoney(-v.marginNet) })
                        : t('panels_quan.nen_sa_thai_kho_chi_con', { drinkUnits })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                {t('panels_quan.gia_tri_bien_doanh_thu_nguoi')}
              </div>
            </Callout>
          )}
          <p style={{ fontSize: 12, opacity: 0.7, margin: '8px 0 0' }}>{t('panels_quan.nguyen_lieu_lay_thang_tu_kho_2')}</p>
        </>
      )}
      {quan.open && <QuanMenuSection />}
      <TiemXoiSection />
      <ZoneMapSection />
      <Footer onClose={closePanel} />
    </div>
  );
}
