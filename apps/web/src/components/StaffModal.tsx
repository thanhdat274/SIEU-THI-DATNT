import React from 'react';
import { PlayerData, StaffCandidate, StaffMember, StaffShift, STAFF_SHIFTS } from '@game/shared';
import { getMaxStaffSlots, STAFF_ROLE_INFO } from '@game/data';
import { PixelButton, PixelDialog, money } from './pixel';
import { RestockJobTarget } from '@game/shared';
import { describeWorkerError } from '@game/core';

interface Props {
  player: PlayerData;
  day: number;
  candidates: StaffCandidate[];
  staff: StaffMember[];
  wageDebt: number;
  onHire: (candidateId: string) => { success: boolean; reason?: string };
  onSetShift: (staffId: string, shift: StaffShift) => boolean;
  onPayWageDebt?: () => void;
  restockTargets?: RestockJobTarget[];
  onAssignRefillJob?: (staffId: string, fixtureId: string) => { success: boolean; reason?: string };
  onClose: () => void;
}

export const StaffModal: React.FC<Props> = ({ player, day, candidates, staff, wageDebt, onHire, onSetShift, onPayWageDebt, restockTargets = [], onAssignRefillJob, onClose }) => {
  const slots = getMaxStaffSlots(player.level);
  const hiredIds = new Set(staff.map((member) => member.id));

  const hasDebt = wageDebt > 0 && !!onPayWageDebt;
  const debtRow = (
    <div className="staff-debt" style={{ marginBottom: 12, padding: 12, background: '#f5efe6', border: '1px solid #d1c4b2', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <div className="staff-debt-info" style={{ flex: '1 1 200px' }}>
        <strong>Quỹ lương và công nợ · nợ {money(wageDebt)}</strong>
        <p className="muted" style={{ margin: '4px 0 0' }}>Trả ngay bằng tiền đang có, không cần chờ kết ngày.</p>
      </div>
      <PixelButton variant="teal" disabled={player.money <= 0} onClick={onPayWageDebt} title="Trả ngay bằng tiền đang có, không cần chờ kết ngày">
        Trả nợ lương{player.money < wageDebt ? ` (một phần ${money(Math.floor(player.money))})` : ` ${money(wageDebt)}`}
      </PixelButton>
    </div>
  );

  const fundPanel = (
      <details className="staff-fund" style={{ marginBottom: 16, padding: 12, background: '#f5efe6', border: '1px solid #d1c4b2' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Quỹ lương và công nợ · nợ {money(wageDebt)}</summary>
      </details>
  );

  return (
    <PixelDialog title="Nhân viên tiệm" subtitle={`Ứng viên ngày ${day} · ${staff.length}/${slots} vị trí`} icon="person" onClose={onClose}>
      {hasDebt && debtRow}

      <section className={staff.length === 0 ? 'staff-hired staff-hired-empty' : 'staff-hired'} style={{ marginBottom: 18 }}>
        <h3>Nhân viên đang làm · {staff.length}</h3>
        {staff.length === 0 ? <p className="muted">Chưa tuyển nhân viên nào.</p> : staff.map((member) => (
          <article key={member.id} className="product-row">
            <div className="product-info">
              <h3>{member.name} · {STAFF_ROLE_INFO[member.role].label}</h3>
              <p>Lương đủ ngày {money(member.dailyWage)} · Tốc độ {member.speed} · Chính xác {member.accuracy} · Sức bền {member.stamina}</p>
              <p className="muted">{member.workerTask ? `Đang bày kệ ${member.workerTask.fixtureId}` : member.currentCheckoutId ? 'Đang phục vụ khách tại quầy' : describeWorkerError(member.lastWorkerError) ?? 'Đang rảnh'}</p>
            </div>
            <label className="staff-shift" style={{ display: 'grid', gap: 4, minWidth: 'min(170px, 100%)' }}>
              Ca làm
              <select aria-label={`Ca làm của ${member.name}`} value={member.shift} onChange={(event) => onSetShift(member.id, event.target.value as StaffShift)}>
                {Object.values(STAFF_SHIFTS).map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
              </select>
            </label>
          </article>
        ))}
      </section>

      <section className="staff-candidates">
        <h3>Ứng viên hôm nay</h3>
        {candidates.map((candidate: StaffCandidate) => {
          const hired = hiredIds.has(candidate.id);
          const locked = player.level < 2;
          const full = staff.length >= slots;
          const canAfford = player.money >= candidate.hiringFee;
          const reason = locked ? 'Mở tuyển ở cấp 2' : full ? 'Đã hết vị trí' : !canAfford ? 'Thiếu tiền tuyển dụng' : '';
          return (
            <article key={candidate.id} className="product-row">
              <div className="product-info">
                <h3>{candidate.name} · {STAFF_ROLE_INFO[candidate.role].label}</h3>
                <p>Tốc độ {candidate.speed} · Chính xác {candidate.accuracy} · Sức bền {candidate.stamina} · Lương/ngày {money(candidate.dailyWage)}</p>
                <p>Phí tuyển: {money(candidate.hiringFee)}{reason ? ` · ${reason}` : ''}</p>
              </div>
              <div className="product-actions">
                <PixelButton variant="teal" disabled={hired || !!reason} onClick={() => onHire(candidate.id)}>
                  {hired ? 'Đã tuyển' : 'Tuyển'}
                </PixelButton>
              </div>
            </article>
          );
        })}
      </section>

      {!hasDebt && fundPanel}
    </PixelDialog>
  );
};
