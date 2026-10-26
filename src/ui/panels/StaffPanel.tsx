import type * as React from 'react';
import { useState } from 'react';
import { Dropdown } from '../Dropdown';
import { useGame } from '../../core/store';
import { dailyWage, maxStaff, ROLES, SHIFTS, type Shift, type Staff } from '../../data/staff';
import { formatMoney } from '../../data/products';
import { hasUpgrade } from '../../data/upgrades';
import { Footer, styles, Tabs } from './shared';
import { expToNext, shownTrait, trainCost, TRAITS } from '../../data/staffTraits';
import { nextPromotion, RANKS } from '../../data/careers';
import { CONVENIENCE } from '../../data/branches';
import { gapsOf, SITE_NAME, type Site } from '../../data/transfer';

export function StaffPanel() {
  const [tab, setTab] = useState<'team' | 'hire'>('team');
  const { staff, candidates, level, day, money, autoOpen, hire, fire, setShift, trainStaff, promoteStaff, closePanel, biz } = useGame();
  const max = maxStaff(level);
  const total = staff.reduce((sum, st) => sum + dailyWage(st), 0);
  return (
    <>
      <h2 style={styles.title}>👥 Nhân viên</h2>
      <div style={staffSt.stats}>
        <div style={staffSt.stat}><small>Nhân sự</small><b>{staff.length}/{max}</b><small>lên cấp để thuê thêm</small></div>
        <div style={staffSt.stat}><small>Tổng lương / ngày</small><b>{formatMoney(total)}</b><small>trả lúc đi ngủ</small></div>
      </div>
      <Tabs tabs={[['team', '📋 Đang làm'], ['hire', '🔍 Tuyển dụng']]} value={tab} onChange={setTab} />

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <DeployBoard />
          {!staff.length && <p style={styles.sub}>Chưa có ai. Qua tab Tuyển dụng để thuê.</p>}
          {staff.map((st) => (
            <div key={st.id} style={staffSt.card}>
              <StaffInfo st={st} right={<span style={staffSt.wage}>{formatMoney(dailyWage(st))}<small>/ngày</small></span>} />
              <PromoteRow st={st} level={level} money={money} onPromote={promoteStaff} />
              <div style={staffSt.actions}>
                <span style={staffSt.label}>🕒 Ca làm</span>
                {st.role === 'farmhand' ? (
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Cả ngày (ở trại tự lo)</span>
                ) : (
                  <Dropdown
                    value={st.shift}
                    onChange={(v) => setShift(st.id, v)}
                    ariaLabel={`Ca làm của ${st.name}`}
                    options={(Object.keys(SHIFTS) as Shift[])
                      .filter((k) => k !== 'night' || hasUpgrade(biz, 'night'))
                      .map((k) => ({ value: k, label: SHIFTS[k].name + (k === 'night' ? ' (cần Mở ca đêm)' : '') }))}
                  />
                )}
                {st.skill < 5 && (
                  <button
                    style={{ ...staffSt.train, opacity: st.trainedDay === day || money < trainCost(st.skill) ? 0.45 : 1 }}
                    disabled={st.trainedDay === day || money < trainCost(st.skill)}
                    title={st.trainedDay === day ? 'Hôm nay đã học rồi' : 'Cộng kinh nghiệm, đủ thì lên sao (lương tăng theo)'}
                    onClick={() => trainStaff(st.id)}
                  >
                    🎓 Đào tạo {formatMoney(trainCost(st.skill))}
                  </button>
                )}
                <TransferButton id={st.id} from="main" />
                <button style={staffSt.fire} onClick={() => confirm(`Cho ${st.name} nghỉ việc?`) && fire(st.id)}>Cho nghỉ</button>
              </div>
            </div>
          ))}
          <label style={staffSt.toggle}>
            <input type="checkbox" checked={autoOpen} onChange={(e) => useGame.setState({ autoOpen: e.target.checked })} />{' '}
            Thu ngân tự mở cửa khi vào ca, tự đóng cửa khi hết ca
          </label>
        </div>
      )}

      {tab === 'hire' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={styles.sub}>Mỗi sáng có ứng viên mới. Lương ghi theo một ca; làm cả ngày trả 1.6 lần.</p>
          <p style={styles.sub}>
            {Object.values(ROLES).map((r) => (
              <span key={r.name} style={{ marginRight: 10, opacity: r.unlock <= level ? 1 : 0.45 }} title={r.desc}>
                {r.icon} {r.name}{r.unlock > level ? ` (cấp ${r.unlock})` : ''}
              </span>
            ))}
          </p>
          {!candidates.length && <p style={styles.sub}>Hết ứng viên hôm nay, mai quay lại nhé.</p>}
          {candidates.map((c) => (
            <div key={c.id} style={staffSt.card}>
              <StaffInfo
                st={c}
                right={
                  <>
                    <span style={staffSt.wage}>{formatMoney(c.wage)}<small>/ca</small></span>
                    <button style={staffSt.hire} disabled={staff.length >= max} onClick={() => hire(c.id)}>Thuê</button>
                  </>
                }
              />
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

/** Nút điều người sang tiệm còn lại; ẩn nếu chưa có chi nhánh. */
export function TransferButton({ id, from }: { id: number; from: Site }) {
  const { branch, day, staff, level, transferStaff } = useGame();
  if (!branch) return null;
  const to: Site = from === 'main' ? 'branch' : 'main';
  const st = (from === 'main' ? staff : branch.staff).find((it) => it.id === id);
  const full = to === 'branch' ? branch.staff.length >= CONVENIENCE.maxStaff : staff.length >= maxStaff(level);
  const moved = st?.movedDay === day;
  const why = moved ? 'Hôm nay đã điều rồi' : full ? `${to === 'branch' ? 'Chi nhánh' : 'Tiệm chính'} đã đủ người` : `Điều sang ${SITE_NAME[to]} (giữ nguyên tay nghề, lương, chức vụ; mỗi người một lần mỗi ngày)`;
  return (
    <button style={staffSt.train} disabled={moved || full} title={why} onClick={() => transferStaff(id, to)}>
      🔀 Sang {to === 'branch' ? 'tiện lợi' : 'tiệm chính'}
    </button>
  );
}

/** Điều quân: so hai tiệm theo ca để biết chỗ nào thiếu người; chi nhánh đóng cửa thì dồn hết về tiệm chính. */
export function DeployBoard() {
  const { branch, staff, level, biz, evacuateBranch } = useGame();
  if (!branch) return null;
  const nightMain = hasUpgrade(biz, 'night');
  const sites: { site: Site; n: number; max: number; gaps: string[] }[] = [
    { site: 'main', n: staff.length, max: maxStaff(level), gaps: gapsOf(staff, 'main', nightMain) },
    { site: 'branch', n: branch.staff.length, max: CONVENIENCE.maxStaff, gaps: gapsOf(branch.staff, 'branch', true) },
  ];
  return (
    <div style={{ ...staffSt.card, background: '#2f3a4d' }}>
      <b>🔀 Điều quân giữa hai tiệm</b>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {sites.map(({ site, n, max, gaps }) => (
          <div key={site} style={staffSt.stat}>
            <small>{site === 'main' ? '🏬 Tiệm chính' : '🏪 Tiện lợi 24/7'}</small>
            <b>{n}/{max} người</b>
            {gaps.length
              ? gaps.map((g) => <small key={g} style={{ color: '#f39c12' }}>⚠️ {g}</small>)
              : <small style={{ color: '#2ecc71' }}>✅ đủ người các ca</small>}
            {site === 'branch' && (
              <small style={{ opacity: 0.8 }}>
                {branch.open ? 'Đang mở' : 'Đang đóng'} · hôm nay {branch.customersToday} khách{branch.missedToday ? `, bỏ lỡ ${branch.missedToday}` : ''}
              </small>
            )}
          </div>
        ))}
      </div>
      <small style={{ opacity: 0.75 }}>Bấm 🔀 trên từng người để điều. Giữ nguyên tay nghề, lương, chức vụ; mỗi người điều một lần mỗi ngày. Chi nhánh chỉ nhận thu ngân, xếp hàng, giao hàng, bảo vệ, quản lý.</small>
      <button
        style={{ ...staffSt.train, justifySelf: 'start' }}
        disabled={branch.open || !branch.staff.length}
        title={branch.open ? 'Đóng cửa chi nhánh trước' : 'Chuyển cả đội chi nhánh về tiệm chính (tới khi đủ chỗ)'}
        onClick={() => confirm('Dồn hết nhân viên chi nhánh về tiệm chính?') && evacuateBranch()}
      >
        🏬 Dồn hết sang tiệm chính
      </button>
    </div>
  );
}

/** Dòng thăng chức: điều kiện còn thiếu hoặc nút thăng chức (thu ngân → trưởng quầy → quản lý chi nhánh). */
export function PromoteRow({ st, level, money, onPromote }: { st: Staff; level: number; money: number; onPromote: (id: number) => void }) {
  const chk = nextPromotion(st, level);
  if (!chk) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
      <span style={{ flex: 1, minWidth: 180, opacity: 0.85 }} title={chk.def.desc}>
        {chk.def.icon} Lên <b>{chk.def.name}</b>
        {chk.ok ? ` — đủ điều kiện (lương ×${chk.def.raise})` : ` — cần ${chk.missing.join(', ')}`}
      </span>
      <button style={styles.btn} disabled={!chk.ok || money < chk.def.cost} onClick={() => onPromote(st.id)}>
        Thăng chức · {formatMoney(chk.def.cost)}
      </button>
    </div>
  );
}

export function StaffInfo({ st, right }: { st: Staff; right?: React.ReactNode }) {
  const role = ROLES[st.role];
  const trait = shownTrait(st);
  return (
    <div style={staffSt.head}>
      <span style={staffSt.avatar}>{role.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 15 }}>{st.name}</b>
          <span style={staffSt.role}>{role.name}</span>
          {st.rank && <span style={{ ...staffSt.role, background: '#8e6b00' }} title={RANKS[st.rank].desc}>{RANKS[st.rank].icon} {RANKS[st.rank].name}</span>}
          <span style={staffSt.stars} aria-label={`Tay nghề ${st.skill}/5`}>{'★'.repeat(st.skill)}<span style={{ opacity: 0.3 }}>{'★'.repeat(5 - st.skill)}</span></span>
          {trait ? (
            <span style={{ ...staffSt.role, background: trait === 'sticky' ? '#c0392b' : staffSt.role.background }} title={TRAITS[trait].desc}>{TRAITS[trait].icon} {TRAITS[trait].name}</span>
          ) : (
            <span style={{ ...staffSt.role, opacity: 0.6 }} title="Làm vài ngày mới biết tính">❔ Chưa rõ tính</span>
          )}
          {st.caught && <span style={{ ...staffSt.role, background: '#c0392b' }}>🚨 Từng gian lận</span>}
        </div>
        {st.skill < 5 && st.daysWorked !== undefined && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Kinh nghiệm {st.exp ?? 0}/{expToNext(st.skill)} · đã làm {st.daysWorked} ngày</div>
        )}
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{role.desc}</div>
      </div>
      {right}
    </div>
  );
}

export const staffSt: Record<string, React.CSSProperties> = {
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '4px 0 4px' },
  stat: { display: 'grid', gap: 2, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 },
  card: { display: 'grid', gap: 10, padding: 12, background: '#3a3a4d', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' },
  head: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(241,196,15,0.15)', fontSize: 20 },
  role: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' },
  stars: { color: '#f1c40f', fontSize: 12, letterSpacing: 1 },
  wage: { flex: 'none', fontWeight: 700, color: '#f1c40f', whiteSpace: 'nowrap' },
  actions: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' },
  label: { fontSize: 12, opacity: 0.7 },
  fire: { marginLeft: 'auto', border: '1px solid rgba(255,118,117,0.5)', background: 'transparent', color: '#ff7675', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  train: { border: '1px solid rgba(241,196,15,0.5)', background: 'transparent', color: '#f1c40f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 },
  hire: { flex: 'none', border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' },
};
