import { beforeAll, describe, expect, it } from 'vitest';
import { useGame } from '../core/store'; // nạp store trước để tránh vòng import khi đọc orders.ts
import { SHIFTS, type Staff } from '../data/staff';
import { workSpeed } from '../data/staffTraits';
import type { cookSpeed as CookSpeedFn } from '../core/slices/orders';

let cookSpeed: typeof CookSpeedFn;
beforeAll(async () => {
  cookSpeed = (await import('../core/slices/orders')).cookSpeed;
  void useGame; // giữ store đã nạp để đứa con hoàn tất trước khi đọc hàm
});

/**
 * Bộ test GĐ1032 — `core/slices/orders.cookSpeed` (nhánh dòng 28–29 TRƯỚC ĐÂY 0% vì chưa từng
 * có đầu bếp TRỰC CA trong test): mẻ nấu nhanh hơn bấy nhiêu theo đầu bếp tay nghề cao nhất
 * đang trong giờ ca (1★ như chủ tự nấu → best giữ 1).
 *
 * Hợp đồng (đối chiếu data/staff.SHIFTS + staffTraits.workSpeed):
 * - Không có đầu bếp (không ai / chỉ vai khác) → 1.
 * - Đầu bếp đang TRỰC CA (minutes trong khoảng ca) → workSpeed(st).
 * - Đầu bếp NGOÀI CA → không cộng, giữ 1.
 * - Nhiều đầu bếp trực ca → lấy tay nghề CAO NHẤT.
 */

const IN_MORNING = (SHIFTS.morning.from + SHIFTS.morning.to) / 2; // 600 = 10h sáng
const AFTER_MORNING = SHIFTS.morning.to + 60; // 15h, ngoài ca sáng

const cook = (skill: number, shift: Staff['shift'] = 'morning', rank?: Staff['rank']): Staff => ({
  id: 1, name: 'Bếp', role: 'cook', skill, wage: 0, shift, rank,
});
const cashier = (shift: Staff['shift'] = 'morning'): Staff => ({
  id: 2, name: 'Thu ngân', role: 'cashier', skill: 3, wage: 0, shift,
});

const at = (staff: Staff[], minutes: number) => cookSpeed(() => ({ staff, minutes } as never));

describe('cookSpeed — đầu bếp trực ca làm nhanh mẻ nấu', () => {
  it('không có ai → 1 (như chủ tự nấu)', () => {
    expect(at([], IN_MORNING)).toBe(1);
  });

  it('chỉ có thu ngân trực ca → vẫn 1 (lọc theo vai cook)', () => {
    expect(at([cashier()], IN_MORNING)).toBe(1);
  });

  it('đầu bếp TRỰC CA → workSpeed của anh ta', () => {
    const st = cook(4);
    expect(at([st], IN_MORNING)).toBe(workSpeed(st));
    expect(workSpeed(st)).toBeGreaterThan(1);
  });

  it('đầu bếp NGOÀI CA → không cộng, giữ 1', () => {
    expect(at([cook(4)], AFTER_MORNING)).toBe(1);
  });

  it('nhiều đầu bếp trực ca → lấy tay nghề CAO NHẤT', () => {
    const low = cook(2);
    const high = cook(5, 'morning', 'lead');
    expect(at([low, high], IN_MORNING)).toBe(workSpeed(high));
    expect(workSpeed(high)).toBeGreaterThan(workSpeed(low));
  });

  it('ca đêm (khuya, minutes 24h–30h) vẫn tính cho đầu bếp ca đêm', () => {
    const st = cook(3, 'night');
    const lateMidnight = (SHIFTS.night.from + SHIFTS.night.to) / 2; // ~1560
    expect(at([st], lateMidnight)).toBe(workSpeed(st));
  });
});
