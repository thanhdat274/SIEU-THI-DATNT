import { describe, expect, it } from 'vitest';
import { budgetMorning, MORNING_CARD_CAP, type MorningCardEntry } from '../ui/panels/morningBudget';

/**
 * SPEC-TOI-UU §T6-L5 — Ngân sách Sổ đầu ngày: tối đa MORNING_CARD_CAP thẻ hiện thẳng,
 * thẻ thứ 7 trở đi gập "Xem thêm N mục", xếp theo mức gấp (prio nhỏ = gấp hơn) — không theo
 * thứ tự viết code. `budgetMorning` là hàm thuần nên test được; MorningPanel luôn đi qua nó.
 */

const card = (id: string, prio: number): MorningCardEntry => ({ id, prio, node: id });

describe('budgetMorning (T6-L5)', () => {
  it('hiện thẳng tối đa ' + MORNING_CARD_CAP + ' thẻ, còn lại gập "Xem thêm"', () => {
    // Bản lưu cuối game bật mọi hệ: nhiều thẻ cùng sáng hơn cả suất hiện thẳng.
    const many = Array.from({ length: MORNING_CARD_CAP + 8 }, (_, i) => card(`c${i}`, 50));
    const { visible, rest } = budgetMorning(many);
    expect(visible.length).toBe(MORNING_CARD_CAP);
    expect(rest.length).toBe(8);
    expect(visible.length + rest.length).toBe(many.length);
  });

  it('xếp theo mức gấp (prio nhỏ trước), không theo thứ tự khai báo', () => {
    const input = [card('a-muon', 90), card('b-gap', 10), card('c-dem', 40)];
    const { visible } = budgetMorning(input);
    // prio nhỏ = gấp hơn → "b-gap" đứng đầu dù khai báo ở giữa.
    expect(visible.map((c) => c.id)).toEqual(['b-gap', 'c-dem', 'a-muon']);
  });

  it('thỏa điều kiện cốt lõi: số thẻ hiện NỮA không quá ' + MORNING_CARD_CAP, () => {
    const many = Array.from({ length: 40 }, (_, i) => card(`c${i}`, i % 7));
    const { visible } = budgetMorning(many);
    expect(visible.length).toBeLessThanOrEqual(MORNING_CARD_CAP);
    expect(visible.length).toBeGreaterThan(0);
  });

  it('ổn định thứ tự khi cùng mức gấp (không lẫn lộn giữa các lần gọi)', () => {
    const a = budgetMorning([card('x', 5), card('y', 5)]).visible.map((c) => c.id);
    const b = budgetMorning([card('y', 5), card('x', 5)]).visible.map((c) => c.id);
    expect(a).toEqual(b);
  });
});
