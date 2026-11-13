import { describe, expect, it } from 'vitest';
import { courierAbsentLine, type TripState } from '../data/trip';

const trip = { by: 7, returnAt: 15 * 60 + 5, departAt: 600 } as unknown as TripState;
describe('courierAbsentLine (Hệ 5 L8)', () => {
  it('người giao đang đi tỉnh → nêu giờ về', () => {
    const t = courierAbsentLine(trip, [7], 14 * 60);
    expect(t).toContain('15h05');
    expect(t).toContain('65 phút');
    expect(t.length).toBeLessThanOrEqual(90);
  });
  it('không có chuyến / người khác đi → câu chung', () => {
    expect(courierAbsentLine(undefined, [7], 0)).toContain('Không còn nhân viên giao hàng rảnh');
    expect(courierAbsentLine(trip, [3], 0)).toContain('Không còn');
  });
});
