import { describe, expect, it } from 'vitest';
import { noteStaffTime, staffDaySnapshot, resetStaffDay } from '../core/slices/staffDay';
import { staffIdleStats, idleVerdict, IDLE_HEAVY_PCT, IDLE_BUSY_PCT } from '../data/staffIdle';
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
  it('rảnh phần lớn ca → idle_heavy; bận nhiều → busy; phụ trại bị loại khỏi bảng', () => {
    resetStaffDay();
    for (let i = 0; i < 6; i++) noteStaffTime(1, 60, true); // 6 phút rảnh
    noteStaffTime(1, 60, false); // 1 phút làm
    for (let i = 0; i < 5; i++) noteStaffTime(2, 60, false); // 5 phút làm
    noteStaffTime(2, 60, true); // 1 phút rảnh
    noteStaffTime(3, 120, true); // phụ trại: không được đưa vào bảng
    const sum = staffIdleStats(staffDaySnapshot(), [st(1), st(2, 'cashier'), st(3, 'farmhand')]);
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
