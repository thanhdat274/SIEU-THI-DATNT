import { describe, expect, it } from 'vitest';
import { noteStaffTime, staffDaySnapshot, resetStaffDay } from '../core/slices/staffDay';
import { staffIdleStats, staffDayRecap, staffShiftFix, morningShiftAction, idleVerdict, IDLE_HEAVY_PCT, IDLE_BUSY_PCT } from '../data/staffIdle';
import type { Staff } from '../data/staff';

// GĐ246: soi nhân viên rảnh — slice transient (đếm runtime) + helper thuần đọc.
// Đóng nợ mở "thời gian rảnh không ghi ở state nào": bây giờ agent đếm, bảng nhân viên soi được.

const st = (id: number, role: Staff['role'] = 'stocker'): Staff =>
  ({ id, name: `NV${id}`, role, skill: 3, wage: 0, shift: 'full' });

describe('staffDay slice — đếm thời gian trong ca (transient, không persist)', () => {
  it('cộng dồn làm/rảnh theo từng người; dt <= 0 bỏ qua', () => {
    resetStaffDay();
    noteStaffTime(1, 0.4, false);
    noteStaffTime(1, 0.4, true);
    noteStaffTime(1, 0.4, true);
    noteStaffTime(1, 0, true);
    noteStaffTime(2, 1, false);
    expect(staffDaySnapshot()).toEqual({ 1: { workSec: 0.4, idleSec: 0.8 }, 2: { workSec: 1, idleSec: 0 } });
  });

  it('snapshot là bản sao sâu — sửa bản chụp không ảnh hưởng dữ liệu gốc', () => {
    resetStaffDay();
    noteStaffTime(1, 10, true);
    const snap = staffDaySnapshot();
    snap[1].idleSec = 999;
    expect(staffDaySnapshot()[1].idleSec).toBe(10);
  });

  it('resetStaffDay xoá sạch khi sang ngày mới', () => {
    noteStaffTime(1, 10, false);
    resetStaffDay();
    expect(staffDaySnapshot()).toEqual({});
  });
});

describe('staffIdleStats — phân loại rảnh/bận', () => {
  it('rảnh phần lớn ca → idle_heavy; bận nhiều → busy; phụ trại + vai hiện diện bị loại', () => {
    resetStaffDay();
    for (let i = 0; i < 6; i++) noteStaffTime(1, 60, true); // 6 phút rảnh
    noteStaffTime(1, 60, false); // 1 phút làm
    for (let i = 0; i < 5; i++) noteStaffTime(2, 60, false); // 5 phút làm
    noteStaffTime(2, 60, true); // 1 phút rảnh
    noteStaffTime(3, 120, true); // phụ trại: không được đưa vào bảng
    noteStaffTime(4, 120, false); // thu ngân (vai hiện diện): cũng không vào bảng
    const sum = staffIdleStats(staffDaySnapshot(), [st(1), st(2, 'courier'), st(3, 'farmhand'), st(4, 'cashier')]);
    expect(sum.rows.length).toBe(2);
    const r1 = sum.rows.find((r) => r.id === 1)!;
    expect(r1.idlePct).toBe(86); // round(6/7 × 100)
    expect(r1.idleMin).toBe(6);
    expect(r1.workMin).toBe(1);
    expect(r1.verdict).toBe('idle_heavy');
    expect(r1.icon).toBe('📦');
    const r2 = sum.rows.find((r) => r.id === 2)!;
    expect(r2.idlePct).toBe(17);
    expect(r2.verdict).toBe('busy');
    expect(sum.mostIdle!.id).toBe(1);
    expect(sum.teamIdlePct).toBe(52); // round((86 + 17) / 2)
  });

  it('chưa ai vào ca (không có dữ liệu) → bảng rỗng, mostIdle null', () => {
    resetStaffDay();
    const sum = staffIdleStats(staffDaySnapshot(), [st(1)]);
    expect(sum.rows).toEqual([]);
    expect(sum.mostIdle).toBeNull();
    expect(sum.teamIdlePct).toBeNull();
  });

  it('dữ liệu có người nhưng tổng 0 giây (agent vừa reset) → không vào bảng', () => {
    resetStaffDay();
    noteStaffTime(1, 0, false);
    const sum = staffIdleStats(staffDaySnapshot(), [st(1)]);
    expect(sum.rows).toEqual([]);
  });

  it('idleVerdict theo ngưỡng (≥65 rảnh nhiều, <35 bận)', () => {
    expect(idleVerdict(70)).toBe('idle_heavy');
    expect(idleVerdict(IDLE_HEAVY_PCT)).toBe('idle_heavy');
    expect(idleVerdict(50)).toBe('balanced');
    expect(idleVerdict(IDLE_BUSY_PCT)).toBe('balanced');
    expect(idleVerdict(IDLE_BUSY_PCT - 1)).toBe('busy');
    expect(idleVerdict(0)).toBe('busy');
  });
});

