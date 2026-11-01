/**
 * GĐ141: Bảng giá trị hôm nay của từng nhân viên ca ngày tiệm chính so với lương — helper thuần
 * đọc `stats.byHour` + `staff[]`, không đổi state/save/kinh tế. Đóng vòng quyết định nhân sự lặp
 * hằng ngày (thuê ai, xếp ca sáng/chiều/full) vốn chỉ hiện "lương + sao" mà không có con số ROI.
 */
import { test, expect } from 'vitest';
import { staffValueToday, staffShiftSummary, shiftRevenue, shiftHourWindow, onDutyCount } from '../data/staffValue';
import type { Staff, Shift } from '../data/staff';

const st = (id: number, role: 'cashier' | 'stocker' | 'cleaner', shift: Shift, wage = 20000, skill = 1): Staff =>
  ({ id, name: `N${id}`, role, skill, wage, shift } as Staff);

test('shiftHourWindow: ca ngày có cửa sổ giờ, ca đêm trả null', () => {
  expect(shiftHourWindow('morning')).toEqual({ start: 6, end: 14 });
  expect(shiftHourWindow('afternoon')).toEqual({ start: 14, end: 22 });
  expect(shiftHourWindow('full')).toEqual({ start: 6, end: 22 });
  expect(shiftHourWindow('night')).toBeNull();
});

test('shiftRevenue: cộng đúng doanh thu + khách trong cửa sổ giờ ca', () => {
  const byHour = { 7: { customers: 3, revenue: 15000 }, 8: { customers: 2, revenue: 9000 }, 15: { customers: 5, revenue: 30000 } };
  const r = shiftRevenue(byHour, 'morning');
  expect(r).toEqual({ revenue: 24000, customers: 5, window: { start: 6, end: 14 } });
  expect(shiftRevenue(byHour, 'afternoon').revenue).toBe(30000);
  expect(shiftRevenue(byHour, 'night').window).toBeNull();
});

test('onDutyCount: đếm số người đang trực trong một giờ theo cửa sổ ca', () => {
  const staff = [st(1, 'cashier', 'morning'), st(2, 'stocker', 'morning'), st(3, 'cleaner', 'afternoon'), st(4, 'stocker', 'night')];
  expect(onDutyCount(staff, 9)).toBe(2); // 2 người ca sáng
  expect(onDutyCount(staff, 15)).toBe(1); // 1 người ca chiều
  expect(onDutyCount(staff, 20)).toBe(1);
  expect(onDutyCount(staff, 8)).toBe(2);
});

test('staffValueToday: ca đêm bị loại khỏi bảng (đã có nightReport), ca ngày có net + verdict', () => {
  const staff = [st(1, 'cashier', 'morning', 20000), st(2, 'stocker', 'night', 20000)];
  const byHour = { 8: { customers: 2, revenue: 30000 } };
  const vals = staffValueToday(byHour, staff);
  expect(vals).toHaveLength(2);
  const morning = vals.find((v) => v.id === 1)!;
  expect(morning.verdict).toBe('ok'); // 30000/1 người > lương 20000
  expect(morning.value).toBe(30000);
  expect(morning.net).toBe(10000);
  expect(vals.find((v) => v.id === 2)!.verdict).toBe('nodata');
});

test('staffValueToday: chia đều doanh thu giờ cho số người cùng ca (full hưởng cả ngày)', () => {
  // 2 ca sáng + 1 ca đêm; giờ 8 có 30000 → chia đôi, mỗi ca sáng được 15000
  const staff = [st(1, 'cashier', 'morning', 20000), st(2, 'stocker', 'morning', 20000)];
  const vals = staffValueToday({ 8: { customers: 2, revenue: 30000 } }, staff);
  const a = vals.find((v) => v.id === 1)!;
  const b = vals.find((v) => v.id === 2)!;
  expect(a.value).toBe(15000);
  expect(b.value).toBe(15000);
  expect(a.net).toBe(-5000);
  expect(a.verdict).toBe('warn'); // 15000/20000 = 0.75 → vừa đủ
});

test('staffValueToday: full-shift nhân 2 ca — giá trị cộng gộp qua cả cửa sổ, lương pay 1.6', () => {
  // Lương full = 20000*1.6 = 32000; doanh thu sáng 15000 + chiều 15000 (một mình trực) = 30000 → lỗ nhẹ
  const staff = [st(1, 'cashier', 'full', 20000)];
  const vals = staffValueToday({ 8: { customers: 1, revenue: 15000 }, 16: { customers: 1, revenue: 15000 } }, staff);
  const a = vals.find((v) => v.id === 1)!;
  expect(a.value).toBe(30000);
  expect(a.wage).toBe(32000);
  expect(a.net).toBe(-2000);
  expect(a.verdict).toBe('warn');
});

test('staffValueToday: chưa có dữ liệu (byHour rỗng/undefined) → nodata, không crash', () => {
  const staff = [st(1, 'cashier', 'morning', 20000)];
  expect(staffValueToday(undefined, staff)[0].verdict).toBe('nodata');
  expect(staffValueToday({}, staff)[0].verdict).toBe('nodata');
  expect(staffValueToday({}, [])).toEqual([]);
});

test('staffValueToday: lượt giờ không có ai trực không crash (onDuty 0 → bỏ qua)', () => {
  const staff = [st(1, 'cashier', 'morning', 20000)];
  const vals = staffValueToday({ 8: { customers: 2, revenue: 30000 }, 12: { customers: 1, revenue: 9000 } }, staff);
  expect(vals[0].value).toBe(39000); // 30000 + 9000, đều 1 người trực
});

test('staffShiftSummary: gộp doanh thu + lương + net theo từng ca ngày', () => {
  const staff = [st(1, 'cashier', 'morning', 20000), st(2, 'stocker', 'afternoon', 20000), st(3, 'cleaner', 'night', 20000)];
  const byHour = { 8: { customers: 2, revenue: 30000 }, 16: { customers: 1, revenue: 5000 } };
  const s = staffShiftSummary(byHour, staff);
  expect(s.morning).toEqual({ revenue: 30000, wages: 20000, net: 10000, count: 1 });
  expect(s.afternoon).toEqual({ revenue: 5000, wages: 20000, net: -15000, count: 1 });
  // full mặc dù chưa ai xếp ca (count 0): doanh thu cả ngày [6,22) vẫn được tổng — UI chỉ hiện khi count>0
  expect(s.full.count).toBe(0);
  expect(s.full.revenue).toBe(35000);
});

test('staffShiftSummary: không có byHour → doanh thu 0, vẫn đếm lương đội ca', () => {
  const staff = [st(1, 'cashier', 'full', 20000)];
  const s = staffShiftSummary(undefined, staff);
  expect(s.full.revenue).toBe(0);
  expect(s.full.wages).toBe(32000);
  expect(s.full.net).toBe(-32000);
  expect(s.full.count).toBe(1);
});
