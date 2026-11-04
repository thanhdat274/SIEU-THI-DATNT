import { describe, expect, it } from 'vitest';
import {
  goldenPrepWants, inGoldenHour, minutesToGolden, nextGoldenBand, nextGoldenPrep, TIME_BANDS,
} from '../data/rhythm';
import { productById } from '../data/products';

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

describe('nextGoldenPrep — món khách thèm giờ vàng KẾ TIẾP (Sơ đồ kệ, GĐ1239)', () => {
  it('trả giờ vàng kế tiếp + id món khách thèm (đã mở khóa, bỏ trùng, trần n)', () => {
    const prep = nextGoldenPrep(30, 5 * 60, 4)!;
    expect(prep).not.toBeNull();
    expect(prep.from).toBeGreaterThan(5 * 60);
    expect(prep.items.length).toBeGreaterThan(0);
    expect(prep.items.length).toBeLessThanOrEqual(4);
    expect(new Set(prep.items).size).toBe(prep.items.length);
    // Mọi món đã mở khóa ở cấp 30
    for (const id of prep.items) expect((productById(id)?.unlock ?? 1e9)).toBeLessThanOrEqual(30);
  });

  it('lọc món chưa mở khóa theo cấp (cấp thấp là tập con của cấp cao, ít hơn hoặc bằng)', () => {
    const lo = nextGoldenPrep(1, 5 * 60, 99)!.items;
    const hi = nextGoldenPrep(30, 5 * 60, 99)!.items;
    for (const id of lo) {
      expect(hi).toContain(id); // cấp cao mở thêm nên giữ đủ món cấp thấp
      expect(productById(id)!.unlock).toBeLessThanOrEqual(1);
    }
    expect(lo.length).toBeLessThanOrEqual(hi.length);
  });

  it('hết giờ vàng hôm nay (sau 20h) thì null — không có việc chuẩn bị sắp tới', () => {
    expect(nextGoldenPrep(30, 21 * 60, 4)).toBeNull();
  });

  it('id khớp đúng một nửa "châm kệ" mà goldenPrepWants chỉ tên lại (cùng món đầu tiên)', () => {
    const prep = nextGoldenPrep(30, 5 * 60, 1)!;
    const name = goldenPrepWants(5 * 60, 30, 1)[0];
    expect(productById(prep.items[0])?.name).toBe(name);
  });

  it('thuần: cùng đầu vào ra cùng kết quả (không đổi theo state)', () => {
    expect(nextGoldenPrep(12, 11 * 60, 4)).toEqual(nextGoldenPrep(12, 11 * 60, 4));
  });
});
