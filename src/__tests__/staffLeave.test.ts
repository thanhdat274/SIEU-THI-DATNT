import { describe, expect, it } from 'vitest';
import { bestSkillOnDuty } from '../data/staff';
import { LEAVE_COOLDOWN, leaveBlock, leaveWait, onLeave } from '../data/staffLeave';
import { quanStatusChips } from '../data/quanNuocStatus';
import { newQuanNuoc } from '../data/quanNuoc';

describe('nghỉ phép nhân viên', () => {
  it('chặn nghỉ trùng ngày và chờ đủ cooldown', () => {
    expect(leaveBlock({}, 10)).toBeNull();
    expect(leaveBlock({ leaveDay: 10 }, 10)).toBe('already');
    expect(leaveBlock({ leaveDay: 10 }, 11)).toBe('cooldown');
    expect(leaveWait({ leaveDay: 10 }, 11)).toBe(LEAVE_COOLDOWN - 1);
    expect(leaveBlock({ leaveDay: 10 }, 10 + LEAVE_COOLDOWN)).toBeNull();
    expect(onLeave({ leaveDay: 10 }, 10)).toBe(true);
    expect(onLeave({}, 10)).toBe(false);
  });
  it('người nghỉ phép không tính vào tay nghề trực ca', () => {
    const bt = { role: 'bartender' as const, skill: 5, shift: 'full' as const };
    expect(bestSkillOnDuty([bt], 'bartender', 9 * 60, 3)).toBe(5);
    expect(bestSkillOnDuty([{ ...bt, leaveDay: 3 }], 'bartender', 9 * 60, 3)).toBe(0);
    expect(bestSkillOnDuty([{ ...bt, leaveDay: 3 }], 'bartender', 9 * 60, 4)).toBe(5);
  });
});

describe('dải trạng thái quán nước', () => {
  it('quán chưa mở thì không có chip', () => {
    expect(quanStatusChips(newQuanNuoc(), 30, 100, 'sunny', 1)).toEqual([]);
  });
  it('hết đồ uống báo đỏ, kho dư báo xanh', () => {
    const q = { ...newQuanNuoc(), open: true, staff: 1 };
    const none = quanStatusChips(q, 30, 0, 'cloudy', 2);
    expect(none.find((c) => c.id === 'stock')?.tone).toBe('bad');
    const lots = quanStatusChips(q, 30, 100000, 'cloudy', 2);
    expect(lots.find((c) => c.id === 'stock')?.tone).toBe('ok');
    expect(lots.map((c) => c.id)).toEqual(['crowd', 'stock', 'staff', 'price', 'profit']);
  });
  it('bão thì khách vắng', () => {
    const q = { ...newQuanNuoc(), open: true, staff: 1 };
    expect(quanStatusChips(q, 30, 500, 'storm', 2).find((c) => c.id === 'crowd')?.text).toBe('Khách vắng');
  });
});
