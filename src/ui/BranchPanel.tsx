import { useState } from 'react';
import { useGame } from '../core/store';
import { CONVENIENCE, coverMul, VENDING_CAP, VENDING_COST, hasPower, isHotFood, nightNeed, shelfTotal, uncoveredHours, vendingTotal, branchWeekendMul, branchMatchMul } from '../data/branches';
import { dailyWage } from '../data/staff';
import { branchOperatingBalanceToday, branchBuildPayback } from '../data/branchNet';
import { branchMissSummary } from '../data/venueTrend';
import { vendingPayoff } from '../data/minorPayoff';
import { formatMoney, productById, fmtMul } from '../data/products';
import { shortLabel } from './shortLabel';
import { haulTripPlan, autoHaulCfg, HAUL_REFILL_BELOW, HAUL_TRIP_EVERY, HAUL_BELOW_MIN, HAUL_BELOW_MAX, HAUL_EVERY_MIN, HAUL_EVERY_MAX } from '../data/branchHaul';
import { Callout, Footer } from './panels/shared';
import { BranchNightTab } from './BranchNightTab';
import { st } from './branchStyles';
import { t } from '../core/i18n';

/** Cửa hàng tiện lợi 24/7: thuê mặt bằng, tuyển người, xem doanh thu. */
export function BranchPanel() {
  const hasBranch = useGame((s) => !!s.branch);
  const closePanel = useGame((s) => s.closePanel);
  return (
    <>
      {hasBranch ? <BranchActive /> : <BranchIntro />}
      <Footer onClose={closePanel} />
    </>
  );
}

function BranchIntro() {
  const { level, money, openBranch } = useGame();
  return (
    <>
      <h2 style={st.title}>🏪 {CONVENIENCE.name}</h2>
      <p style={st.sub}>
        {t('branch.mat_bang_rong')}{' '}{CONVENIENCE.width}×{CONVENIENCE.depth}{' '}{t('branch.m_o_con_duong_ben_kia')}{' '}<b>kho chung</b>{' '}{t('branch.sang_bao_ve_canh_trom_ban')}
      </p>
      <ul style={st.sub}>
        <li>{t('branch.gia_mua_mat_bang_mua_dut')}{' '}<b>{formatMoney(CONVENIENCE.openCost)}</b></li>
        <li>{t('branch.mua_dut_nen_khong_co_tien')}</li>
        <li>{t('branch.ke_chua_toi')}{' '}{CONVENIENCE.shelfCap}{' '}{t('branch.mon_gia_ban')}{fmtMul(CONVENIENCE.priceMul)}{' '}{t('branch.so_voi_tiem_chinh')}</li>
      </ul>
      {level < CONVENIENCE.unlock
        ? <p style={st.warn}>{t('branch.mo_o_cap')}{' '}{CONVENIENCE.unlock}</p>
        : <button style={st.primary} disabled={money < CONVENIENCE.openCost} onClick={openBranch}>{shortLabel(t('branch.mua_mat_bang'), CONVENIENCE.openCost, money)}</button>}
      {level >= CONVENIENCE.unlock && money < CONVENIENCE.openCost && <p style={st.warn}>{t('branch.chua_du_tien_co_the_vay')}</p>}
    </>
  );
}

