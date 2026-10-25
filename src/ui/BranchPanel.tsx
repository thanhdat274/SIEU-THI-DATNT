import { useState } from 'react';
import { useGame } from '../core/store';
import { BRANCH_ROLES, BRANCH_SHIFT_NAME, BRANCH_SHIFTS, BONUS_RELIEF, CONVENIENCE, COVER_WAGE_MUL, FATIGUE_QUIT, FATIGUE_SLOW, fatigueOf, isHotFood, nightNeed, restingOn, shelfTotal, uncoveredHours } from '../data/branches';
import { dailyWage, ROLES, type Shift } from '../data/staff';
import { formatMoney, productById } from '../data/products';
import { Dropdown } from './Dropdown';

/** Cửa hàng tiện lợi 24/7: thuê mặt bằng, tuyển người, xem doanh thu. */
export function BranchPanel() {
  const { branch, level, money, day, candidates, storage, stats, atBranch, openBranch, toggleBranch, hireForBranch, fireFromBranch, setBranchShift, coverCalloff, bonusBranchStaff, restBranchStaff, closePanel } = useGame();
  const [tab, setTab] = useState<'info' | 'team' | 'hire' | 'report'>('info');
  const [pick, setPick] = useState<Record<number, Shift>>({});

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
  const inShift = (sh: Shift) => branch.staff.filter((s) => s.shift === sh);
  // Ca mặc định khi tuyển: ca đầu tiên còn thiếu thu ngân, đủ hết thì ca đêm
  const needShift = BRANCH_SHIFTS.find((sh) => !inShift(sh).some((s) => s.role === 'cashier')) ?? 'night';
  const others = branch.staff.filter((s) => !BRANCH_SHIFTS.includes(s.shift));
  const calloff = branch.event?.kind === 'calloff' ? branch.event : null;
  const calloffWho = calloff ? branch.staff.find((s) => s.id === calloff.staffId) : undefined;
  const calloffCost = calloffWho ? Math.round(dailyWage(calloffWho) * COVER_WAGE_MUL) : 0;
  const mainHourly = Array.from({ length: 24 }, (_, h) => stats.byHour?.[h]?.revenue ?? 0);
  const branchHourly = branch.hourly ?? Array(24).fill(0);
  const peak = Math.max(1, ...mainHourly, ...branchHourly);

  return (
    <>
      <h2 style={st.title}>🏪 {CONVENIENCE.name}</h2>
      <div style={st.row}>
        <span style={{ ...st.badge, background: branch.open ? '#27ae60' : '#7f8c8d' }}>{branch.open ? 'ĐANG MỞ 24/7' : 'ĐANG ĐÓNG'}</span>
        <button style={st.primary} onClick={toggleBranch}>{branch.open ? 'Đóng cửa' : 'Mở cửa'}</button>
      </div>
      <div style={st.tabs}>
        {([['info', '📊 Tình hình'], ['team', `👥 Nhân viên (${branch.staff.length}/${CONVENIENCE.maxStaff})`], ['hire', '🔍 Tuyển'], ['report', '📈 Theo giờ']] as const).map(([id, label]) => (
          <button key={id} style={{ ...st.tab, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Hôm nay: <b>{branch.customersToday}</b> khách · thu <b>{formatMoney(branch.revenueToday)}</b>
            {branch.missedToday > 0 && <> · {branch.missedToday} khách bỏ về</>}{branch.lostToday > 0 && <> · mất trộm {branch.lostToday} món</>}</div>
          <div>Chi phí mỗi ngày: {formatMoney(wages)} lương (mặt bằng đã mua đứt, không thuê)</div>
          <div>Hàng trên kệ: <b>{shelfTotal(branch.shelf)}</b>/{CONVENIENCE.shelfCap} món (lấy từ kho chung)</div>
          {top.length > 0 && <div style={st.sub}>{top.map(([id, q]) => `${isHotFood(id) ? '🔥' : ''}${productById(id).name} ×${q}`).join(' · ')}</div>}
          {atBranch && <p style={{ ...st.sub, color: '#2ecc71' }}>🧑‍💼 Bạn đang ở chi nhánh — thiếu thu ngân thì bạn tự đứng quầy.</p>}
          {calloff && (
            <div style={st.event}>
              <b>📵 {calloffWho?.name ?? 'Nhân viên'} ca đêm xin nghỉ đột xuất</b>
              {calloff.covered
                ? <span>✅ Đã có người làm thay.</span>
                : <>
                    <span style={st.sub}>Gọi người làm thay (gấp {COVER_WAGE_MUL} lương ca), hoặc tự chạy sang chi nhánh đứng quầy.</span>
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
        </div>
      )}

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={st.sub}>Bán 24/7 nên chia 3 ca nối nhau. Ca nào cũng cần 1 thu ngân; ca đêm nên có bảo vệ; có ít nhất 1 người xếp/giao hàng để xe chở hàng từ kho chung.</p>
          {[...BRANCH_SHIFTS.map((sh) => [sh, BRANCH_SHIFT_NAME[sh], inShift(sh)] as const), ...(others.length ? [['full', 'Ca khác (chưa xếp vào 3 ca)', others] as const] : [])].map(([sh, label, list]) => (
            <div key={sh} style={st.shift}>
              <b>🕒 {label}</b>
              {sh !== 'full' && !list.some((s) => s.role === 'cashier') && <span style={st.warn}>⚠️ Thiếu thu ngân — ca này khách tới không ai bán</span>}
              {sh === 'night' && !list.some((s) => s.role === 'guard') && <span style={st.warn}>⚠️ Ca đêm chưa có bảo vệ</span>}
              {!list.length && <span style={st.sub}>Chưa có ai.</span>}
              {list.map((s) => (
                <div key={s.id} style={st.card}>
                  <span>{ROLES[s.role].icon} <b>{s.name}</b> · {ROLES[s.role].name} · {'★'.repeat(s.skill)}
                    {restingOn(branch, s.id, day) && <> · 🛌 nghỉ hôm nay</>}
                    {branch.restDay?.[s.id] === day + 1 && <> · 🛌 nghỉ ngày mai</>}
                  </span>
                  <Fatigue value={fatigueOf(branch, s.id)} />
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Dropdown
                      value={s.shift}
                      onChange={(v) => setBranchShift(s.id, v)}
                      ariaLabel={`Ca làm của ${s.name}`}
                      options={BRANCH_SHIFTS.map((k) => ({ value: k, label: BRANCH_SHIFT_NAME[k] }))}
                    />
                    <span>{formatMoney(dailyWage(s))}/ngày</span>
                    <button style={st.btn} title={`Tốn 1 ngày lương, giảm ${BONUS_RELIEF} mệt`} onClick={() => bonusBranchStaff(s.id)}>🎁 Thưởng</button>
                    <button style={st.btn} disabled={branch.restDay?.[s.id] === day + 1} title="Nghỉ ngày mai không lương, hồi hết mệt" onClick={() => restBranchStaff(s.id)}>🛌 Nghỉ mai</button>
                    <button style={st.btn} onClick={() => confirm(`Cho ${s.name} nghỉ việc?`) && fireFromBranch(s.id)}>Cho thôi việc</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'hire' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={st.sub}>Dùng chung danh sách ứng viên với tiệm chính. Chọn ca trước khi thuê — mặc định là ca đang thiếu thu ngân. Ca đêm trả ×1.5 lương.</p>
          {candidates.filter((c) => BRANCH_ROLES.includes(c.role)).map((c) => (
            <div key={c.id} style={st.card}>
              <span>{ROLES[c.role].icon} <b>{c.name}</b> · {ROLES[c.role].name} · {'★'.repeat(c.skill)} · {formatMoney(c.wage)}/ca</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Dropdown
                  value={pick[c.id] ?? needShift}
                  onChange={(v) => setPick({ ...pick, [c.id]: v })}
                  ariaLabel={`Ca làm cho ${c.name}`}
                  options={BRANCH_SHIFTS.map((k) => ({ value: k, label: BRANCH_SHIFT_NAME[k] }))}
                />
                <button style={st.btn} disabled={branch.staff.length >= CONVENIENCE.maxStaff} onClick={() => hireForBranch(c.id, pick[c.id] ?? needShift)}>Thuê</button>
              </span>
            </div>
          ))}
          {!candidates.some((c) => BRANCH_ROLES.includes(c.role)) && <p style={st.sub}>Hết ứng viên phù hợp hôm nay, mai quay lại.</p>}
        </div>
      )}
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

/** Thanh mệt: xanh → vàng (bán chậm) → đỏ (dễ nghỉ việc). */
function Fatigue({ value }: { value: number }) {
  const color = value >= FATIGUE_QUIT ? '#e74c3c' : value >= FATIGUE_SLOW ? '#f39c12' : '#2ecc71';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 140 }} title="Mệt cao: bán chậm, dễ nghỉ việc">
      😓 <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
        <span style={{ display: 'block', width: `${value}%`, height: '100%', borderRadius: 3, background: color }} />
      </span> {value}
    </span>
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
  warn: { fontSize: 13, color: '#f39c12', margin: '2px 0' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  badge: { padding: '4px 10px', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 12 },
  tabs: { display: 'flex', gap: 6, margin: '4px 0 12px', flexWrap: 'wrap' },
  tab: { padding: '6px 10px', borderRadius: 8, border: 'none', color: '#222', cursor: 'pointer' },
  shift: { display: 'grid', gap: 6, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, background: '#3a3a4d', borderRadius: 10 },
  primary: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, cursor: 'pointer' },
  btn: { padding: '6px 10px', borderRadius: 8, border: 'none', background: '#fff', color: '#222', cursor: 'pointer' },
};
