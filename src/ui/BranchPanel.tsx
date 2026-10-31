import { useState } from 'react';
import { useGame } from '../core/store';
import { CONVENIENCE, ALCOHOL_BRAWL_CHANCE, coverMul, NIGHT_DELIVERY_SURCHARGE, NIGHT_GROUPS, POWER_UPGRADES, VENDING_CAP, VENDING_COST, branchPowerBill, hasAlcohol, hasPower, isHotFood, nightNeed, shelfTotal, uncoveredHours, vendingTotal, branchWeekendMul } from '../data/branches';
import { dailyWage } from '../data/staff';
import { branchOperatingBalanceToday, branchBuildPayback } from '../data/branchNet';
import { branchMissSummary } from '../data/venueTrend';
import { vendingPayoff } from '../data/minorPayoff';
import { licenseById, licenseStatus } from '../data/licenses';
import { formatMoney, productById } from '../data/products';
import { haulTripPlan, autoHaulCfg, HAUL_REFILL_BELOW, HAUL_TRIP_EVERY, HAUL_BELOW_MIN, HAUL_BELOW_MAX, HAUL_EVERY_MIN, HAUL_EVERY_MAX } from '../data/branchHaul';
import { Callout } from './panels/shared';
import { BranchNightTab } from './BranchNightTab';
import { st } from './branchStyles';

