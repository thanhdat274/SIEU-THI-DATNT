import { describe, it, expect } from 'vitest';
import { segmentHurt, recentLostByProduct } from '../data/segmentHurt';
import type { AnalyticsState } from '../data/analytics';
import type { Review } from '../data/reviews';

/**
 * GĐ1276 — "phân khúc khách nào đang bị hụt?": quy lượt lỡ bán món trong 7 ngày gần (analytics lost)
 * + lời chê (reviews) về đúng MÓN ƯA của từng nghề → cho chủ biết nhóm khách nào cần nuôi.
 * Helper THUẦN ĐỌC — không import store (co-op an toàn), không đổi kinh tế/save/seed.
 */
describe('GĐ1276 — segmentHurt (phân khúc nào đang bị hụt món ưa)', () => {
  it('quy lượt lỡ bán món ưa (lost) về đúng phân khúc của nghề ưa món đó', () => {
    // 'mi' + 'nuoc' là món ưa của 👷 Công nhân xây dựng (unlock 1, không mùa)
    const hurt = segmentHurt({ level: 10, day: 10, lostByProduct: { mi: 5, nuoc: 3 } });
    const c = hurt.find((h) => h.profession.id === 'construction');
    expect(c).toBeDefined();
    expect(c!.lost).toBe(8);
    expect(c!.hurtScore).toBe(8);
    expect(c!.affectedLikes).toContain('mi');
  });

  it('không quy món lạ (ngoài likes mọi nghề) về bất kỳ phân khúc nào', () => {
    const hurt = segmentHurt({ level: 30, day: 10, lostByProduct: { gia_mong_co: 9 } });
    expect(hurt).toEqual([]);
  });

  it('lời chê nhắc món ưa của nghề được tính vào complaints theo lý do', () => {
    const reviews: Review[] = [
      { id: 1, day: 10, minute: 600, stars: 2, author: 'Cô Hoa', text: 't', reason: 'price', productId: 'mi' },
      { id: 2, day: 10, minute: 700, stars: 1, author: 'Chú Ba', text: 't', reason: 'stock', productId: 'nuoc' },
    ];
    const hurt = segmentHurt({ level: 10, day: 10, reviews });
    const c = hurt.find((h) => h.profession.id === 'construction');
    expect(c).toBeDefined();
    expect(c!.complaints).toContainEqual({ reason: 'price', count: 1 });
    expect(c!.complaints).toContainEqual({ reason: 'stock', count: 1 });
    expect(c!.hurtScore).toBe(2);
  });

  it('không ồn: không phân khúc nào bị hụt → danh sách rỗng', () => {
    expect(segmentHurt({ level: 10, day: 10 })).toEqual([]);
    expect(segmentHurt({ level: 10, day: 10, lostByProduct: {} })).toEqual([]);
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (không RNG/state)', () => {
    const a = segmentHurt({ level: 10, day: 10, lostByProduct: { mi: 2 } });
    const b = segmentHurt({ level: 10, day: 10, lostByProduct: { mi: 2 } });
    expect(a).toEqual(b);
  });

  it('món chưa mở khóa ở cấp thấp không được tính (món ưa lọc unlock)', () => {
    // 'banhmi' unlock 38 — ngoài likes mở khóa ở level 10; cấp 1 thì hầu hết chưa mở
    const low = segmentHurt({ level: 1, day: 10, lostByProduct: { mi: 4, banhmi: 7 } });
    // ở cấp 1, 'mi' (unlock 1) vẫn mở → công nhân vẫn bị hụt mi, nhưng không ai hụt banhmi
    expect(low.find((h) => h.profession.id === 'construction')!.lost).toBe(4);
    expect(low.find((h) => h.affectedLikes.includes('banhmi'))).toBeUndefined();
  });

  it('recentLostByProduct gộp lost theo món trong cửa sổ ngày gần, bỏ bản cũ/quá hạn', () => {
    const analytics: AnalyticsState = {
      items: {
        mi: [
          { day: 4, qty: 0, revenue: 0, cost: 0, spoiled: 0, lost: 9 }, // ngoài cửa sổ 7 ngày (floor 3) → giữ 9? ngày 4 > 3 → tính
          { day: 8, qty: 0, revenue: 0, cost: 0, spoiled: 0, lost: 2 },
        ],
        nuoc: [{ day: 11, qty: 0, revenue: 0, cost: 0, spoiled: 0, lost: 1 }],
      },
      flags: {},
    };
    // day = 10, cửa sổ 7 → floor = 3: chỉ tính ngày > 3
    const got = recentLostByProduct(analytics, 10, 7);
    expect(got.mi).toBe(11); // 9 (day 4) + 2 (day 8)
    expect(got.nuoc).toBe(1);
  });

  it('recentLostByProduct không tạo dòng cho món chỉ có lost = 0', () => {
    const analytics: AnalyticsState = {
      items: { mi: [{ day: 8, qty: 1, revenue: 1, cost: 1, spoiled: 0, lost: 0 }] },
      flags: {},
    };
    expect(recentLostByProduct(analytics, 10)).toEqual({});
    expect(recentLostByProduct(undefined, 10)).toEqual({});
  });
});
