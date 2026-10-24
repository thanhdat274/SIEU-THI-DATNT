import { useState } from 'react';
import { useGame } from '../core/store';
import { BRANCH_ROLES, BRANCH_SHIFT_NAME, BRANCH_SHIFTS, CONVENIENCE, nightNeed, shelfTotal, uncoveredHours } from '../data/branches';
import { dailyWage, ROLES, type Shift } from '../data/staff';
import { formatMoney, productById } from '../data/products';
import { Dropdown } from './Dropdown';

/** Cửa hàng tiện lợi 24/7: thuê mặt bằng, tuyển người, xem doanh thu. */
export function BranchPanel() {
  const { branch, level, money, candidates, storage, openBranch, toggleBranch, hireForBranch, fireFromBranch, setBranchShift, closePanel } = useGame();
  const [tab, setTab] = useState<'info' | 'team' | 'hire'>('info');
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
          <li>Tiền cọc + sửa sang: <b>{formatMoney(CONVENIENCE.openCost)}</b></li>
          <li>Tiền thuê mỗi ngày: <b>{formatMoney(CONVENIENCE.rent)}</b> + lương nhân viên chi nhánh</li>
          <li>Kệ chứa tới {CONVENIENCE.shelfCap} món, giá bán ×{CONVENIENCE.priceMul} so với tiệm chính</li>
        </ul>
        {level < CONVENIENCE.unlock
          ? <p style={st.warn}>🔒 Mở ở cấp {CONVENIENCE.unlock}</p>
          : <button style={st.primary} disabled={money < CONVENIENCE.openCost} onClick={openBranch}>Thuê mặt bằng</button>}
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

  return (
    <>
      <h2 style={st.title}>🏪 {CONVENIENCE.name}</h2>
      <div style={st.row}>
        <span style={{ ...st.badge, background: branch.open ? '#27ae60' : '#7f8c8d' }}>{branch.open ? 'ĐANG MỞ 24/7' : 'ĐANG ĐÓNG'}</span>
        <button style={st.primary} onClick={toggleBranch}>{branch.open ? 'Đóng cửa' : 'Mở cửa'}</button>
      </div>
      <div style={st.tabs}>
        {([['info', '📊 Tình hình'], ['team', `👥 Nhân viên (${branch.staff.length}/${CONVENIENCE.maxStaff})`], ['hire', '🔍 Tuyển']] as const).map(([id, label]) => (
          <button key={id} style={{ ...st.tab, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Hôm nay: <b>{branch.customersToday}</b> khách · thu <b>{formatMoney(branch.revenueToday)}</b>
            {branch.missedToday > 0 && <> · {branch.missedToday} khách bỏ về</>}{branch.lostToday > 0 && <> · mất trộm {branch.lostToday} món</>}</div>
          <div>Chi phí mỗi ngày: {formatMoney(CONVENIENCE.rent)} thuê + {formatMoney(wages)} lương</div>
          <div>Hàng trên kệ: <b>{shelfTotal(branch.shelf)}</b>/{CONVENIENCE.shelfCap} món (lấy từ kho chung)</div>
          {top.length > 0 && <div style={st.sub}>{top.map(([id, q]) => `${productById(id).name} ×${q}`).join(' · ')}</div>}
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
                  <span>{ROLES[s.role].icon} <b>{s.name}</b> · {ROLES[s.role].name} · {'★'.repeat(s.skill)}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Dropdown
                      value={s.shift}
                      onChange={(v) => setBranchShift(s.id, v)}
                      ariaLabel={`Ca làm của ${s.name}`}
                      options={BRANCH_SHIFTS.map((k) => ({ value: k, label: BRANCH_SHIFT_NAME[k] }))}
                    />
                    <span>{formatMoney(dailyWage(s))}/ngày</span>
                    <button style={st.btn} onClick={() => confirm(`Cho ${s.name} nghỉ việc?`) && fireFromBranch(s.id)}>Cho nghỉ</button>
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
      <div style={{ textAlign: 'right', marginTop: 12 }}><button style={st.btn} onClick={closePanel}>Đóng</button></div>
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
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
