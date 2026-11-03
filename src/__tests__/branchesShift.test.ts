import { describe, expect, it } from 'vitest';
import { onShift, uncoveredHours } from '../data/branches';
import { SHIFTS, type Staff } from '../data/staff';

/** Nhân viên mẫu chi nhánh. */
function staff(role: Staff['role'], shift: Staff['shift'], id = 1): Staff {
  return { id, name: 'X', role, skill: 3, wage: 100_000, shift };
}

describe('onShift — ca chi nhánh 24/7 nối qua nửa đêm', () => {
  // Ca ngày không vượt nửa đêm: morning 6h–14h, afternoon 14h–22h30
  it('ca sáng (morning): ranh giới đúng giờ [6h, 14h)', () => {
    const st = staff('cashier', 'morning');
    expect(onShift(st, SHIFTS.morning.from)).toBe(true);      // đúng 6h00 đã trực
    expect(onShift(st, SHIFTS.morning.to - 1)).toBe(true);     // 13h59 vẫn trực
    expect(onShift(st, SHIFTS.morning.to)).toBe(false);        // 14h00 hết ca
    expect(onShift(st, SHIFTS.morning.from - 1)).toBe(false);  // 5h59 chưa vào ca
    expect(onShift(st, 10 * 60)).toBe(true);                   // giữa ca sáng
  });

  it('ca chiều (afternoon): ranh giới đúng giờ [14h, 22h30)', () => {
    const st = staff('cashier', 'afternoon');
    expect(onShift(st, SHIFTS.afternoon.from)).toBe(true);       // 14h00
    expect(onShift(st, SHIFTS.afternoon.to - 1)).toBe(true);     // 22h29
    expect(onShift(st, SHIFTS.afternoon.to)).toBe(false);        // 22h30 hết
    expect(onShift(st, SHIFTS.afternoon.from - 1)).toBe(false);  // 13h59
  });

  // Ca đêm 22h–30h (tức 22h hôm nay → 6h hôm sau) VƯỢT nửa đêm — phần phức tạp
  it('ca đêm (night): vượt nửa đêm — trực cả tối lẫn rạng sáng', () => {
    const st = staff('cashier', 'night');
    // Trước nửa đêm (cùng "ngày"): 22h–23h59
    expect(onShift(st, 22 * 60)).toBe(true);        // 22h00
    expect(onShift(st, 23 * 60 + 59)).toBe(true);   // 23h59
    // Sau nửa đêm (phút < 1440 nhưng thuộc ca đêm): 0h–5h59
    expect(onShift(st, 0)).toBe(true);              // 0h00
    expect(onShift(st, 1 * 60)).toBe(true);         // 1h00
    expect(onShift(st, 5 * 60 + 59)).toBe(true);    // 5h59
    expect(onShift(st, SHIFTS.night.to - 1440 - 1)).toBe(true); // 5h59 (tính từ to=30h)
    // Ranh giới kết thúc: 6h00 = 30h trong thang 24–36
    expect(onShift(st, SHIFTS.night.to - 1440)).toBe(false); // 6h00 hết ca đêm
    expect(onShift(st, 6 * 60)).toBe(false);
    // Giữa buổi chiều không thuộc ca đêm
    expect(onShift(st, 15 * 60)).toBe(false);
  });

  it('onShift chấp nhận phút ngoài 0–1439 (đồng hồ nối dài)', () => {
    const st = staff('cashier', 'night');
    // Phút 2000 = 2000%1440=560 = 9h20 → không phải ca đêm
    expect(onShift(st, 2000)).toBe(false);
    expect(onShift(st, 1700)).toBe(true); // 1700%1440=260=4h20 → ca đêm
  });
});

describe('uncoveredHours — giờ trong ngày chưa có thu ngân trực', () => {
  it('không có ai thì 24 giờ đều thiếu thu ngân', () => {
    expect(uncoveredHours([])).toHaveLength(24);
    expect(uncoveredHours([])).toEqual(Array.from({ length: 24 }, (_, h) => h));
  });

  it('thu ngân ca nhà (morning 6h–14h) che kín đúng 8 giờ', () => {
    const uncovered = uncoveredHours([staff('cashier', 'morning')]);
    // Có thu ngân sáng lúc 6h–13h (mốc h*60+30 nằm trong ca)
    for (let h = 6; h <= 13; h++) expect(uncovered).not.toContain(h);
    for (const h of [0, 5, 14, 23]) expect(uncovered).toContain(h);
  });

  it('thu ngân ca đêm che 22h–23h và 0h–5h (vượt nửa đêm)', () => {
    const uncovered = uncoveredHours([staff('cashier', 'night')]);
    for (const h of [0, 1, 4, 5, 22, 23]) expect(uncovered).not.toContain(h);
    for (const h of [6, 12, 21]) expect(uncovered).toContain(h);
  });

  it('thu ngân + nhân viên vai khác: chỉ vai thu ngân mới che', () => {
    const crew = [staff('cashier', 'night'), staff('guard', 'night', 2), staff('stocker', 'morning', 3)];
    const uncovered = uncoveredHours(crew);
    // Night cashier che 0-5, 22-23; guard/stocker không phải cashier nên không che thêm
    for (const h of [0, 5, 22]) expect(uncovered).not.toContain(h);
    for (const h of [12, 15]) expect(uncovered).toContain(h);
  });
});