describe('staffDayRecap — tổng kết đội cuối ngày (GĐ248)', () => {
  const idlePerson = () => {
    resetStaffDay();
    for (let i = 0; i < 7; i++) noteStaffTime(1, 60, true); // 7 phút rảnh
    noteStaffTime(1, 60, false); // 1 phút làm
  };

  it('không ai vào ca → nodata', () => {
    resetStaffDay();
    expect(staffDayRecap(staffDaySnapshot(), [st(1)], 0).verdict).toBe('nodata');
  });

  it('có người rảnh ≥65% ca, không mất khách vì chờ → idle_heavy (dư người/vai)', () => {
    idlePerson();
    const r = staffDayRecap(staffDaySnapshot(), [st(1)], 0);
    expect(r.verdict).toBe('idle_heavy');
    expect(r.mostIdle!.id).toBe(1);
    expect(r.mostIdle!.idlePct).toBe(88); // round(7/8 × 100)
  });

  it('rảnh ≥65% ca NHƯNG vẫn mất khách vì chờ → shift_mismatch (lệch ca, không phải bớt người)', () => {
    idlePerson();
    const r = staffDayRecap(staffDaySnapshot(), [st(1)], 4);
    expect(r.verdict).toBe('shift_mismatch');
    expect(r.teamIdlePct).toBe(88);
  });

  it('đội vừa sức (ai cũng <65% rảnh) → ok, dù hôm đó có mất khách vì chờ', () => {
    resetStaffDay();
    for (let i = 0; i < 6; i++) noteStaffTime(1, 60, false); // 6 phút làm
    noteStaffTime(1, 60, true); // 1 phút rảnh → ~14%
    expect(staffDayRecap(staffDaySnapshot(), [st(1)], 3).verdict).toBe('ok');
  });
});

describe('staffShiftFix — gợi ý xếp lại ca mai một chạm (GĐ253)', () => {
  const idlePerson = (id = 1) => {
    for (let i = 0; i < 7; i++) noteStaffTime(id, 60, true); // 7 phút rảnh (88%)
    noteStaffTime(id, 60, false); // 1 phút làm
  };

  it('không ai vào ca → null', () => {
    resetStaffDay();
    expect(staffShiftFix(staffDaySnapshot(), [st(1)], 0, null, undefined)).toBeNull();
  });

  it('đội vừa sức → null', () => {
    resetStaffDay();
    for (let i = 0; i < 6; i++) noteStaffTime(1, 60, false);
    noteStaffTime(1, 60, true);
    expect(staffShiftFix(staffDaySnapshot(), [st(1)], 0, null, undefined)).toBeNull();
  });

  it('ca full rảnh 88% → bớt còn nửa ca ĐÔNG khách hơn, tiết kiệm ~60% lương', () => {
    resetStaffDay();
    idlePerson();
    // chiều đông hơn sáng
    const byHour: Record<number, { customers: number; revenue: number }> = {};
    for (let h = 6; h <= 13; h++) byHour[h] = { customers: 2, revenue: 0 };
    for (let h = 14; h <= 21; h++) byHour[h] = { customers: 5, revenue: 0 };
    const person = { ...st(1), wage: 200000 };
    const fix = staffShiftFix(staffDaySnapshot(), [person], 0, null, byHour);
    expect(fix).not.toBeNull();
    expect(fix!.id).toBe(1);
    expect(fix!.to).toBe('afternoon');
    expect(fix!.label).toBe('bớt còn ca chiều');
    expect(fix!.wageDelta).toBe(-120000); // 200000 × (1 − 1.6)
  });

  it('byHour trống → rơi về peakHour (≥14 → ca chiều)', () => {
    resetStaffDay();
    idlePerson();
    const fix = staffShiftFix(staffDaySnapshot(), [st(1)], 0, 16, undefined);
    expect(fix!.to).toBe('afternoon');
  });

  it('người ca NỬA rảnh + KHÔNG mất khách vì chờ → không dời (bớt ca chỉ dành cho full)', () => {
    resetStaffDay();
    idlePerson();
    const person = { ...st(1), shift: 'morning' as const };
    expect(staffShiftFix(staffDaySnapshot(), [person], 0, null, undefined)).toBeNull();
  });

  it('người ca NỬA rảnh + mất khách vì chờ → dồn sang nửa ca đông, không đổi lương', () => {
    resetStaffDay();
    idlePerson();
    const person = { ...st(1), shift: 'afternoon' as const, wage: 150000 };
    const fix = staffShiftFix(staffDaySnapshot(), [person], 4, 12, undefined);
    expect(fix).not.toBeNull();
    expect(fix!.to).toBe('morning'); // peakHour 12 < 14 → sáng
    expect(fix!.label).toBe('dồn sang ca sáng');
    expect(fix!.wageDelta).toBe(0);
  });

  it('người nửa ca rảnh nhưng ĐANG đứng đúng nửa ca đông → không dời', () => {
    resetStaffDay();
    idlePerson();
    const person = { ...st(1), shift: 'morning' as const };
    expect(staffShiftFix(staffDaySnapshot(), [person], 4, 12, undefined)).toBeNull();
  });

  it('ca đêm không tự dời', () => {
    resetStaffDay();
    idlePerson();
    const person = { ...st(1), shift: 'night' as const };
    expect(staffShiftFix(staffDaySnapshot(), [person], 4, 16, undefined)).toBeNull();
  });

  it('vai hiện diện (thu ngân) không được đề xuất dời ca', () => {
    resetStaffDay();
    idlePerson(2);
    const person = { ...st(2, 'cashier'), wage: 100000 };
    expect(staffShiftFix(staffDaySnapshot(), [person], 0, null, undefined)).toBeNull();
  });

  it('nhiều người rảnh → ưu tiên người rảnh NẶNG nhất', () => {
    resetStaffDay();
    for (let i = 0; i < 6; i++) noteStaffTime(1, 60, true); // ~86%
    noteStaffTime(1, 60, false);
    for (let i = 0; i < 7; i++) noteStaffTime(2, 60, true); // 88%
    noteStaffTime(2, 60, false);
    const fix = staffShiftFix(staffDaySnapshot(), [st(1), st(2)], 0, null, undefined);
    expect(fix!.id).toBe(2);
  });
});

