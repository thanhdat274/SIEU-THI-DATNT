/**
 * GĐ142: Bảng giá trị hôm nay của từng nhân viên CHI NHÁNH (tiện lợi 24/7) so với lương — helper thuần
 * đọc `branch.hourly` (mảng revenue-từng-giờ-trong-ngày 0..23) + `branch.staff[]`, không đổi state/save/kinh tế.
 * Nối tiếp GĐ141 (staffValue.ts tiệm chính) sang chi nhánh: đóng vòng quyết định nhân sự lặp của tiện lợi
 * (xếp ca sáng/chiều/đêm ×1.5, điều quân giữa hai tiệm) vốn chỉ hiện lương + mệt mà không có con số ROI.
 */
import { test, expect } from 'vitest';
import { branchStaffValueToday, branchShiftSummary, branchShiftHours, onDutyBranch } from '../data/branchStaffValue';
import type { Staff, Shift } from '../data/staff';

const st = (id: number, role: 'cashier' | 'stocker' | 'courier' | 'guard' | 'manager', shift: Shift, wage = 20000, skill = 1): Staff =>
  ({ id, name: `N${id}`, role, skill, wage, shift } as Staff);

// hourly = mảng 24 phần tử revenue-từng-giờ; mặc định toàn 0.
const hourly = (hours: Record<number, number>): number[] => {
  const a = Array(24).fill(0) as number[];
  for (const [h, v] of Object.entries(hours)) a[+h] = v;
  return a;
};

test('branchShiftHours: ca chi nhánh phủ đúng giờ-trong-ngày, đêm vắt qua nửa đêm', () => {
  expect(branchShiftHours('morning')).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
  expect(branchShiftHours('afternoon')).toEqual([14, 15, 16, 17, 18, 19, 20, 21, 22]);
  expect(branchShiftHours('night')).toEqual([22, 23, 0, 1, 2, 3, 4, 5]);
  expect(branchShiftHours('full')).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
});

test('onDutyBranch: đếm người trực một giờ theo ca chi nhánh', () => {
  const staff = [st(1, 'cashier', 'morning'), st(2, 'stocker', 'morning'), st(3, 'guard', 'night')];
  expect(onDutyBranch(staff, 9)).toBe(2);   // ca sáng
  expect(onDutyBranch(staff, 15)).toBe(0);  // không ai ca chiều
  expect(onDutyBranch(staff, 23)).toBe(1);  // ca đêm
  expect(onDutyBranch(staff, 2)).toBe(1);   // ca đêm vắt sáng
});

test('branchStaffValueToday: ca sáng một mình bán — value = doanh thu ca, so lương', () => {
  const staff = [st(1, 'cashier', 'morning', 20000)];
  const vals = branchStaffValueToday(staff, hourly({ 8: 30000, 9: 5000 }));
  const a = vals.find((v) => v.id === 1)!;
  expect(a.value).toBe(35000);
  expect(a.wage).toBe(20000);
  expect(a.net).toBe(15000);
  expect(a.verdict).toBe('ok'); // 35000/20000 > 1
});

test('branchStaffValueToday: chia đều doanh thu giờ cho số người cùng ca', () => {
  const staff = [st(1, 'cashier', 'morning', 20000), st(2, 'stocker', 'morning', 20000)];
  const vals = branchStaffValueToday(staff, hourly({ 8: 30000 }));
  const a = vals.find((v) => v.id === 1)!;
  const b = vals.find((v) => v.id === 2)!;
  expect(a.value).toBe(15000); // 30000/2
  expect(b.value).toBe(15000);
  expect(a.verdict).toBe('warn'); // 15000/20000 = 0.75
});

test('branchStaffValueToday: ca đêm nhân lương pay 1.5 và phủ giờ vắt nửa đêm', () => {
  const staff = [st(1, 'cashier', 'night', 20000)];
  const vals = branchStaffValueToday(staff, hourly({ 23: 20000, 1: 10000 }));
  const a = vals.find((v) => v.id === 1)!;
  expect(a.value).toBe(30000);      // 20000(h23) + 10000(h1)
  expect(a.wage).toBe(30000);       // 20000 × 1.5
  expect(a.net).toBe(0);
  expect(a.verdict).toBe('ok');   // ratio 30000/30000 = 1.0 → ok
});

test('branchStaffValueToday: chưa có dữ liệu (hourly undefined / toàn 0) → nodata, không crash', () => {
  const staff = [st(1, 'cashier', 'morning', 20000)];
  expect(branchStaffValueToday(staff, undefined)[0].verdict).toBe('nodata');
  expect(branchStaffValueToday(staff, hourly({}))[0].verdict).toBe('nodata');
  expect(branchStaffValueToday([], hourly({ 8: 1000 }))).toEqual([]);
});

test('branchStaffValueToday: giờ không ai trực (onDuty 0) bỏ qua, không crash', () => {
  const staff = [st(1, 'cashier', 'morning', 20000)];
  const vals = branchStaffValueToday(staff, hourly({ 8: 30000, 20: 9000 })); // giờ 20 không ai ca sáng trực
  expect(vals[0].value).toBe(30000);
});

test('branchShiftSummary: gộp doanh thu + lương + net theo từng ca chi nhánh (đêm ×1.5)', () => {
  const staff = [st(1, 'cashier', 'morning', 20000), st(2, 'stocker', 'night', 20000)];
  const s = branchShiftSummary(hourly({ 8: 30000, 23: 10000, 2: 5000 }), staff);
  expect(s.morning).toEqual({ revenue: 30000, wages: 20000, net: 10000, count: 1 });
  expect(s.afternoon).toEqual({ revenue: 0, wages: 0, net: 0, count: 0 });
  expect(s.night.revenue).toBe(15000);   // 10000 + 5000
  expect(s.night.wages).toBe(30000);     // 20000 × 1.5
  expect(s.night.net).toBe(-15000);
  expect(s.night.count).toBe(1);
});

test('branchShiftSummary: không có hourly → doanh thu 0, vẫn đếm lương đội ca', () => {
  const staff = [st(1, 'cashier', 'night', 20000)];
  const s = branchShiftSummary(undefined, staff);
  expect(s.night.revenue).toBe(0);
  expect(s.night.wages).toBe(30000);
  expect(s.night.net).toBe(-30000);
  expect(s.night.count).toBe(1);
});
