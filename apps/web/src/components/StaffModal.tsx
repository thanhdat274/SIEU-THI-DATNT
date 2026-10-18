import React from 'react';
import { PlayerData, StaffCandidate, StaffMember, StaffShift, STAFF_SHIFTS } from '@game/shared';
import { getMaxStaffSlots, STAFF_ROLE_INFO, STAFF_SPECIALTIES } from '@game/data';
import { isStaffActiveAt, shiftWage, activeShiftOf, describeWorkerError } from '@game/core';
import { PixelButton, PixelDialog, money } from './pixel';
import { RestockJobTarget } from '@game/shared';

interface StaffBuildingOption {
  id: string | null;
  label: string;
}

interface Props {
  player: PlayerData;
  day: number;
  candidates: StaffCandidate[];
  staff: StaffMember[];
  wageDebt: number;
  /** Giờ game hiện tại để hiện "Đang trực/Ngoài ca" (OpenSpec `staff-shifts`). */
  time?: { day: number; hour: number; minute: number };
  /** Tòa đang có để gán nhân viên; thiếu = chỉ "Toàn tiệm". */
  staffBuildings?: StaffBuildingOption[];
  onHire: (candidateId: string) => { success: boolean; reason?: string };
  onSetShift: (staffId: string, shift: StaffShift) => boolean;
  onSetBuilding?: (staffId: string, buildingId: string | null) => boolean;
  onPayWageDebt?: () => void;
  restockTargets?: RestockJobTarget[];
  onAssignRefillJob?: (staffId: string, fixtureId: string) => { success: boolean; reason?: string };
  onClose: () => void;
}

export const StaffModal: React.FC<Props> = ({ player, day, candidates, staff, wageDebt, time, staffBuildings = [{ id: null, label: 'Toàn tiệm' }], onHire, onSetShift, onSetBuilding, onPayWageDebt, restockTargets = [], onAssignRefillJob, onClose }) => {
  const slots = getMaxStaffSlots(player.level);
  const hiredIds = new Set(staff.map((member) => member.id));
  const currentTime = time ?? { day, hour: 12, minute: 0 };

  const hasDebt = wageDebt > 0 && !!onPayWageDebt;
  const debtRow = (
    <div className="staff-debt" style={{ marginBottom: 12, padding: 12, background: 'var(--color-panel-selected)', border: '1px solid var(--color-outline-soft)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
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
      <details className="staff-fund" style={{ marginBottom: 16, padding: 12, background: 'var(--color-panel)', border: '1px solid var(--color-outline-soft)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Quỹ lương và công nợ · nợ {money(wageDebt)}</summary>
      </details>
  );

  return (
    <PixelDialog title="Nhân viên tiệm" subtitle={`Ứng viên ngày ${day} · ${staff.length}/${slots} vị trí`} icon="person" onClose={onClose}>
      {hasDebt && debtRow}

      <section className={staff.length === 0 ? 'staff-hired staff-hired-empty' : 'staff-hired'} style={{ marginBottom: 18 }}>
        <h3>Nhân viên đang làm · {staff.length}</h3>
        {staff.length === 0 ? <p className="muted">Chưa tuyển nhân viên nào.</p> : staff.map((member) => {
          const shift = activeShiftOf(member, undefined);
          const onShift = isStaffActiveAt(member, undefined, currentTime);
          const buildingLabel = staffBuildings.find((option) => option.id === (member.assignedBuilding ?? null))?.label ?? member.assignedBuilding ?? 'Toàn tiệm';
          return (
            <article key={member.id} className="product-row">
              <div className="product-info">
                <h3>{member.name} · {STAFF_ROLE_INFO[member.role].label}{member.specialty ? ` · ${STAFF_SPECIALTIES[member.specialty].icon} ${STAFF_SPECIALTIES[member.specialty].label}` : ''}</h3>
                <p>Lương theo ca {money(shiftWage(member.dailyWage, shift))} · đủ ngày {money(member.dailyWage)} · Tốc độ {member.speed} · Chính xác {member.accuracy} · Sức bền {member.stamina}</p>
                <p className="muted">{onShift ? 'Đang trực' : 'Ngoài ca'} · {buildingLabel} · {member.workerTask ? `Đang bày kệ ${member.workerTask.fixtureId}` : member.currentCheckoutId ? 'Đang phục vụ khách tại quầy' : describeWorkerError(member.lastWorkerError) ?? 'Đang rảnh'}</p>
              </div>
              <div style={{ display: 'grid', gap: 8, minWidth: 'min(200px, 100%)' }}>
                <label className="staff-shift" style={{ display: 'grid', gap: 4 }}>
                  Ca làm
                  <select aria-label={`Ca làm của ${member.name}`} value={member.shift} onChange={(event) => onSetShift(member.id, event.target.value as StaffShift)}>
                    {Object.values(STAFF_SHIFTS).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>
                {onSetBuilding && (
                  <label className="staff-building" style={{ display: 'grid', gap: 4 }}>
                    Làm việc tại
                    <select aria-label={`Tòa làm việc của ${member.name}`} value={member.assignedBuilding ?? ''} onChange={(event) => onSetBuilding(member.id, event.target.value === '' ? null : event.target.value)}>
                      {staffBuildings.map((option) => <option key={option.id ?? 'all'} value={option.id ?? ''}>{option.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </article>
          );
        })}
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
                <h3>{candidate.name} · {STAFF_ROLE_INFO[candidate.role].label}{candidate.specialty ? ` · ${STAFF_SPECIALTIES[candidate.specialty].icon} ${STAFF_SPECIALTIES[candidate.specialty].label}` : ''}</h3>
                <p>Tốc độ {candidate.speed} · Chính xác {candidate.accuracy} · Sức bền {candidate.stamina} · Lương/ngày {money(candidate.dailyWage)}</p>
                {candidate.specialty && <p style={{ fontSize: 12, opacity: 0.8 }}>{STAFF_SPECIALTIES[candidate.specialty].description}</p>}
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