describe('morningShiftAction — tổng kết đội hôm qua thành việc sáng (GĐ295)', () => {
  const idlePerson = () => {
    for (let i = 0; i < 7; i++) noteStaffTime(1, 60, true); // ~88% rảnh
    noteStaffTime(1, 60, false);
  };

  it('hôm qua có người rảnh nặng còn cách sửa → sinh việc sáng ưu tiên 2 trỏ bảng nhân viên', () => {
    resetStaffDay();
    idlePerson();
    const act = morningShiftAction(staffDaySnapshot(), [{ ...st(1), wage: 150000 }], undefined);
    expect(act).not.toBeNull();
    expect(act!.panel).toBe('staff');
    expect(act!.priority).toBe(2);
    expect(act!.danger).toBe(false);
    expect(act!.icon).toBe('🧍');
    expect(act!.text).toContain('NV1');
  });

  it('hôm qua mất khách vì chờ (shift_mismatch) → lời nhắc nói rõ mất khách', () => {
    resetStaffDay();
    idlePerson();
    // người rảnh đứng nửa ca VẮNG (sáng) nhưng tiệm đông & mất khách buổi chiều → còn cách dồn ca
    const lastStats = { missed: { wait: 4 }, byHour: { 15: { customers: 10, revenue: 0 } } } as never;
    const act = morningShiftAction(staffDaySnapshot(), [{ ...st(1), shift: 'morning' as const }], lastStats);
    expect(act).not.toBeNull();
    expect(act!.text).toContain('mất khách vì chờ');
  });

  it('đội vừa sức (không ai rảnh nặng) → null', () => {
    resetStaffDay();
    noteStaffTime(1, 80, false);
    noteStaffTime(1, 20, true);
    expect(morningShiftAction(staffDaySnapshot(), [st(1)], undefined)).toBeNull();
  });

  it('gợi ý đã được áp dụng tối qua (không còn cách sửa) → null, không nhắc lại', () => {
    resetStaffDay();
    idlePerson();
    // người rảnh đang ca full → fix là "bớt còn nửa ca"; nếu đã chuyển sang nửa ca (không full)
    // và không mất khách vì chờ thì staffShiftFix hết cách sửa → không nhắc lại
    const act = morningShiftAction(staffDaySnapshot(), [{ ...st(1), shift: 'morning' as const }], undefined);
    expect(act).toBeNull();
  });

  it('không có dữ liệu đội hôm qua (snapshot rỗng) → null', () => {
    resetStaffDay();
    expect(morningShiftAction(staffDaySnapshot(), [st(1)], undefined)).toBeNull();
  });
});
