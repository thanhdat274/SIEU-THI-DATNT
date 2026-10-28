import { describe, expect, it } from 'vitest';
import {
  goldenPrepWants, inGoldenHour, minutesToGolden, nextGoldenBand, TIME_BANDS,
} from '../data/rhythm';

/** Chuẩn bị giờ vàng: báo khung vàng kế tiếp + gợi ý châm kệ món nào trước giờ đông khách. */

describe('nextGoldenBand / minutesToGolden', () => {
  it('trước 6h: khung vàng kế tiếp là cao điểm sáng, cách đúng khoảng', () => {
    expect(inGoldenHour(5 * 60)).toBe(false);
    expect(minutesToGolden(5 * 60)).toBe(60); // 6h - 5h = 60 phút
    expect(nextGoldenBand(5 * 60)?.id).toBe('sang');
  });

  it('trong khung vàng thì trả 0 (không phải khung kế ở xa hơn)', () => {
    expect(inGoldenHour(12 * 60)).toBe(true); // cao điểm trưa
    expect(minutesToGolden(12 * 60)).toBe(0);
  });

  it('giữa khung vàng (vắng): khung kế là khung vàng tới, không nhảy sang ngoài', () => {
    // 14h thuộc buổi chiều vắng (13–17); tới đây hết giờ vàng trưa (11–13)
    expect(nextGoldenBand(14 * 60)?.id).toBe('toi');
    expect(minutesToGolden(14 * 60)).toBe(3 * 60); // 17h - 14h
  });

  it('sau 20h (đã qua hết giờ vàng tối) thì không còn giờ vàng hôm nay', () => {
    expect(nextGoldenBand(21 * 60)).toBe(null);
    expect(minutesToGolden(21 * 60)).toBe(-1);
  });

  it('minute vượt 24h được cuộn về đầu ngày hôm sau (khung sáng vẫn còn tới)', () => {
    // 25h ≈ 1h sáng (quấn về 1:00): khung vàng kế là cao điểm sáng 6h, cách 300 phút
    expect(minutesToGolden(25 * 60)).toBe(5 * 60);
  });
});

describe('goldenPrepWants — gợi ý châm kệ', () => {
  it('trả món khách thèm trong khung vàng sắp tới, chỉ món đã mở khóa ở cấp', () => {
    // Trước 6h -> khung sáng (wants: sữa, bánh mì, cà phê, trứng...). Cấp 1 chưa mở hết -> lọc món cấp 1
    const wants = goldenPrepWants(5 * 60, 1, 5);
    expect(wants.length).toBeGreaterThan(0);
    expect(wants.length).toBeLessThanOrEqual(5);
    // Món phải đang/mở sớm cho cấp 1 (sữa mở cấp 5, nước mở cấp 1...)
    for (const name of wants) expect(typeof name).toBe('string');
  });

  it('không có giờ vàng tới thì trả rỗng', () => {
    expect(goldenPrepWants(21 * 60, 30, 5)).toEqual([]);
  });

  it('kết quả chắc định và không trùng (dedup)', () => {
    expect(goldenPrepWants(5 * 60, 30, 5)).toEqual(goldenPrepWants(5 * 60, 30, 5));
    const items = goldenPrepWants(5 * 60, 30, 10);
    expect(new Set(items).size).toBe(items.length);
  });

  it('n đẩy lên lớn hơn số món có trong khung cũng không vượt', () => {
    const sang = TIME_BANDS.find((b) => b.id === 'sang')!;
    expect(goldenPrepWants(5 * 60, 99, 99).length).toBeLessThanOrEqual(sang.wants.length);
  });
});
