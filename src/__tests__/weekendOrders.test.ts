import { describe, expect, it } from 'vitest';
import { offerForDay, PARTY_ORDERS } from '../data/orders';
import { isWeekend } from '../data/calendar';
import { REGULARS } from '../data/regulars';

// GĐ267 — đơn gắn cuối tuần ("Nhóm học cuối tuần" của Bé Na): chỉ mời khi NGÀY CHÓT rơi vào
// Thứ 7/CN, khớp chuyện kể + nhịp cuối tuần GĐ254+. offerForDay tất định theo seed nên quét
// được trọn bộ (seed × ngày) như một bảng chân trị.

/** Mọi khách quen đều đủ thân (friendship ≥ STORY_ORDER_FRIENDSHIP) để pool đơn riêng mở hết. */
const friendlyRegulars = () => {
  const m: Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> = {};
  for (const r of REGULARS) m[r.id] = { friendship: 100, visits: 10, lastVisitDay: 0, perks: [], discovered: [] };
  return m;
};

describe('đơn weekendOnly (GĐ267)', () => {
  it('chỉ "hoc_nhom" mang cờ weekendOnly; các đơn khác giữ hành vi cũ', () => {
    const flagged = PARTY_ORDERS.filter((o) => o.weekendOnly).map((o) => o.id);
    expect(flagged).toEqual(['hoc_nhom']);
  });

  it('quét 30 seed × 140 ngày: hoc_nhom được mời (≥1, tất định) và CHỈ với ngày chốt Thứ 7/CN', () => {
    let offers = 0;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        const offer = offerForDay(seed, day, 40, friendlyRegulars());
        if (offer?.id !== 'hoc_nhom') continue;
        offers++;
        expect(isWeekend(offer.dueDay)).toBe(true);
      }
    }
    // sweep tất định (seed cố định) → con số này không dao động giữa các lần chạy
    expect(offers).toBeGreaterThanOrEqual(1);
  });

  it('GĐ267 — roll chọn đơn không còn tương quan: MỌI đơn không-gate đều được mời ≥1 lần trong sweep', () => {
    // trước fix: tat_nien gấp ~6 lần kỳ vọng, 8 đơn câu chuyện = 0/8340 lượt (roll chọn
    // tương quan roll mời theo vị trí trong bảng)
    const counts: Record<string, number> = {};
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        const offer = offerForDay(seed, day, 40, friendlyRegulars());
        if (offer) counts[offer.id] = (counts[offer.id] || 0) + 1;
      }
    }
    const skipped = PARTY_ORDERS.filter((o) => !o.festival && !o.weekendOnly).map((o) => o.id);
    const never = skipped.filter((id) => !(counts[id] > 0));
    expect(never).toEqual([]);
  });

  it('các đơn KHÔNG weekendOnly vẫn mời được vào giữa tuần (hành vi cũ không hỏng)', () => {
    let weekdayOffers = 0;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        const offer = offerForDay(seed, day, 40, friendlyRegulars());
        if (offer && !isWeekend(offer.dueDay)) {
          const def = PARTY_ORDERS.find((o) => o.id === offer.id)!;
          expect(def.weekendOnly).toBeFalsy();
          weekdayOffers++;
        }
      }
    }
    expect(weekdayOffers).toBeGreaterThan(10);
  });
});
