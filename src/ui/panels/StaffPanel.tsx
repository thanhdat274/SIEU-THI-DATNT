import { askConfirm } from '../ConfirmDialog';
import type * as React from 'react';
import { lixiBlock, lixiCost, LIXI_PER_STAFF } from '../../data/lixi';
import { useState } from 'react';
import { Dropdown } from '../Dropdown';
import { useGame } from '../../core/store';
import { dailyWage, maxStaff, ROLES, SHIFTS, type Shift, type Staff } from '../../data/staff';
import { formatMoney, fmtMul } from '../../data/products';
import { blockedLabel, shortLabel } from '../shortLabel';
import { hasUpgrade } from '../../data/upgrades';
import { branchStaffWish } from '../../data/branches';
import { BranchShiftStrip, BranchValueLine, NightStaffLine, NightStrip, ShiftValueStrip, StaffIdleLine, StaffValueLine, CourierValueLine, StaffPoachWarn } from './StaffLines';
import { Footer, Callout, styles, Tabs } from './shared';
import { wageCoverage } from '../../data/wageCoverage';
import { expToNext, shownTrait, trainCost, TRAITS } from '../../data/staffTraits';
import { payrollRunway } from '../../data/payrollRunway';
import { trainValue } from '../../data/trainValue';
import { staffEff } from '../../data/staffEff';
import { serveCoverage, SERVE_TOP_HOURS } from '../../data/serveCoverage';
import { hirePayoff } from '../../data/hirePayoff';
import { managerAutoPayoff } from '../../data/managerAutoPayoff';
import { warehouseKeeperPayoff } from '../../data/warehouseKeeperPayoff';
import { farmhandPayoff } from '../../data/farmhandPayoff';
import { spoilNightReport } from '../../data/advice';
import { petActive } from '../../data/bizAchievements';
import { storeMissRevenue } from '../../data/advice';
import { staffValueToday, staffShiftSummary, courierPhoneValue } from '../../data/staffValue';
import { staffAtRiskOfPoach } from '../../data/biz';
import { staffIdleStats, type StaffIdleRow } from '../../data/staffIdle';
import { staffDaySnapshot } from '../../core/slices/staffDay';
import { branchShiftSummary, branchStaffValueToday } from '../../data/branchStaffValue';
import { nightStaffValueToday } from '../../data/nightStaffValue';
import { nightPnl } from '../../data/nightReport';
import { nextPromotion, promotionWorth, RANKS } from '../../data/careers';
import { BONUS_RELIEF, BRANCH_ROLES, BRANCH_SHIFT_NAME, BRANCH_SHIFTS, CONVENIENCE, FATIGUE_QUIT, FATIGUE_SLOW, fatigueOf, restingOn } from '../../data/branches';
import { gapsOf, SITE_NAME, type Site } from '../../data/transfer';

