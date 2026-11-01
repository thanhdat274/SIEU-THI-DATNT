/**
 * GĐ144: Bảng giá trị hôm nay của TỪNG nhân viên CA ĐÊM TIỆM CHÍNH so với lương — helper thuần đọc
 * `stats.byHour` (sổ theo giờ KÉO DÀI, giờ đêm ≥22) + `staff[]` ca đêm, không đổi state/save/kinh tế.
 * Nối tiếp GĐ141 (staffValue.ts ca NGÀY tiệm chính) + GĐ142 (branchStaffValue.ts chi nhánh): đóng góc
 * "nhân sự lạnh" cuối — ca đêm tiệm chính GĐ141 cố ý bỏ ("đã có nightPnl"), nay tách từng người để trả
 * lời "ca đêm ×1.5 ai kiếm lại được đồng lương, ai là gánh nặng".
 */
import { test, expect } from 'vitest';
import { nightStaffValueToday, onDutyNight, inNightWindow, NIGHT_START, NIGHT_END, nightWagePaying } from '../data/nightStaffValue';
import type { Staff, Shift } from '../data/staff';

const st = (id: number, role: 'cashier' | 'stocker' | 'courier' | 'guard' | 'manager', shift: Shift, wage = 20000, skill = 1): Staff =>
  ({ id, name: `N${id}`, role, skill, wage, shift } as Staff);

// byHour = sổ theo giờ KÉO DÀI tiệm chính (khóa = giờ ≥22 là đêm; khóa = giờ trong ngày kéo dài).
const byHour = (hours: Record<number, number>): Record<number, { revenue: number }> => {
  const o: Record<number, { revenue: number }> = {};
  for (const [h, v] of Object.entries(hours)) o[+h] = { revenue: v };
  return o;
};

test('inNightWindow / NIGHT_START..NIGHT_END: khung đêm tiệm chính là giờ kéo dài ≥22', () => {
  expect(NIGHT_START).toBe(22);
  expect(NIGHT_END).toBe(31); // phủ 22..30
  expect(inNightWindow(21)).toBe(false);
  expect(inNightWindow(22)).toBe(true);
  expect(inNightWindow(30)).toBe(true);
  expect(inNightWindow(31)).toBe(true); // ngoài khung lặp (dò dữ liệu bất ngờ)
});

test('onDutyNight: đếm đúng người ca đêm, 0 với giờ ngày, không tính ca ngày', () => {
  const staff = [st(1, 'cashier', 'night'), st(2, 'stocker', 'morning')];
  expect(onDutyNight(staff, 23)).toBe(1);   // chỉ người ca đêm
  expect(onDutyNight(staff, 22)).toBe(1);
  expect(onDutyNight(staff, 30)).toBe(1);   // giờ đêm cuối
  expect(onDutyNight(staff, 9)).toBe(0);    // giờ ngày không tính
});

test('nightStaffValueToday: một mình ca đêm — value = Σ doanh thu các giờ đêm, so lương ×1.5', () => {
  const staff = [st(1, 'cashier', 'night', 20000)]; // dailyWage ca đêm = 20000×1.5 = 30000
  const vals = nightStaffValueToday(byHour({ 22: 20000, 23: 10000 }), staff);
  expect(vals).toHaveLength(1);
  const a = vals[0];
  expect(a.value).toBe(30000);   // 20000(h22) + 10000(h23)
  expect(a.wage).toBe(30000);    // ×1.5
  expect(a.net).toBe(0);
  expect(a.verdict).toBe('ok');  // ratio 30000/30000 = 1
});

test('nightStaffValueToday: chia đều doanh thu giờ đêm cho số người cùng ca đêm', () => {
  const staff = [st(1, 'cashier', 'night', 20000), st(2, 'stocker', 'night', 20000)];
  const vals = nightStaffValueToday(byHour({ 23: 30000 }), staff);
  const a = vals.find((v) => v.id === 1)!;
  const b = vals.find((v) => v.id === 2)!;
  expect(a.value).toBe(15000); // 30000/2
  expect(b.value).toBe(15000);
  expect(a.verdict).toBe('warn');    // 15000/30000 = 0.5 → warn (biên ≥0.5, khớp GĐ141)
  expect(b.verdict).toBe('warn');
});

test('nightStaffValueToday: good_boss giảm lương thực trả ×0.9 (khớp nightWageOf)', () => {
  const staff = [st(1, 'cashier', 'night', 20000)]; // dailyWage 30000
  const vals = nightStaffValueToday(byHour({ 23: 60000 }), staff, ['good_boss']);
  const a = vals[0];
  expect(a.wage).toBe(27000);  // round(30000×0.9)
  expect(a.value).toBe(60000);
  expect(a.verdict).toBe('ok');
  // không good_boss → wage đầy đủ
  expect(nightStaffValueToday(byHour({ 23: 60000 }), staff)[0].wage).toBe(30000);
});

test('nightStaffValueToday: verdict phân cấp ok / warn / low theo ratio', () => {
  const staff = [st(1, 'cashier', 'night', 20000)]; // wage 30000
  expect(nightStaffValueToday(byHour({ 23: 40000 }), staff)[0].verdict).toBe('ok');   // 1.33
  expect(nightStaffValueToday(byHour({ 23: 20000 }), staff)[0].verdict).toBe('warn'); // 0.67
  expect(nightStaffValueToday(byHour({ 23: 10000 }), staff)[0].verdict).toBe('low');  // 0.33
});

test('nightStaffValueToday: chưa mở/bán đêm — byHour trống hoặc không có giờ đêm → nodata, không crash', () => {
  const staff = [st(1, 'cashier', 'night', 20000)];
  expect(nightStaffValueToday(undefined, staff)[0].verdict).toBe('nodata');
  expect(nightStaffValueToday(byHour({}), staff)[0].verdict).toBe('nodata');
  expect(nightStaffValueToday(byHour({ 9: 1000 }), staff)[0].verdict).toBe('nodata'); // chỉ giờ ngày
  expect(nightStaffValueToday(byHour({ 23: 5000 }), [])).toEqual([]);                // không ai ca đêm
});

test('nightStaffValueToday: giờ đêm khép giờ 28/29/30 (đêm khuya gần sáng) vẫn cộng vào value', () => {
  const staff = [st(1, 'cashier', 'night', 20000)];
  const vals = nightStaffValueToday(byHour({ 28: 15000, 30: 5000 }), staff);
  expect(vals[0].value).toBe(20000);
});

test('nightStaffValueToday: chỉ trả về người ca đêm (không trộn ca ngày)', () => {
  const staff = [st(1, 'cashier', 'night', 20000), st(2, 'stocker', 'morning', 20000)];
  const vals = nightStaffValueToday(byHour({ 23: 30000 }), staff);
  expect(vals.map((v) => v.id)).toEqual([1]); // chỉ id ca đêm
});

test('nightWagePaying: lương thực trả ca đêm (dailyWage ×1.5, có/không good_boss)', () => {
  const n = st(1, 'cashier', 'night', 20000);
  expect(nightWagePaying(n, undefined)).toBe(30000);       // 20000×1.5
  expect(nightWagePaying(n, ['good_boss'])).toBe(27000);   // ×0.9
  expect(nightWagePaying(n, [])).toBe(30000);
});