/** Cửa hàng tiện lợi 24/7: thuê mặt bằng, tuyển người, xem doanh thu. */
export function BranchPanel() {
  const { branch, level, money, day, candidates, storage, stats, atBranch, online, licenses, venueTrend, openBranch, toggleBranch, toggleVending, toggleNightDelivery, toggleBranchAutoHaul, setBranchAutoHaul, buyBranchPower, hireForBranch, fireFromBranch, setBranchShift, coverCalloff, bonusBranchStaff, restBranchStaff, closePanel, openPanel } = useGame();
  const [tab, setTab] = useState<'info' | 'night' | 'report'>('info');

  if (!branch) {
    return (
      <>
        <h2 style={st.title}>🏪 {CONVENIENCE.name}</h2>
        <p style={st.sub}>
          Mặt bằng rộng {CONVENIENCE.width}×{CONVENIENCE.depth} m ở con đường bên kia, xa tiệm chính. Mở 24/7, chủ không đứng bán:
          thu ngân trực theo ca, người giao hàng chở hàng từ <b>kho chung</b> sang, bảo vệ canh trộm ban đêm.
        </p>
        <ul style={st.sub}>
          <li>Giá mua mặt bằng (mua đứt, sở hữu luôn): <b>{formatMoney(CONVENIENCE.openCost)}</b></li>
          <li>Mua đứt nên không có tiền thuê — mỗi ngày chỉ trả lương nhân viên chi nhánh</li>
          <li>Kệ chứa tới {CONVENIENCE.shelfCap} món, giá bán ×{CONVENIENCE.priceMul} so với tiệm chính</li>
        </ul>
        {level < CONVENIENCE.unlock
          ? <p style={st.warn}>🔒 Mở ở cấp {CONVENIENCE.unlock}</p>
          : <button style={st.primary} disabled={money < CONVENIENCE.openCost} onClick={openBranch}>Mua mặt bằng</button>}
        {level >= CONVENIENCE.unlock && money < CONVENIENCE.openCost && <p style={st.warn}>Chưa đủ tiền — có thể vay ở mục Kinh doanh.</p>}
      </>
    );
  }

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
        <span style={{ ...st.badge, background: branch.open ? '#2ecc71' : '#7f8c8d' }}>{branch.open ? 'ĐANG MỞ 24/7' : 'ĐANG ĐÓNG'}</span>
        <button style={st.primary} onClick={toggleBranch}>{branch.open ? 'Đóng cửa' : 'Mở cửa'}</button>
      </div>
      <div style={st.tabs}>
        {([['info', '📊 Tình hình'], ['night', '🌙 Ban đêm'], ['report', '📈 Theo giờ']] as const).map(([id, label]) => (
          <button key={id} style={{ ...st.tab, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Hôm nay: <b>{branch.customersToday}</b> khách · thu <b>{formatMoney(branch.revenueToday)}</b>
            {branch.missedToday > 0 && <> · {branch.missedToday} khách bỏ về</>}{branch.lostToday > 0 && <> · mất trộm {branch.lostToday} món</>}{branchWeekendMul(day, 23 * 60) > 1 && <> · 🌙 đêm cuối tuần khách ×1,3</>}</div>
          <div>Chi phí mỗi ngày: {formatMoney(wages)} lương (mặt bằng đã mua đứt, không thuê)</div>
          {(() => {
            const op = branchOperatingBalanceToday(branch);
            const chipColor = op.verdict === 'surplus' ? '#2ecc71' : op.verdict === 'deficit' ? '#e74c3c' : '#7f8c8d';
            const chipText = op.verdict === 'surplus' ? 'dư vận hành' : op.verdict === 'deficit' ? 'âm' : 'chưa có thu';
            return (
              <div>🧮 Còn lại sau lương & điện: <b style={{ color: chipColor }}>{formatMoney(op.balance)}</b>{' '}
                <span style={{ color: chipColor, border: `1px solid ${chipColor}`, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{chipText}</span>{' '}
                <span style={st.sub}>(quầy {formatMoney(branch.revenueToday)} + máy {formatMoney(branch.vendingRevenueToday ?? 0)} − lương {formatMoney(op.wages)} − điện {formatMoney(op.power)})</span>
                <div style={st.sub}>Số dư vận hành; chưa phân bổ giá vốn hàng đã nhập.</div>
              </div>
            );
          })()}
          {(() => { // GĐ194: hồi vốn 5tr mua mặt bằng theo số dư vận hành hôm nay (mẫu GĐ192)
            const pb = branchBuildPayback(branch);
            if (pb.verdict === 'nodata') return null;
            const c = pb.verdict === 'worth' ? '#2ecc71' : pb.verdict === 'slow' ? '#e67e22' : '#e74c3c';
            return (
              <div style={{ fontSize: 12, color: c }}>
                💸 {formatMoney(CONVENIENCE.openCost)} mua mặt bằng:{' '}
                {pb.verdict === 'notworth'
                  ? <>số dư âm <b>~{formatMoney(-pb.netPerDay)}/ngày</b> — chưa hồi vốn (thu ít hơn lương+điện)</>
                  : <>hồi vốn sau <b>~{pb.paybackDays} ngày</b> (dư ~{formatMoney(pb.netPerDay)}/ngày)</>}{' '}
                <span style={st.sub}>· theo hôm nay, chưa trừ giá vốn hàng</span>
              </div>
            );
          })()}
          {(() => {
            const miss = branchMissSummary(venueTrend);
            return (
              <Callout tone="warn" title="🚪 Bỏ lỡ hôm qua & gần đây">
                {miss.totalMissed === 0
                  ? <div style={st.sub}>Chưa có số liệu bỏ lỡ — số này ghi lại mỗi tối.</div>
                  : <>
                      {miss.last && miss.last.missed > 0 && (
                        <div style={st.sub}>
                          Hôm qua <b>{miss.last.missed}</b> khách bỏ về — ước bỏ lỡ ~<b>{formatMoney(miss.last.estMoney)}</b>{' '}
                          (bán bình quân {formatMoney(Math.round(miss.last.estMoney / miss.last.missed))}/khách).
                        </div>
                      )}
                      <div style={st.sub}>14 ngày gần đây: ước ~<b>{formatMoney(miss.totalEstMoney)}</b>.</div>
                      {miss.worst && miss.worst.estMoney > 0 && <div style={st.sub}>Tệ nhất ngày {miss.worst.day}: ~<b>{formatMoney(miss.worst.estMoney)}</b>.</div>}
                      <div style={st.sub}>Khách bỏ về vì quầy vắng người trực hoặc kệ hết hàng — đủ người trực và trữ đủ hàng sẽ cứu được số này.</div>
                    </>}
              </Callout>
            );
          })()}
          <div>Hàng trên kệ: <b>{shelfTotal(branch.shelf)}</b>/{CONVENIENCE.shelfCap} món (lấy từ kho chung)</div>
          {top.length > 0 && <div style={st.sub}>{top.map(([id, q]) => `${isHotFood(id) ? '🔥' : ''}${productById(id).name} ×${q}`).join(' · ')}</div>}
          <div style={st.sub}>🍽️ Thực đơn xoay theo ca: sáng (5–11h) ưu tiên điểm tâm — bánh mì, xôi, cà phê; trưa (11–15h) ưu tiên cơm phần, đồ ăn nhanh; tối–đêm thiên về đồ nóng & món đêm (giá đêm cao hơn).</div>
          {atBranch && <p style={{ ...st.sub, color: '#2ecc71' }}>🧑‍💼 Bạn đang ở chi nhánh — thiếu thu ngân thì bạn tự đứng quầy.</p>}
          {calloff && (
            <div style={st.event}>
              <b>📵 {calloffWho?.name ?? 'Nhân viên'} ca đêm xin nghỉ đột xuất</b>
              {calloff.covered
                ? <span>✅ Đã có người làm thay.</span>
                : <>
                    <span style={st.sub}>Gọi người làm thay (gấp {coverMul(branch)} lương ca), hoặc tự chạy sang chi nhánh đứng quầy.</span>
                    <button style={st.primary} onClick={coverCalloff}>Gọi người thay ({formatMoney(calloffCost)})</button>
                  </>}
            </div>
          )}
          {!has('manager') && <p style={st.sub}>💡 Thuê 📋 Quản lý: tự xếp ca, cho người mệt nghỉ luân phiên, tự gọi xe khi kệ vơi, tự gọi người thay khi có ai xin nghỉ.</p>}
          {!has('cashier') && <p style={st.warn}>⚠️ Chưa có thu ngân — khách tới không ai bán.</p>}
          {has('cashier') && gaps.length > 0 && <p style={st.warn}>⚠️ Không có thu ngân lúc: {gaps.map((h) => `${h}h`).join(', ')}. Thêm người ca đêm/ca chiều.</p>}
          {!has('courier') && !has('stocker') && <p style={st.warn}>⚠️ Chưa có người giao/xếp hàng — kệ sẽ không được chở hàng từ kho chung.</p>}
          {!has('guard') && <p style={st.warn}>⚠️ Không có bảo vệ — ban đêm dễ mất trộm.</p>}
          {stockLeft < nightNeed() && <p style={st.warn}>⚠️ Kho chung sắp cạn (còn {stockLeft} món, mỗi đêm cần ~{nightNeed()}), đêm nay chi nhánh có thể hết hàng.</p>}
          <div style={{ ...st.event, display: 'block' }}>
            <div style={st.row}>
              <b>🥤 Máy bán hàng tự động ngoài cửa</b>
              <button style={st.primary} onClick={toggleVending}>{branch.vendingEnabled ? 'Tắt máy' : `Lắp máy · ${formatMoney(VENDING_COST)}`}</button>
            </div>
            <div style={st.sub}>
              Bán kể cả khi đóng cửa / không ai trực — chỉ cần có người giao/xếp hàng trực để nạp hàng định kỳ từ kho chung.
              {branch.vendingEnabled && <> Đang chạy: hàng trong máy <b>{vendingTotal(branch.vendingStock ?? {})}</b>/{VENDING_CAP}, hôm nay bán thêm được <b>{formatMoney(branch.vendingRevenueToday ?? 0)}</b>.</>}
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
                    ? <>Hoàn vốn sau ~{vp.days} ngày bán đều thế này (đã trừ điện máy ~{formatMoney(vp.electricityPerDay)}/ngày).</>
                    : <>Hôm nay máy chưa đủ bù điện (~{formatMoney(vp.electricityPerDay)}/ngày) — xếp thêm món ưa chạy nhé.</>}
                </div>
              );
            })()}
          </div>
          <div style={{ ...st.event, display: 'block', marginTop: 8 }}>
            <div style={st.row}>
              <b>🚚 Auto chuyển kho</b>
              <button style={st.primary} onClick={toggleBranchAutoHaul}>{branch.autoHaul ? 'Đang bật · Tắt' : 'Bật tự chở'}</button>
            </div>
            {(() => {
              const cfg = autoHaulCfg(branch);
              return (
                <div style={{ ...st.row, marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                  <span style={st.sub}>Chở khi kệ vơi dưới</span>
                  <input type="number" min={Math.round(HAUL_BELOW_MIN * 100)} max={Math.round(HAUL_BELOW_MAX * 100)} step={5}
                    defaultValue={Math.round(cfg.below * 100)} style={{ width: 54, padding: '3px 6px', borderRadius: 6, border: 'none', color: '#222' }}
                    onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) setBranchAutoHaul(v / 100, undefined); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />%
                  <span style={st.sub}>· giãn</span>
                  <input type="number" min={Math.round(HAUL_EVERY_MIN / 60)} max={Math.round(HAUL_EVERY_MAX / 60)} step={1}
                    defaultValue={Math.round(cfg.every / 60)} style={{ width: 46, padding: '3px 6px', borderRadius: 6, border: 'none', color: '#222' }}
                    onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) setBranchAutoHaul(undefined, v * 60); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />h/chuyến
                </div>
              );
            })()}
            <div style={st.sub}>
              Khi bật, chi nhánh tự chở hàng từ <b>kho chung</b> mỗi khi kệ vơi dưới ~{Math.round(HAUL_REFILL_BELOW * 100)}% sức chứa
              (giãn ~{HAUL_TRIP_EVERY / 60}h/chuyến) — <b>không cần người giao/xếp/quản lý</b>; mỗi chuyến trả phí xăng {formatMoney(CONVENIENCE.tripFee)}.
              {(() => { const plan = haulTripPlan(branch, storage); return plan.units > 0
                ? <> Chuyến hiện tại sẽ chở <b>{plan.units} món</b> ({plan.cost ? formatMoney(plan.cost) : 'miễn phí'}).</>
                : ' Kệ đang đủ / kho chung hết đồ để chở.'; })()}
            </div>
          </div>
        </div>
      )}

      {tab === 'night' && <BranchNightTab />}

      {tab === 'report' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={st.sub}>Doanh thu từng giờ hôm nay. Giờ chi nhánh cao mà nhiều khách bỏ về thì nên xếp thêm thu ngân ca đó.</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span><i style={{ ...st.dot, background: '#f1c40f' }} /> Tiệm chính</span>
            <span><i style={{ ...st.dot, background: '#2ecc71' }} /> Tiện lợi 24/7</span>
          </div>
          <div style={st.chart} role="img" aria-label="Biểu đồ doanh thu theo giờ">
            {mainHourly.map((v, h) => (
              <div key={h} style={st.col} title={`${h}h — tiệm chính ${formatMoney(v)}, tiện lợi ${formatMoney(branchHourly[h])}`}>
                <div style={st.bars}>
                  <div style={{ ...st.bar, background: '#f1c40f', height: `${(v / peak) * 100}%` }} />
                  <div style={{ ...st.bar, background: '#2ecc71', height: `${(branchHourly[h] / peak) * 100}%` }} />
                </div>
                <small style={{ opacity: h % 3 ? 0 : 0.7 }}>{h}</small>
              </div>
            ))}
          </div>
          <div style={st.sub}>Hôm nay: tiệm chính {formatMoney(mainHourly.reduce((n, v) => n + v, 0))} · tiện lợi {formatMoney(branch.revenueToday)}</div>
        </div>
      )}
      <div style={{ textAlign: 'right', marginTop: 12 }}><button style={st.btn} onClick={closePanel}>Đóng</button></div>
    </>
  );
}