export function StaffPanel() {
  const [tab, setTab] = useState<'team' | 'hire'>('team');
  const { staff, candidates, level, day, money, autoOpen, hire, fire, setShift, trainStaff, promoteStaff, closePanel, biz, branch, hireForBranch, stats, skills, dirt, storage, deliveries, furniture, sales, salesToday, analytics, garden, weatherSeed, weather } = useGame();
  const [pick, setPick] = useState<Record<number, Shift>>({});
  const max = maxStaff(level);
  const bStaff = branch?.staff ?? [];
  // GĐ1267 — lỗ THẬT đang đo hôm nay để nói "thuê vai này vá gì" cạnh từng ứng viên (helper THUẦN,
  // không đổi state). Chỉ ra dòng khi có tín hiệu trung thực; còn lại để mô tả desc, không bịa.
  const hireCtx = {
    waitMissed: stats?.missed?.wait ?? 0,
    shelfMissInStorageLoss: (() => {
      const miss = storeMissRevenue(stats?.missLog, storage);
      if (!miss) return 0;
      return miss.rows.filter((r) => r.inStorage > 0).reduce((n, r) => n + r.estLoss, 0);
    })(),
    dirt: dirt ?? 0,
    level, customers: stats?.customers ?? 0, revenue: stats?.revenue ?? 0,
    // GĐ1269 — bảo vệ: đọc đúng bối cảnh phòng thủ hiện tại để nói "thuê giữ ~X vụ trộm/ngày"
    guardCount: staff.filter((s) => s.role === 'guard').length,
    cashierStaffed: staff.some((s) => s.role === 'cashier'),
    hasDog: petActive(biz.pets?.dog, day),
    hasCamera: (biz.upgrades ?? []).includes('camera'),
    hasSharpEye: skills.includes('sharp_eye'),
  };
  // GĐ2220 — quản lý tự nhập hàng: đọc đúng luật managerNeedToRestock (pending từ deliveries, shelved
  // từ furniture tiers) để nói "thuê quản lý nó tự nhập N món sắp cạn / hôm nay lỡ ~Xđ vì hết hàng".
  const pending = (deliveries ?? []).reduce<Record<string, number>>((acc, d) => {
    for (const [id, q] of Object.entries(d.items)) acc[id] = (acc[id] ?? 0) + q;
    return acc;
  }, {});
  const shelved = [...new Set((furniture ?? []).flatMap((f) => f.tiers.map((t) => t.productId).filter((id): id is string => !!id)))];
  const managerPayoff = managerAutoPayoff({ shelved, storage, pending, sales: sales ?? {}, salesToday: salesToday ?? {}, missLog: stats?.missLog });
  // GĐ2221 — quản lý kho tự giảm hàng hỏng: "đêm qua" theo convention SkillsPanel = analytics[day-1] (đêm vừa chốt).
  const warehouseBestSkill = staff.reduce((best, st) => (st.role === 'warehouse_mgr' ? Math.max(best, st.skill) : best), 0);
  const warehousePayoff = warehouseKeeperPayoff({ spoiltCost: (analytics ? spoilNightReport(analytics, day - 1)?.totalCost : 0) ?? 0, bestSkill: warehouseBestSkill });
  // GĐ2222 — phụ trại tự lo trại (tưới/cho ăn/gom/thu) mỗi tối đáng bao nhiêu: đọc trạng thái trại thật.
  const farmhandVal = farmhandPayoff(garden, storage ?? {}, day, { seed: weatherSeed, weather });
  const total = [...staff, ...bStaff].reduce((sum, st) => sum + dailyWage(st), 0);
  // GĐ141: giá trị hôm nay của từng nhân viên ca ngày tiệm chính so với lương (thuần đọc stats.byHour)
  const staffValues = staffValueToday(stats?.byHour, staff);
  // GĐ1181: người giao (🛵) không ghi doanh thu quầy — giá trị thật của họ là kênh điện thoại họ mở + chở (stats.phone)
  const courierValues = courierPhoneValue(stats ?? {}, staff);
  const shiftSum = staffShiftSummary(stats?.byHour, staff);
  // GĐ144: giá trị hôm nay của từng nhân viên CA ĐÊM tiệm chính so với lương (thuần đọc stats.byHour giờ ≥22)
  const nightValues = nightStaffValueToday(stats?.byHour, staff, skills);
  const nightStrip = nightPnl(stats?.byHour, staff, skills);
  // GĐ1185: rival máu liều đủ mạnh có thể móc nhân viên giỏi nhất về đêm — cảnh báo trước (mẫu atRiskOfPoach GĐ794)
  const poachRiskId = staffAtRiskOfPoach(biz.rival, staff);
  // Ca mặc định khi thuê vào chi nhánh: ca đầu tiên còn thiếu thu ngân, đủ hết thì ca đêm
  const needShift = BRANCH_SHIFTS.find((sh) => !bStaff.some((x) => x.shift === sh && x.role === 'cashier')) ?? 'night';
  // GĐ246: % rảnh từng người hôm nay (dữ liệu transient do agent đếm, reset đầu ngày)
  const idleRows = staffIdleStats(staffDaySnapshot(), staff).rows;
  return (
    <>
      <h2 style={styles.title}>👥 Nhân viên</h2>
      <div style={staffSt.stats}>
        <div style={staffSt.stat}><small>Nhân sự</small><b>{staff.length + bStaff.length}</b><small>{staff.length}/{max} tiệm chính{branch ? ` · ${bStaff.length}/${CONVENIENCE.maxStaff} tiện lợi` : ''}</small></div>
        <div style={staffSt.stat}><small>Tổng lương / ngày</small><b>{formatMoney(total)}</b><small>cả hai tiệm, trả lúc đi ngủ</small></div>
      </div>
      {(() => {
        const wageCov = wageCoverage(stats, staff);
        if (wageCov.wageBill <= 0) return null;
        return (
          <Callout tone={wageCov.coverNow ? 'ok' : 'warn'} style={{ marginBottom: 8 }} title={`💸 Lương đội ${formatMoney(wageCov.wageBill)}/ngày — cần ~${wageCov.breakEvenVisits ?? '?'} lượt khách để vừa đủ (bình quân ${formatMoney(Math.round(wageCov.avgPerVisit))}/lượt)`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {wageCov.avgPerVisit > 0
                ? (wageCov.coverNow
                    ? `Hôm nay ${wageCov.customers} lượt, doanh thu trung bình đủ nuôi lương (mỗi lượt dư ${formatMoney(Math.round(wageCov.marginPerVisit))}).`
                    : `Hôm nay ${wageCov.customers} lượt, đang thiếu ${formatMoney(Math.round(-wageCov.marginPerVisit))}/lượt so với mức nuôi lương — kéo đông khách hơn hoặc cắt bớt người.`)
                : 'Chưa có doanh thu hôm nay — để qua giữa ngày rồi xem lại.'}
            </div>
          </Callout>
        );
      })()}
      {(() => {
        const pr = payrollRunway(money ?? 0, total);
        if (pr.wageBill <= 0) return null;
        return (
          <Callout tone={pr.covered ? 'ok' : 'danger'} style={{ marginBottom: 8 }} title={`🧾 Tiền mặt ${formatMoney(pr.cash)} — ${formatMoney(pr.wageBill)} lương trả tối nay: ${pr.covered ? 'đủ' : `thiếu ${formatMoney(pr.shortfall)}`}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {pr.covered
                ? `Cầm đủ lương tối nay${pr.runwayDays != null && pr.runwayDays > 0 ? `, tạm đủ ${pr.runwayDays} ngày lương nữa` : ''}.`
                : `Chưa đủ trả lương tối nay — bớt nhập hàng, xả sỉ/gánh chợ hoặc lót vay trước khi ngủ.`}
            </div>
          </Callout>
        );
      })()}
      {(() => {
        if (!stats?.byHour || Object.keys(stats.byHour).length === 0 || !staff.length) return null;
        const cov = serveCoverage({ staff, byHour: stats.byHour });
        if (cov.verdict === 'empty') return null;
        const noVacant = cov.vacantBusy.length === 0;
        return (
          <Callout tone={noVacant ? 'ok' : 'warn'} style={{ marginBottom: 8 }} title={
            noVacant
              ? (cov.peak ? `👥 Giờ ${cov.peak.hour}h đông nhất (~${cov.peak.customers} khách) vẫn có người trực` : '👥 Chưa có khách hôm nay')
              : `🧑🍳 ${cov.vacantBusy.map((v) => `giờ ${v.hour}h (~${v.customers} khách)`).join(', ')} đông mà vắng người bán`
          }>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {cov.vacantBusy.length > 0 && <>Những giờ đó không ai trực → khách chờ lâu dễ bỏ về. {''}</>}
              {cov.busiestStaffed.length > 0 && (
                <>Đông nhất còn người trực: {cov.busiestStaffed.slice(0, SERVE_TOP_HOURS).map((h) => `giờ ${h.hour}h (${h.customers} khách/${h.onDuty} người)`).join(', ')}.</>
              )}
              {' '}Cân nhắc xếp người ca nguyên ngày/đổi ca để phủ giờ đông.
            </div>
          </Callout>
        );
      })()}
      {(() => {
        // GĐ246: soi nhân viên rảnh — chỉ lên Callout khi có người rảnh phần lớn ca (nên xử lý);
        // còn lại xem từng người ở dòng 🧍 trong thẻ nhân viên, tránh ồn khi đội vừa sức.
        const mostIdle = idleRows.reduce<StaffIdleRow | null>((a, b) => (!a || b.idlePct > a.idlePct ? b : a), null);
        if (!mostIdle || mostIdle.verdict !== 'idle_heavy') return null;
        return (
          <Callout tone="warn" style={{ marginBottom: 8 }} title={`🧍 ${mostIdle.icon} ${mostIdle.name} rảnh ~${mostIdle.idlePct}% ca (làm ${mostIdle.workMin}m · nghỉ ${mostIdle.idleMin}m)`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              Vai này đang dư người hoặc thiếu việc: cân nhắc bớt một ca, điều sang tiệm kia (🔀) hoặc giảm tuyển vai tương tự. Xem % rảnh của từng người ngay dưới tên họ.
            </div>
          </Callout>
        );
      })()}
      <Tabs tabs={[['team', '📋 Đang làm'], ['hire', '🔍 Tuyển dụng']]} value={tab} onChange={setTab} />

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <DeployBoard />
          <LixiStrip />
          <ShiftValueStrip sum={shiftSum} hasData={!!stats?.byHour && Object.keys(stats.byHour).length > 0} />
          <NightStrip p={nightStrip} />
          {branch && <b style={staffSt.section}>🏬 Tiệm chính ({staff.length}/{max})</b>}
          {!staff.length && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ ...styles.card, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13 }}>Chưa có nhân viên nào trong tiệm ({staff.length}/{max} chỗ).</span>
                <button style={{ ...styles.btn, marginLeft: 0, background: '#f1c40f', color: '#222', fontWeight: 700 }} onClick={() => setTab('hire')}>
                  📋 Sang tab Tuyển dụng
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>Cẩm nang các vị trí nhân viên</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {Object.entries(ROLES).slice(0, 6).map(([rk, r]) => (
                  <div key={rk} style={{ ...styles.card, display: 'grid', gap: 4, alignContent: 'start', opacity: level >= r.unlock ? 1 : 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <b style={{ fontSize: 13 }}>{r.icon} {r.name}</b>
                      <span style={{ fontSize: 11, opacity: 0.75 }}>{level >= r.unlock ? '✓ Đã mở' : `🔒 Cấp ${r.unlock}`}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {staff.map((st) => (
            <div key={st.id} style={staffSt.card}>
              <StaffInfo st={st} right={<span style={staffSt.wage}>{formatMoney(dailyWage(st))}<small>/ngày</small></span>} />
              <StaffPoachWarn rival={biz.rival} poachRiskId={poachRiskId === st.id ? st.id : undefined} />
              {st.shift === 'night' ? (
                <NightStaffLine sv={nightValues.find((v) => v.id === st.id)} />
              ) : st.role === 'courier' ? (
                <CourierValueLine sv={courierValues.find((v) => v.id === st.id)} />
              ) : (
                <StaffValueLine sv={staffValues.find((v) => v.id === st.id)} />
              )}
              <StaffIdleLine row={idleRows.find((r) => r.id === st.id)} />
              {st.role === 'manager' && managerPayoff.ok && (
                <div style={{ fontSize: 11, color: '#3498db' }} title="Quản lý tự nhập hàng khi kho sắp cạn (theo luật sẵn có).">{managerPayoff.line}</div>
              )}
              {st.role === 'warehouse_mgr' && warehousePayoff.ok && (
                <div style={{ fontSize: 11, color: '#3498db' }} title="Quản lý kho sắp xếp kho xoay hàng cận hạn lên trước nên hàng hỏng qua đêm chậm hơn — tiền cứu được tính từ số hỏng thật đêm qua.">{warehousePayoff.line}</div>
              )}
              {st.role === 'farmhand' && farmhandVal.ok && (
                <div style={{ fontSize: 11, color: '#3498db' }} title="Phụ trại mỗi tối tự tưới luống khô, đổ cám cho chuồng đói, gom trứng/sữa và thu hoạch luống chín — giá trị tính từ trạng thái trại thật (bán lẻ nhà trồng).">{farmhandVal.line}</div>
              )}
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
                {st.skill < 5 && (() => {
                  const eff = staffEff(st);
                  const tv = trainValue(staffValues.find((v) => v.id === st.id)?.value ?? 0, eff);
                  return (
                    <>
                      <button
                        style={{ ...staffSt.train, opacity: st.trainedDay === day || money < trainCost(st.skill) ? 0.45 : 1 }}
                        disabled={st.trainedDay === day || money < trainCost(st.skill)}
                        title={st.trainedDay === day ? 'Hôm nay đã học rồi' : 'Cộng kinh nghiệm, đủ thì lên sao (lương tăng theo)'}
                        onClick={() => trainStaff(st.id)}
                      >
                        {blockedLabel(st.trainedDay === day ? '🎓 Mai học tiếp' : null, `🎓 Đào tạo ${formatMoney(trainCost(st.skill))}`, trainCost(st.skill), money)}
                      </button>
                      {tv.paybackDays !== null && (
                        <span style={{ fontSize: 12, color: tv.worth ? '#2ecc71' : '#e67e22' }} title="Ước theo giá trị hôm nay của ca này">
                          hoà vốn ~{tv.paybackDays} ngày
                        </span>
                      )}
                    </>
                  );
                })()}
                <TransferButton id={st.id} from="main" />
                <button style={staffSt.fire} onClick={() => { void askConfirm(`Cho ${st.name} nghỉ việc?`, { danger: true, okLabel: 'Cho nghỉ' }).then((ok) => ok && fire(st.id)); }}>Cho nghỉ</button>
              </div>
            </div>
          ))}
          <BranchRoster />
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
                    <button style={staffSt.hire} disabled={staff.length >= max} onClick={() => hire(c.id)}>{branch ? 'Thuê vào tiệm chính' : 'Thuê'}</button>
                  </>
                }
              />
              {(() => {
                const p = hirePayoff(c.role, { wage: c.wage, ...hireCtx });
                return p.ok ? (
                  <div style={{ fontSize: 11, marginTop: 2, color: '#2ecc71' }}>{p.line}</div>
                ) : null;
              })()}
              {c.role === 'manager' && managerPayoff.ok && (
                <div style={{ fontSize: 11, marginTop: 2, color: '#3498db' }} title="Quản lý tự nhập hàng khi kho sắp cạn (theo luật sẵn có).">{managerPayoff.line}</div>
              )}
              {c.role === 'warehouse_mgr' && (() => {
                const p = warehouseKeeperPayoff({ spoiltCost: (analytics ? spoilNightReport(analytics, day - 1)?.totalCost : 0) ?? 0, bestSkill: c.skill });
                return p.ok ? (
                  <div style={{ fontSize: 11, marginTop: 2, color: '#3498db' }} title="Quản lý kho sắp xếp kho xoay hàng cận hạn lên trước nên hàng hỏng qua đêm chậm hơn — tiền cứu được tính từ số hỏng thật đêm qua (ước theo tay nghề người này).">{p.line}</div>
                ) : null;
              })()}
              {c.role === 'farmhand' && farmhandVal.ok && (
                <div style={{ fontSize: 11, marginTop: 2, color: '#3498db' }} title="Phụ trại mỗi tối tự tưới luống khô, đổ cám cho chuồng đói, gom trứng/sữa và thu hoạch luống chín — giá trị tính từ trạng thái trại thật (bán lẻ nhà trồng).">{farmhandVal.line}</div>
              )}
              {branch && BRANCH_ROLES.includes(c.role) && (
                <div style={staffSt.actions}>
                  <span style={staffSt.label}>🏪 Hoặc thuê vào tiện lợi 24/7</span>
                  <Dropdown
                    value={pick[c.id] ?? needShift}
                    onChange={(v) => setPick({ ...pick, [c.id]: v })}
                    ariaLabel={`Ca làm cho ${c.name}`}
                    options={BRANCH_SHIFTS.map((k) => ({ value: k, label: BRANCH_SHIFT_NAME[k] }))}
                  />
                  <button style={staffSt.hire} disabled={bStaff.length >= CONVENIENCE.maxStaff} onClick={() => hireForBranch(c.id, pick[c.id] ?? needShift)}>Thuê vào tiện lợi</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

/** Thanh mệt: xanh → cam (bán chậm) → đỏ (dễ nghỉ việc). */
export function Fatigue({ value }: { value: number }) {
  const color = value >= FATIGUE_QUIT ? '#e74c3c' : value >= FATIGUE_SLOW ? '#e67e22' : '#2ecc71';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 140 }} title="Mệt cao: bán chậm, dễ nghỉ việc">
      😓 <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
        <span style={{ display: 'block', width: `${value}%`, height: '100%', borderRadius: 3, background: color }} />
      </span> {value}
    </span>
  );
}

/** Nhân viên tiện lợi 24/7 xếp theo ca, chung bảng với tiệm chính. */
function BranchRoster() {
  const { branch, day, money, level, weatherSeed, setBranchShift, bonusBranchStaff, restBranchStaff, restBranchStaffToday, denyStaffRest, fireFromBranch, promoteBranchStaff } = useGame();
  if (!branch) return null;
  // GĐ142: giá trị hôm nay của từng nhân viên chi nhánh so với lương (thuần đọc branch.hourly — revenue từng giờ)
  const wish = branchStaffWish(branch, weatherSeed, day); // GĐ727 — ai xin nghỉ hôm nay (băm riêng)
  const bValues = branchStaffValueToday(branch.staff, branch.hourly);
  const bValById = new Map(bValues.map((v) => [v.id, v]));
  const bShiftSum = branchShiftSummary(branch.hourly, branch.staff);
  const bHasData = !!branch.hourly && branch.hourly.some((v) => v > 0);
  const groups = [
    ...BRANCH_SHIFTS.map((sh) => [sh, BRANCH_SHIFT_NAME[sh], branch.staff.filter((x) => x.shift === sh)] as const),
    ...(branch.staff.some((x) => !BRANCH_SHIFTS.includes(x.shift)) ? [['full', 'Ca khác (chưa xếp vào 3 ca)', branch.staff.filter((x) => !BRANCH_SHIFTS.includes(x.shift))] as const] : []),
  ];
  return (
    <>
      <b style={staffSt.section}>🏪 Tiện lợi 24/7 ({branch.staff.length}/{CONVENIENCE.maxStaff})</b>
      <BranchShiftStrip sum={bShiftSum} hasData={bHasData} hasStaff={branch.staff.length > 0} />
      {groups.map(([sh, label, list]) => (
        <div key={sh} style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>🕒 {label}</span>
          {sh !== 'full' && !list.some((x) => x.role === 'cashier') && <small style={{ color: '#e67e22' }}>⚠️ Thiếu thu ngân — ca này khách tới không ai bán</small>}
          {sh === 'night' && !list.some((x) => x.role === 'guard') && <small style={{ color: '#e67e22' }}>⚠️ Ca đêm chưa có bảo vệ</small>}
          {!list.length && <small style={{ opacity: 0.6 }}>Chưa có ai.</small>}
          {list.map((x) => (
            <div key={x.id} style={staffSt.card}>
              <StaffInfo st={x} right={<span style={staffSt.wage}>{formatMoney(dailyWage(x))}<small>/ngày</small></span>} />
              <BranchValueLine sv={bValById.get(x.id)} />
              <span style={{ fontSize: 12 }}>
                {restingOn(branch, x.id, day) && <>🛌 nghỉ hôm nay · </>}
                {branch.restDay?.[x.id] === day + 1 && <>🛌 nghỉ ngày mai · </>}
              </span>
              <Fatigue value={fatigueOf(branch, x.id)} />
              <PromoteRow st={x} level={level} money={money} onPromote={promoteBranchStaff} />
              <div style={{ ...staffSt.actions, flexWrap: 'wrap' }}>
                <span style={staffSt.label}>🕒 Ca làm</span>
                <Dropdown
                  value={x.shift}
                  onChange={(v) => setBranchShift(x.id, v)}
                  ariaLabel={`Ca làm của ${x.name}`}
                  options={BRANCH_SHIFTS.map((k) => ({ value: k, label: BRANCH_SHIFT_NAME[k] }))}
                />
                <button style={staffSt.train} title={`Tốn 1 ngày lương, giảm ${BONUS_RELIEF} mệt`} onClick={() => bonusBranchStaff(x.id)}>🎁 Thưởng</button>
                {wish?.id === x.id && branch.wishDenied?.[x.id] !== day && (
                  <>
                    {wish.kind === 'nghỉ' ? (
                      <button style={{ ...staffSt.train, background: '#f1c40f', color: '#3a3a4d', fontWeight: 700 }} title="Ca nay thiếu người thật — nhưng tối nay người được xả mệt" onClick={() => restBranchStaffToday(x.id)}>😴 Cho nghỉ hôm nay</button>
                    ) : (
                      <button style={{ ...staffSt.train, background: '#f1c40f', color: '#3a3a4d', fontWeight: 700 }} title={`Chuyển sang ${BRANCH_SHIFT_NAME[wish.toShift ?? 'afternoon']} — dùng action đổi ca có sẵn`} onClick={() => setBranchShift(x.id, wish.toShift ?? 'afternoon')}>⏰ Chuyển ca</button>
                    )}
                    <button style={staffSt.train} title={wish.kind === 'nghỉ' ? 'Mệt thêm một bậc, người hơi buồn' : 'Không sao — để xem ca sau'} onClick={() => denyStaffRest(x.id, wish.kind === 'nghỉ' ? 10 : 0)}>😔 Giữ lại</button>
                  </>
                )}
                <button style={staffSt.train} disabled={branch.restDay?.[x.id] === day + 1} title="Nghỉ ngày mai không lương, hồi hết mệt" onClick={() => restBranchStaff(x.id)}>🛌 Nghỉ mai</button>
                <TransferButton id={x.id} from="branch" />
                <button style={staffSt.fire} onClick={() => { void askConfirm(`Cho ${x.name} nghỉ việc?`, { danger: true, okLabel: 'Cho nghỉ' }).then((ok) => ok && fireFromBranch(x.id)); }}>Cho nghỉ</button>
              </div>
            </div>
          ))}
        </div>
      ))}
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
              ? gaps.map((g) => <small key={g} style={{ color: '#e67e22' }}>⚠️ {g}</small>)
              : <small style={{ color: '#2ecc71' }}>✅ đủ người các ca</small>}
            {site === 'branch' && (
              <small style={{ opacity: 0.8 }}>
                {branch.open ? 'Đang mở' : 'Đang đóng'} · hôm nay {branch.customersToday} khách{branch.missedToday ? `, bỏ lỡ ${branch.missedToday}` : ''}
              </small>
            )}
          </div>
        ))}
      </div>
      <small style={{ opacity: 0.75 }}>Bấm 🔀 trên từng người để điều sang tiệm kia; giữ nguyên tay nghề, lương, chức vụ, mỗi người một lần mỗi ngày. Tiện lợi chỉ nhận thu ngân, xếp hàng, giao hàng, bảo vệ, quản lý.</small>
      <button
        style={{ ...staffSt.train, justifySelf: 'start' }}
        disabled={branch.open || !branch.staff.length}
        title={branch.open ? 'Đóng cửa chi nhánh trước' : 'Chuyển cả đội chi nhánh về tiệm chính (tới khi đủ chỗ)'}
        onClick={() => { void askConfirm('Dồn hết nhân viên chi nhánh về tiệm chính?', { okLabel: 'Dồn về' }).then((ok) => ok && evacuateBranch()); }}
      >
        {blockedLabel(branch.open ? '🏬 Đóng chi nhánh để dồn' : null, '🏬 Dồn hết sang tiệm chính', 0, 0)}
      </button>
    </div>
  );
}

/** Dòng thăng chức: điều kiện còn thiếu hoặc nút thăng chức (thu ngân → trưởng quầy → quản lý chi nhánh).
 *  GĐ1258 — đủ điều kiện thì kèm dòng 💡 "được gì, tăng lương bao nhiêu" (promotionWorth — hằng số
 *  quyền lợi có sẵn trong game), hết hộp đen "chỉ thấy giá + lương ×N không thấy lợi". */
export function PromoteRow({ st, level, money, onPromote }: { st: Staff; level: number; money: number; onPromote: (id: number) => void }) {
  const chk = nextPromotion(st, level);
  if (!chk) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
      <span style={{ flex: 1, minWidth: 180, opacity: 0.85 }} title={chk.def.desc}>
        {chk.def.icon} Lên <b>{chk.def.name}</b>
        {chk.ok ? ` — đủ điều kiện (lương ×${fmtMul(chk.def.raise)})` : ` — cần ${chk.missing.join(', ')}`}
      </span>
      <button style={styles.btn} disabled={!chk.ok || money < chk.def.cost} onClick={() => onPromote(st.id)}>
        {blockedLabel(chk.ok ? null : 'Chưa đủ điều kiện', `Thăng chức · ${formatMoney(chk.def.cost)}`, chk.def.cost, money)}
      </button>
      {chk.ok && (() => {
        const w = promotionWorth(st, chk.to);
        return (
          <div style={{ width: '100%', fontSize: 12, color: '#2ecc71', lineHeight: 1.35 }}>💡 {w.line}</div>
        );
      })()}
    </div>
  );
}

export function StaffInfo({ st, right }: { st: Staff; right?: React.ReactNode }) {
  const role = ROLES[st.role];
  const trait = shownTrait(st);
  const eff = staffEff(st);
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
            <span style={{ ...staffSt.role, background: trait === 'sticky' ? '#e74c3c' : staffSt.role.background }} title={TRAITS[trait].desc}>{TRAITS[trait].icon} {TRAITS[trait].name}</span>
          ) : (
            <span style={{ ...staffSt.role, opacity: 0.6 }} title="Làm vài ngày mới biết tính">❔ Chưa rõ tính</span>
          )}
          {st.caught && <span style={{ ...staffSt.role, background: '#e74c3c' }}>🚨 Từng gian lận</span>}
        </div>
        {st.skill < 5 && st.daysWorked !== undefined && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Kinh nghiệm {st.exp ?? 0}/{expToNext(st.skill)} · đã làm {st.daysWorked} ngày</div>
        )}
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, color: '#f1c40f' }}>
          ⚡ Làm nhanh ×{fmtMul(eff.speed)}
          {!eff.maxed && eff.roleBonus ? ` · ${eff.roleBonus}` : eff.roleBonus}
          {!eff.maxed && ` · +1★ nhanh thêm ${eff.nextDeltaPct}%`}
          {!eff.maxed && ` · đào tạo ${formatMoney(eff.trainCost)}/buổi (cộng 4 exp, cần ${eff.expNeeded})`}
        </div>
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
  head: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, // GĐ264: @390 lương rơi xuống dòng thay vì bóp cột info
  avatar: { width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(241,196,15,0.15)', fontSize: 20 },
  role: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' },
  stars: { color: '#f1c40f', fontSize: 12, letterSpacing: 1 },
  wage: { flex: 'none', fontWeight: 700, color: '#f1c40f', whiteSpace: 'nowrap' },
  // GĐ264: flexWrap — @390 hàng 'Ca làm + Đào tạo + hoà vốn + Chuyển + Cho nghỉ' dài hơn card, tràn ngang
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' },
  label: { fontSize: 12, opacity: 0.7 },
  section: { fontSize: 15, marginTop: 6, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.12)' },
  fire: { marginLeft: 'auto', border: '1px solid rgba(255,118,117,0.5)', background: 'transparent', color: '#ff7675', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  train: { border: '1px solid rgba(241,196,15,0.5)', background: 'transparent', color: '#f1c40f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 },
  hire: { flex: 'none', border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' },
};

/** GĐ1520: dải lì xì Tết — chỉ hiện trong dịp Tết khi có nhân viên. */
function LixiStrip() {
  const { day, lixiDay, staff, money, giveLixi } = useGame();
  const block = lixiBlock(day, lixiDay ?? 0, staff.length, money);
  if (block === 'not-tet' || block === 'no-staff') return null;
  return (
    <div style={{ background: '#c0392b22', borderRadius: 6, padding: 8, fontSize: 13 }}>
      🧧 Tết đến — mừng tuổi mỗi người {formatMoney(LIXI_PER_STAFF)}, cả đội thêm kinh nghiệm như học một buổi.
      <button style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#c0392b', opacity: block ? 0.5 : 1 }}
        disabled={!!block} onClick={() => giveLixi()}>
        {block === 'given' ? 'Đã lì xì Tết này' : `🧧 Lì xì cả đội (${formatMoney(lixiCost(staff.length))})`}
      </button>
    </div>
  );
}