function BranchActive() {
  const { branch, level, money, day, weather, storage, stats, atBranch, venueTrend, toggleBranch, toggleVending, toggleBranchAutoHaul, setBranchAutoHaul, coverCalloff } = useGame();
  const [tab, setTab] = useState<'info' | 'night' | 'report'>('info');
  if (!branch) return null;

  const gaps = uncoveredHours(branch.staff);
  const has = (r: string) => branch.staff.some((s) => s.role === r);
  const wages = branch.staff.reduce((n, s) => n + dailyWage(s), 0);
  const top = Object.entries(branch.shelf).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const stockLeft = Object.values(storage).reduce((n, q) => n + q, 0) + shelfTotal(branch.shelf);
  const calloff = branch.event?.kind === 'calloff' ? branch.event : null;
  const calloffWho = calloff ? branch.staff.find((s) => s.id === calloff.staffId) : undefined;
  const calloffCost = calloffWho ? Math.round(dailyWage(calloffWho) * coverMul(branch)) : 0;
  const mainHourly = Array.from({ length: 24 }, (_, h) => stats.byHour?.[h]?.revenue ?? 0);
  const branchHourly = branch.hourly ?? Array(24).fill(0);
  const peak = Math.max(1, ...mainHourly, ...branchHourly);

  return (
    <>
      <h2 style={st.title}>🏪 {CONVENIENCE.name}</h2>
      <div style={st.row}>
        <span style={{ ...st.badge, background: branch.open ? '#2ecc71' : '#7f8c8d' }}>{branch.open ? t('branch.dang_mo_24_7') : t('branch.dang_dong')}</span>
        <button style={st.primary} onClick={toggleBranch}>{branch.open ? t('branch.dong_cua') : t('branch.mo_cua')}</button>
      </div>
      <div style={st.tabs}>
        {([['info', t('branch.tinh_hinh')], ['night', t('branch.ban_dem')], ['report', t('branch.theo_gio')]] as const).map(([id, label]) => (
          <button key={id} style={{ ...st.tab, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div>{t('branch.hom_nay')}{' '}<b>{branch.customersToday}</b>{' '}{t('branch.khach_thu')}{' '}<b>{formatMoney(branch.revenueToday)}</b>
            {branch.missedToday > 0 && <> · {branch.missedToday}{' '}{t('branch.khach_bo_ve')}</>}{branch.lostToday > 0 && <>{' '}{t('branch.mat_trom')}{' '}{branch.lostToday}{' '}{t('branch.mon')}</>}{branchWeekendMul(day, 23 * 60) > 1 && <>{' '}{t('branch.dem_cuoi_tuan_khach_1_3')}</>}{branchMatchMul(day, 23 * 60, weather) > 1 && <>{' '}{t('branch.tan_tran_22h_24h_khach_1')}</>}</div>
          <div>{t('branch.chi_phi_moi_ngay')}{' '}{formatMoney(wages)}{' '}{t('branch.luong_mat_bang_da_mua_dut')}</div>
          {(() => {
            const op = branchOperatingBalanceToday(branch);
            const chipColor = op.verdict === 'surplus' ? '#2ecc71' : op.verdict === 'deficit' ? '#e74c3c' : '#7f8c8d';
            const chipText = op.verdict === 'surplus' ? t('branch.du_van_hanh') : op.verdict === 'deficit' ? t('branch.am') : t('branch.chua_co_thu');
            return (
              <div>🧮 Còn lại sau lương & điện: <b style={{ color: chipColor }}>{formatMoney(op.balance)}</b>{' '}
                <span style={{ color: chipColor, border: `1px solid ${chipColor}`, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{chipText}</span>{' '}
                <span style={st.sub}>{t('branch.quay')}{' '}{formatMoney(branch.revenueToday)}{' '}{t('branch.may')}{' '}{formatMoney(branch.vendingRevenueToday ?? 0)}{' '}{t('branch.luong')}{' '}{formatMoney(op.wages)}{' '}{t('branch.dien')}{' '}{formatMoney(op.power)})</span>
                <div style={st.sub}>{t('branch.so_du_van_hanh_chua_phan')}</div>
              </div>
            );
          })()}
          {(() => { // GĐ194: hồi vốn 5tr mua mặt bằng theo số dư vận hành hôm nay (mẫu GĐ192)
            const pb = branchBuildPayback(branch);
            if (pb.verdict === 'nodata') return null;
            const c = pb.verdict === 'worth' ? '#2ecc71' : pb.verdict === 'slow' ? '#e67e22' : '#e74c3c';
            return (
              <div style={{ fontSize: 12, color: c }}>
                💸 {formatMoney(CONVENIENCE.openCost)}{' '}{t('branch.mua_mat_bang_2')}{' '}
                {pb.verdict === 'notworth'
                  ? <>{t('branch.so_du_am')}{' '}<b>~{formatMoney(-pb.netPerDay)}{t('branch.ngay')}</b>{' '}{t('branch.chua_hoi_von_thu_it_hon')}</>
                  : <>{t('branch.hoi_von_sau')}{' '}<b>~{pb.paybackDays}{' '}{t('branch.ngay_2')}</b>{' '}{t('branch.du')}{formatMoney(pb.netPerDay)}{t('branch.ngay_3')}</>}{' '}
                <span style={st.sub}>{t('branch.theo_hom_nay_chua_tru_gia')}</span>
              </div>
            );
          })()}
          {(() => {
            const miss = branchMissSummary(venueTrend);
            return (
              <Callout tone="warn" title={t('branch.bo_lo_hom_qua_gan_day')}>
                {miss.totalMissed === 0
                  ? <div style={st.sub}>{t('branch.chua_co_so_lieu_bo_lo')}</div>
                  : <>
                      {miss.last && miss.last.missed > 0 && (
                        <div style={st.sub}>
                          {t('branch.hom_qua')}{' '}<b>{miss.last.missed}</b>{' '}{t('branch.khach_bo_ve_uoc_bo_lo')}<b>{formatMoney(miss.last.estMoney)}</b>{' '}
                          {t('branch.ban_binh_quan')}{' '}{formatMoney(Math.round(miss.last.estMoney / miss.last.missed))}{t('branch.khach')}
                        </div>
                      )}
                      <div style={st.sub}>{t('branch.14_ngay_gan_day_uoc')}<b>{formatMoney(miss.totalEstMoney)}</b>.</div>
                      {miss.worst && miss.worst.estMoney > 0 && <div style={st.sub}>{t('branch.te_nhat_ngay')}{' '}{miss.worst.day}: ~<b>{formatMoney(miss.worst.estMoney)}</b>.</div>}
                      <div style={st.sub}>{t('branch.khach_bo_ve_vi_quay_vang')}</div>
                    </>}
              </Callout>
            );
          })()}
          <div>{t('branch.hang_tren_ke')}{' '}<b>{shelfTotal(branch.shelf)}</b>/{CONVENIENCE.shelfCap}{' '}{t('branch.mon_lay_tu_kho_chung')}</div>
          {top.length > 0 && <div style={st.sub}>{top.map(([id, q]) => `${isHotFood(id) ? '🔥' : ''}${productById(id).name} ×${q}`).join(' · ')}</div>}
          <div style={st.sub}>🍽️ Thực đơn xoay theo ca: sáng (5–11h) ưu tiên điểm tâm — bánh mì, xôi, cà phê; trưa (11–15h) ưu tiên cơm phần, đồ ăn nhanh; tối–đêm thiên về đồ nóng & món đêm (giá đêm cao hơn).</div>
          {atBranch && <p style={{ ...st.sub, color: '#2ecc71' }}>{t('branch.ban_dang_o_chi_nhanh_thieu')}</p>}
          {calloff && (
            <div style={st.event}>
              <b>📵 {calloffWho?.name ?? t('branch.nhan_vien')}{' '}{t('branch.ca_dem_xin_nghi_dot_xuat')}</b>
              {calloff.covered
                ? <span>{t('branch.da_co_nguoi_lam_thay')}</span>
                : <>
                    <span style={st.sub}>{t('branch.goi_nguoi_lam_thay_gap')}{' '}{coverMul(branch)}{' '}{t('branch.luong_ca_hoac_tu_chay_sang')}</span>
                    <button style={st.primary} onClick={coverCalloff}>{t('branch.goi_nguoi_thay')}{formatMoney(calloffCost)})</button>
                  </>}
            </div>
          )}
          {!has('manager') && <p style={st.sub}>{t('branch.thue_quan_ly_tu_xep_ca')}</p>}
          {(() => { // GĐ573: gom cảnh báo thiếu người/hàng vào một khung, đỡ rối
            const warns = [
              !has('cashier') && <>{t('branch.chua_co_thu_ngan_khach_toi')}</>,
              has('cashier') && gaps.length > 0 && <>{t('branch.khong_co_thu_ngan_luc')}{' '}{gaps.map((h) => `${h}h`).join(', ')}{t('branch.them_nguoi_ca_dem_ca_chieu')}</>,
              !has('courier') && !has('stocker') && <>{t('branch.chua_co_nguoi_giao_xep_hang')}</>,
              !has('guard') && <>{t('branch.khong_co_bao_ve_ban_dem')}</>,
              stockLeft < nightNeed() && <>{t('branch.kho_chung_sap_can_con')}{' '}{stockLeft}{' '}{t('branch.mon_moi_dem_can')}{nightNeed()}{t('branch.dem_nay_chi_nhanh_co_the')}</>,
            ].filter(Boolean);
            return warns.length > 0 && <Callout tone="warn" title={t('branch.can_xu_ly', { length: warns.length })}>{warns.map((w, i) => <div key={i} style={st.sub}>• {w}</div>)}</Callout>;
          })()}
          <div style={{ ...st.event, display: 'block' }}>
            <div style={st.row}>
              <b>{t('branch.may_ban_hang_tu_dong_ngoai')}</b>
              <button style={st.primary} disabled={!branch.vendingEnabled && money < VENDING_COST} onClick={toggleVending}>{branch.vendingEnabled ? t('branch.tat_may') : shortLabel(t('branch.lap_may', { v0: formatMoney(VENDING_COST) }), VENDING_COST, money)}</button>
            </div>
            <div style={st.sub}>
              {t('branch.ban_ke_ca_khi_dong_cua')}
              {branch.vendingEnabled && <>{' '}{t('branch.dang_chay_hang_trong_may')}{' '}<b>{vendingTotal(branch.vendingStock ?? {})}</b>/{VENDING_CAP}{t('branch.hom_nay_ban_them_duoc')}{' '}<b>{formatMoney(branch.vendingRevenueToday ?? 0)}</b>.</>}
            </div>
            {/* GĐ159: hoàn vốn máy theo nhịp doanh thu HÔM NAY. Doanh thu − điện máy là GROSS giá vốn (đúng quy ước
                "chưa phân bổ giá vốn hàng đã nhập" từ GĐ153); trộm vặt đêm (VENDING_THEFT) làm hụt hàng chứ không
                đụng doanh thu. Điện máy 10k/ngày, còn 6,5k nếu đã lắp 'efficient' (POWER_RATES.vending × EFFICIENT_MUL;
                hóa đơn điện TỔNG mới làm tròn 1000 nên phần máy riêng là ước) — số ngày hoàn vốn luôn kèm "~". */}
            {branch.vendingEnabled && (() => {
              const vp = vendingPayoff(branch.vendingRevenueToday ?? 0, hasPower(branch, 'efficient'));
              return (
                <div style={st.sub}>
                  {vp.days !== null
                    ? <>{t('branch.hoan_von_sau')}{vp.days}{' '}{t('branch.ngay_ban_deu_the_nay_da')}{formatMoney(vp.electricityPerDay)}{t('branch.ngay_4')}</>
                    : <>{t('branch.hom_nay_may_chua_du_bu')}{formatMoney(vp.electricityPerDay)}{t('branch.ngay_xep_them_mon_ua_chay')}</>}
                </div>
              );
            })()}
          </div>
          <div style={{ ...st.event, display: 'block', marginTop: 8 }}>
            <div style={st.row}>
              <b>{t('branch.auto_chuyen_kho')}</b>
              <button style={st.primary} onClick={toggleBranchAutoHaul}>{branch.autoHaul ? t('branch.dang_bat_tat') : t('branch.bat_tu_cho')}</button>
            </div>
            {(() => {
              const cfg = autoHaulCfg(branch);
              return (
                <div style={{ ...st.row, marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                  <span style={st.sub}>{t('branch.cho_khi_ke_voi_duoi')}</span>
                  <input type="number" min={Math.round(HAUL_BELOW_MIN * 100)} max={Math.round(HAUL_BELOW_MAX * 100)} step={5}
                    defaultValue={Math.round(cfg.below * 100)} style={{ width: 54, padding: '3px 6px', borderRadius: 6, border: 'none', color: '#222' }}
                    onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) setBranchAutoHaul(v / 100, undefined); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />%
                  <span style={st.sub}>{t('branch.gian')}</span>
                  <input type="number" min={Math.round(HAUL_EVERY_MIN / 60)} max={Math.round(HAUL_EVERY_MAX / 60)} step={1}
                    defaultValue={Math.round(cfg.every / 60)} style={{ width: 46, padding: '3px 6px', borderRadius: 6, border: 'none', color: '#222' }}
                    onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) setBranchAutoHaul(undefined, v * 60); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />{t('branch.h_chuyen')}
                </div>
              );
            })()}
            <div style={st.sub}>
              {t('branch.khi_bat_chi_nhanh_tu_cho')}{' '}<b>kho chung</b>{' '}{t('branch.moi_khi_ke_voi_duoi')}{Math.round(HAUL_REFILL_BELOW * 100)}{t('branch.suc_chua_gian')}{HAUL_TRIP_EVERY / 60}{t('branch.h_chuyen_2')}{' '}<b>{t('branch.khong_can_nguoi_giao_xep_quan')}</b>{t('branch.moi_chuyen_tra_phi_xang')}{' '}{formatMoney(CONVENIENCE.tripFee)}.
              {(() => { const plan = haulTripPlan(branch, storage); return plan.units > 0
                ? <>{' '}{t('branch.chuyen_hien_tai_se_cho')}{' '}<b>{plan.units}{' '}{t('branch.mon')}</b> ({plan.cost ? formatMoney(plan.cost) : t('branch.mien_phi')}).</>
                : t('branch.ke_dang_du_kho_chung_het'); })()}
            </div>
          </div>
        </div>
      )}

      {tab === 'night' && <BranchNightTab />}

      {tab === 'report' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={st.sub}>{t('branch.doanh_thu_tung_gio_hom_nay')}</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span><i style={{ ...st.dot, background: '#f1c40f' }} />{' '}{t('branch.tiem_chinh')}</span>
            <span><i style={{ ...st.dot, background: '#2ecc71' }} />{' '}{t('branch.tien_loi_24_7')}</span>
          </div>
          <div style={st.chart} role="img" aria-label={t('branch.bieu_do_doanh_thu_theo_gio')}>
            {mainHourly.map((v, h) => (
              <div key={h} style={st.col} title={t('branch.h_tiem_chinh_tien_loi', { h, v1: formatMoney(v), v2: formatMoney(branchHourly[h]) })}>
                <div style={st.bars}>
                  <div style={{ ...st.bar, background: '#f1c40f', height: `${(v / peak) * 100}%` }} />
                  <div style={{ ...st.bar, background: '#2ecc71', height: `${(branchHourly[h] / peak) * 100}%` }} />
                </div>
                <small style={{ opacity: h % 3 ? 0 : 0.7 }}>{h}</small>
              </div>
            ))}
          </div>
          <div style={st.sub}>{t('branch.hom_nay_tiem_chinh')}{' '}{formatMoney(mainHourly.reduce((n, v) => n + v, 0))}{' '}{t('branch.tien_loi')}{' '}{formatMoney(branch.revenueToday)}</div>
        </div>
      )}
    </>
  );
}
