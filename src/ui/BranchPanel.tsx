import { useState } from 'react';
import { useGame } from '../core/store';
import { CONVENIENCE, ALCOHOL_BRAWL_CHANCE, coverMul, NIGHT_DELIVERY_SURCHARGE, NIGHT_GROUPS, POWER_UPGRADES, VENDING_CAP, VENDING_COST, branchPowerBill, hasAlcohol, hasPower, isHotFood, nightNeed, shelfTotal, uncoveredHours, vendingTotal } from '../data/branches';
import { dailyWage } from '../data/staff';
import { branchOperatingBalanceToday } from '../data/branchNet';
import { branchMissSummary } from '../data/venueTrend';
import { vendingPayoff } from '../data/minorPayoff';
import { licenseById, licenseStatus } from '../data/licenses';
import { formatMoney, productById } from '../data/products';

/** Cửa hàng tiện lợi 24/7: thuê mặt bằng, tuyển người, xem doanh thu. */
export function BranchPanel() {
  const { branch, level, money, day, candidates, storage, stats, atBranch, online, licenses, venueTrend, openBranch, toggleBranch, toggleVending, toggleNightDelivery, buyBranchPower, hireForBranch, fireFromBranch, setBranchShift, coverCalloff, bonusBranchStaff, restBranchStaff, closePanel, openPanel } = useGame();
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
            {branch.missedToday > 0 && <> · {branch.missedToday} khách bỏ về</>}{branch.lostToday > 0 && <> · mất trộm {branch.lostToday} món</>}</div>
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
          {(() => {
            const miss = branchMissSummary(venueTrend);
            return (
              <div style={{ ...st.card, display: 'block', borderLeft: '3px solid #e67e22' }}>
                <b>🚪 Bỏ lỡ hôm qua & gần đây</b>
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
              </div>
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
        </div>
      )}

      {tab === 'night' && (() => {
        const alcLic = licenseStatus(licenses, 'alcohol', day);
        const licOk = alcLic === 'valid' || alcLic === 'expiring';
        const guardNight = branch.staff.some((s) => s.role === 'guard' && s.shift === 'night');
        const groups = branch.groupToday ?? {};
        const bill = branchPowerBill(branch);
        return (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ ...st.event, display: 'block', background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.45)' }}>
              <b>👥 Khách đêm theo nhóm</b>
              <div style={st.sub}>Từ 21h khách chia thành các nhóm có giờ cao điểm và món ưa thích riêng — kệ có đúng món thì họ mua nhiều hơn.</div>
              {NIGHT_GROUPS.map((g) => (
                <div key={g.id} style={{ ...st.row, marginBottom: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span>{g.icon} <b>{g.name}</b> · {groups[g.id] ?? 0} khách</span>
                  <span style={{ ...st.sub, minWidth: 140 }}>{g.desc}</span>
                </div>
              ))}
            </div>

            <div style={{ ...st.event, display: 'block' }}>
              <b>🍺 Rượu bia ban đêm</b>
              <div style={st.sub}>
                Bán rượu bia giờ đêm lời hơn (×1.15). Cần <b>{licenseById('alcohol').name}</b> (cấp {licenseById('alcohol').unlock}+): công an tuần tra đêm có thể phạt và tịch thu nếu thiếu phép.
                Không có bảo vệ ca đêm thì khách say dễ gây gổ ({Math.round(ALCOHOL_BRAWL_CHANCE * 100)}% mỗi lượt bán).
              </div>
              <div style={st.sub}>
                Giấy phép: <b style={{ color: licOk ? '#2ecc71' : '#e74c3c' }}>{licOk ? 'còn hạn' : alcLic === 'none' ? 'chưa có' : 'hết hạn'}</b>
                {' · '}hôm nay bán {branch.alcoholToday ?? 0} món rượu bia
              </div>
              {hasAlcohol(branch.shelf) && !licOk && level >= licenseById('alcohol').unlock && <p style={st.warn}>⚠️ Kệ đang có rượu bia mà chưa có giấy phép — xin ở bảng Giấy phép trước khi công an ghé.</p>}
              {hasAlcohol(branch.shelf) && !guardNight && <p style={st.warn}>⚠️ Ca đêm chưa có bảo vệ — bán rượu bia dễ xảy ra gây gổ.</p>}
            </div>

            <div style={{ ...st.event, display: 'block' }}>
              <div style={st.row}>
                <b>🛵 Giao hàng đêm qua app</b>
                <button style={st.primary} onClick={toggleNightDelivery}>{branch.nightDelivery ? 'Ngưng nhận đơn đêm' : 'Nhận đơn đêm'}</button>
              </div>
              <div style={st.sub}>
                Đơn app 22h–6h có phụ phí +{Math.round(NIGHT_DELIVERY_SURCHARGE * 100)}% (app giữ hoa hồng). Cần gian hàng app đã mở ({online.open ? 'đã mở' : 'chưa mở'}) và người giao hàng ca đêm không quá mệt; thiếu người giao thì đơn bị hủy, tụt điểm app. Shipper đêm đôi khi gặp sự cố mất đơn.
                {branch.nightDelivery && <> Đêm nay: <b>{branch.deliveryToday ?? 0}</b> đơn, thu <b>{formatMoney(branch.deliveryRevenueToday ?? 0)}</b>.</>}
              </div>
            </div>

            <div style={{ ...st.event, display: 'block' }}>
              <b>⚡ Điện lạnh</b>
              <div style={st.sub}>Tủ mát, tủ đông, bếp đồ nóng chạy suốt 24h: hóa đơn điện hôm nay <b>{formatMoney(bill)}</b> (trừ cuối ngày, nằm trong chi phí vận hành).</div>
              {POWER_UPGRADES.map((u) => (
                <div key={u.id} style={{ ...st.row, marginBottom: 2, alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>{u.icon} <b>{u.name}</b> <span style={st.sub}>— {u.desc}</span></span>
                  {hasPower(branch, u.id)
                    ? <span style={{ color: '#2ecc71' }}>✅ Đã lắp</span>
                    : <button style={st.btn} disabled={money < u.price} onClick={() => buyBranchPower(u.id)}>Lắp · {formatMoney(u.price)}</button>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

const st: Record<string, React.CSSProperties> = {
  event: { display: 'grid', gap: 6, padding: 10, borderRadius: 10, background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.5)' },
  chart: { display: 'flex', alignItems: 'stretch', gap: 2, height: 140, padding: '6px 0' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 },
  bars: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1 },
  bar: { flex: 1, minHeight: 1, borderRadius: '2px 2px 0 0' },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 4 },
  title: { margin: '0 0 8px' },
  sub: { fontSize: 13, opacity: 0.8, margin: '4px 0' },
  warn: { fontSize: 13, color: '#e67e22', margin: '2px 0' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  badge: { padding: '4px 10px', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 12 },
  tabs: { display: 'flex', gap: 6, margin: '4px 0 12px', flexWrap: 'wrap' },
  tab: { padding: '6px 10px', borderRadius: 8, border: 'none', color: '#222', cursor: 'pointer' },
  shift: { display: 'grid', gap: 6, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, background: '#3a3a4d', borderRadius: 10 },
  primary: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, cursor: 'pointer' },
  btn: { padding: '6px 10px', borderRadius: 8, border: 'none', background: '#fff', color: '#222', cursor: 'pointer' },
};
