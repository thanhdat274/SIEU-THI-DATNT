import { describe, expect, it } from 'vitest';
import { chairAtTable, freeSeat, linkedChairs, tableFreeSeats, SEAT_MARGIN } from '../data/dineIn';
import type { Furniture } from '../core/gameTypes';

const mk = (uid: number, type: string, x: number, z: number, extra: Partial<Furniture> = {}): Furniture =>
  ({ uid, type, x, z, rot: 0, tiers: [], ...extra } as unknown as Furniture);

describe('dineIn — quy tắc ghế kề bàn (GĐ1490)', () => {
  const table = (uid = 1, x = 0, z = 0, extra: Partial<Furniture> = {}) => mk(uid, 'dining_table', x, z, extra);
  const chair = (uid: number, x: number, z: number, extra: Partial<Furniture> = {}) => mk(uid, 'chair', x, z, extra);

  it('ghế đặt sát 4 phía quanh bàn đều kề bàn', () => {
    const t = table();
    // bàn 1.2×0.7 → mép 0.6/0.35; ghế sát mép + nửa ghế 0.25 (0.85/0.6 từ tâm bàn)
    expect(chairAtTable(chair(2, 0.85, 0), t)).toBe(true);   // bên phải
    expect(chairAtTable(chair(3, -0.85, 0), t)).toBe(true);  // bên trái
    expect(chairAtTable(chair(4, 0, 0.65), t)).toBe(true);   // phía trước
    expect(chairAtTable(chair(5, 0, -0.65), t)).toBe(true);  // phía sau
    expect(SEAT_MARGIN).toBeGreaterThan(0);
  });

  it('ghế cách bàn quá xa thì không tính', () => {
    const t = table();
    expect(chairAtTable(chair(2, 1.5, 0), t)).toBe(false);
    expect(chairAtTable(chair(3, 0, 1.3), t)).toBe(false);
    expect(chairAtTable(chair(4, 1.2, 1.0), t)).toBe(false);
  });

  it('chỗ trống = ghế kề chưa ai ngồi; chiếm hết ghế thì hết chỗ', () => {
    const t = table();
    const four = [t, chair(2, 0.85, 0), chair(3, -0.85, 0), chair(4, 0, 0.65), chair(5, 0, -0.65)];
    expect(linkedChairs(four, 1).length).toBe(4);
    // 4 ghế trống → 4 chỗ, cấp ghế đầu tiên
    expect(tableFreeSeats(four, 1)).toBe(4);
    expect(freeSeat(four, new Set())?.chairUid).toBe(2);
    // chiếm dần 4 ghế → hết chỗ
    expect(tableFreeSeats(four, 1, new Set([2]))).toBe(3);
    expect(tableFreeSeats(four, 1, new Set([2, 3, 4, 5]))).toBe(0);
    expect(freeSeat(four, new Set([2, 3, 4, 5]))).toBeNull();
  });

  it('ghế đang bị khách chiếm thì không cấp lại; bàn khác còn chỗ thì chuyển sang', () => {
    const furn = [table(1), chair(2, 0.85, 0), table(10, 3, 0), chair(11, 3.85, 0)];
    expect(freeSeat(furn, new Set([2]))?.chairUid).toBe(11);
    // cả hai ghế đều bận → hết chỗ
    expect(freeSeat(furn, new Set([2, 11]))).toBeNull();
  });

  it('bàn/ghế hỏng không nhận khách', () => {
    const furn = [table(1, 0, 0, { broken: true }), chair(2, 0.85, 0)];
    expect(freeSeat(furn, new Set())).toBeNull();
    const furn2 = [table(1), chair(2, 0.85, 0, { broken: true })];
    expect(freeSeat(furn2, new Set())).toBeNull();
  });

  it('chốt trên bởi seatSlots: kê 5 ghế quanh bàn vẫn chỉ 4 chỗ', () => {
    // 4 phía + 1 ghế lệch nửa mặt bàn trước vẫn tính là kề
    const five = [table(1), chair(2, 0.85, 0), chair(3, -0.85, 0), chair(4, 0, 0.65), chair(5, 0, -0.65), chair(6, 0.3, 0.65)];
    expect(linkedChairs(five, 1).length).toBe(5);
    expect(tableFreeSeats(five, 1)).toBe(4);
    // chiếm 4 ghế đầu → chỗ cuối (uid 6) vẫn được cấp
    const seat = freeSeat(five, new Set([2, 3, 4, 5]));
    expect(seat?.chairUid).toBe(6);
    expect(freeSeat(five, new Set([2, 3, 4, 5, 6]))).toBeNull();
  });

  it('ưu tiên bàn còn nhiều chỗ trống hơn (đông ghé cùng bàn)', () => {
    const furn = [
      table(1, 0, 0), chair(2, 0.85, 0), chair(3, -0.85, 0), // bàn 1: 3 ghế trống
      table(10, 3, 0), chair(11, 3.85, 0), // bàn 2: 1 ghế trống
    ];
    const seat = freeSeat(furn, new Set());
    expect(seat?.tableUid).toBe(1);
  });

  it('seatSlots đọc từ FurnitureDef (bàn ăn mặc định 4 chỗ), không từ instance', () => {
    // instance không mang seatSlots — helper phải đọc qua furnitureDef
    const furn = [table(1), chair(2, 0.85, 0)];
    // 1 ghế kề chưa ai ngồi → 1 chỗ; chốt trên 4 chỗ của def
    expect(tableFreeSeats(furn, 1)).toBe(1);
    expect(freeSeat(furn, new Set())?.chairUid).toBe(2);
  });
});
