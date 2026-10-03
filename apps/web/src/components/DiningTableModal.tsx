import React, { useState } from 'react';
import type { StaffMember, StoreFixture } from '@game/shared';
import { PixelButton, PixelDialog } from './pixel';

export interface Props {
  fixture: StoreFixture;
  state: { seats: number; occupied: number; dirty: boolean; enabled: boolean };
  staff: StaffMember[];
  onClean: () => void;
  onAssignCleaner: (staffId: string) => void;
  onClose: () => void;
}

export const DiningTableModal: React.FC<Props> = ({ fixture, state, staff, onClean, onAssignCleaner, onClose }) => {
  const [staffId, setStaffId] = useState('');
  const cleaners = staff.filter(member => member.role === 'refill' && !member.workerTask && !member.diningTask);
  return <PixelDialog title={fixture.label} subtitle="Bàn ăn trong tiệm" icon="coin" onClose={onClose}>
    <div className="summary-row">
      <div>
        <strong>{state.dirty ? 'Cần dọn' : state.occupied > 0 ? 'Đang có khách' : 'Bàn sạch, đang trống'}</strong>
        <p className="muted">Sức chứa {state.seats} chỗ · {state.occupied} khách đang ngồi</p>
      </div>
      {state.dirty && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PixelButton variant="teal" disabled={state.occupied > 0} onClick={onClean}>Tự dọn bàn</PixelButton>
        <select aria-label="Chọn nhân viên dọn bàn" value={staffId} onChange={event => setStaffId(event.target.value)}>
          <option value="">Chọn nhân viên bổ sung hàng</option>
          {cleaners.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <PixelButton variant="wood" disabled={!staffId || state.occupied > 0} onClick={() => onAssignCleaner(staffId)}>Giao việc dọn</PixelButton>
      </div>}
    </div>
    {!state.dirty && state.occupied === 0 && <p className="muted">Khách mua món ăn đóng gói có thể chọn dùng bàn tại quầy thu ngân.</p>}
  </PixelDialog>;
};
