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

describe('đơn xin nghỉ phép', () => {
  const crew = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, role: 'cashier' as const }));
  it('tất định theo (seed, ngày); khoảng 12% người xin; thợ vườn không xin', async () => {
    const { leaveRequests } = await import('../data/staffLeave');
    const a = leaveRequests(crew, 7, 20).map((x) => x.id);
    expect(leaveRequests(crew, 7, 20).map((x) => x.id)).toEqual(a);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThan(20);
    expect(leaveRequests([{ id: 1, role: 'farmhand' as const }], 7, 20)).toEqual([]);
  });
  it('đã nghỉ/đang cooldown/bị từ chối hôm nay thì không xin', async () => {
    const { leaveRequests } = await import('../data/staffLeave');
    const ids = leaveRequests(crew, 7, 20).map((x) => x.id);
    const blocked = crew.map((c) => (ids.includes(c.id) ? { ...c, leaveDenied: 20 } : c));
    expect(leaveRequests(blocked, 7, 20)).toEqual([]);
    const rest = crew.map((c) => (ids.includes(c.id) ? { ...c, leaveDay: 18 } : c));
    expect(leaveRequests(rest, 7, 20)).toEqual([]);
  });
  it('duyệt = nghỉ hôm nay; từ chối = ẩn đơn, trừ 1 exp', async () => {
    const { useGame } = await import('../core/store');
    const base = { id: 901, name: 'Test', role: 'cashier', skill: 1, wage: 100, shift: 'morning', exp: 3 };
    useGame.setState({ day: 20, staff: [base] } as never);
    useGame.getState().denyLeave(901);
    expect(useGame.getState().staff[0]).toMatchObject({ leaveDenied: 20, exp: 2 });
    useGame.getState().approveLeave(901);
    expect(useGame.getState().staff[0].leaveDay).toBe(20);
  });
});
