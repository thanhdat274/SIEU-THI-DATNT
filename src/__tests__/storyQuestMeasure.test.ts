import { describe, expect, it } from 'vitest';
import { emptyQuestLog, emptyTotals, storyQuest, STORY_STEPS, type QuestContext } from '../data/quests';

/**
 * Phòng hồi quy cho bài học GĐ13/GĐ30: PHẢI đo ĐÚNG chỉ số.
 * Bộ test này khoá 3 quest từng đo nhầm (story_first_contract, story_review_perfect, story_treasure)
 * để chúng không bao giờ quay lại đo qua ordersDone/customers/revenue, và rà mọi bước cốt truyện
 * phản ứng đúng với "chỉ một" nguồn số liệu (không có bước nào đo cùng lúc hai thứ trái nghĩa).
 */

/** Ngữ cảnh nhiệm vụ dựng tay, thống kê ngày lấy mới. */
const ctxAt = (patch: Partial<QuestContext> = {}): QuestContext => ({
  day: 1, level: 1, stats: { ...emptyContextStats() }, totals: emptyTotals(),
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000,
  ...patch,
});

import { newGameData } from '../core/store';
const emptyContextStats = () => newGameData().stats;

/** Lấy bước cốt truyện đang làm với một ngữ cảnh (bước đầu tiên chưa nhận thưởng). */
const stepAt = (ctx: QuestContext) => storyQuest(ctx);

describe('cốt truyện đo đúng chỉ số (phòng hồi quy GĐ13/GĐ30)', () => {
  it('story_first_contract đo contractsDone — KHÔNG đo ordersDone hay revenue', () => {
    // Toàn bộ quest chưa nhận thưởng → bước đầu là khai trương (customers), nên phải nạp claim trước
    const claimed = STORY_STEPS.slice(0, STORY_STEPS.findIndex((s) => s.id === 'story_first_contract')).map((s) => s.id);
    // contractsDone đạt đủ mục tiêu
    const hit = stepAt(ctxAt({ log: { ...emptyQuestLog(), claimedStory: claimed }, totals: { ...emptyTotals(), contractsDone: 1 } }));
    expect(hit!.id).toBe('story_first_contract');
    expect(hit!.done).toBe(true);
    // ordersDone/revenue cao vô hạn nhưng contractsDone = 0 → chưa xong (không đo nhầm)
    const miss = stepAt(ctxAt({ log: { ...emptyQuestLog(), claimedStory: claimed }, ordersDone: 9999, totals: { ...emptyTotals(), revenue: 9_999_999 } }));
    expect(miss!.id).toBe('story_first_contract');
    expect(miss!.done).toBe(false);
  });

  it('story_review_perfect đo fiveStars — KHÔNG đo customers', () => {
    const claimed = STORY_STEPS.slice(0, STORY_STEPS.findIndex((s) => s.id === 'story_review_perfect')).map((s) => s.id);
    const base = { ...emptyQuestLog(), claimedStory: claimed };
    const hit = stepAt(ctxAt({ log: base, totals: { ...emptyTotals(), fiveStars: 100 } }));
    expect(hit!.id).toBe('story_review_perfect');
    expect(hit!.done).toBe(true);
    // Rất nhiều khách nhưng chưa đủ 100 lời khen 5★ → chưa xong
    const miss = stepAt(ctxAt({ log: base, totals: { ...emptyTotals(), customers: 10_000, fiveStars: 99 } }));
    expect(miss!.id).toBe('story_review_perfect');
    expect(miss!.done).toBe(false);
  });

  it('story_treasure đo spent — KHÔNG đo revenue', () => {
    const claimed = STORY_STEPS.slice(0, STORY_STEPS.findIndex((s) => s.id === 'story_treasure')).map((s) => s.id);
    const base = { ...emptyQuestLog(), claimedStory: claimed };
    const hit = stepAt(ctxAt({ log: base, totals: { ...emptyTotals(), spent: 1_000_000 } }));
    expect(hit!.id).toBe('story_treasure');
    expect(hit!.done).toBe(true);
    // Doanh thu lớn nhưng chưa chi đủ 1M → chưa xong
    const miss = stepAt(ctxAt({ log: base, totals: { ...emptyTotals(), revenue: 100_000_000, spent: 999_999 } }));
    expect(miss!.id).toBe('story_treasure');
    expect(miss!.done).toBe(false);
  });

  it('toàn bộ bước cốt truyện có measure định nghĩa và phản ứng ở mức zero < mọi ngưỡng (không đo ngược)', () => {
    const zero = ctxAt(); // mọi chỉ số đều 0/trống
    expect(STORY_STEPS.length).toBeGreaterThan(20);
    // Không bước nào "ngay lập tức xong" khi mọi thứ = 0 (ngăn đo nhầm một chỉ số luôn > 0 như level/day)
    const instant = STORY_STEPS.filter((s) => {
      const c: QuestContext = { ...zero, log: { ...emptyQuestLog(), claimedStory: STORY_STEPS.slice(0, STORY_STEPS.findIndex((x) => x.id === s.id)).map((y) => y.id) } };
      const q = storyQuest(c);
      return q?.id === s.id && q.done;
    });
    expect(instant).toEqual([]);
  });

  it('mọi trường ngoài totals/stats mà measure đọc phải là chỉ số cấp cao có thật', () => {
    const valid = new Set(['day', 'level', 'staffCount', 'shopTier', 'warehouseTier', 'ordersDone']);
    const src = STORY_STEPS.map((s) => `${s.id}:${s.measure.toString()}`).join('\n');
    // Giả định mọi measure chỉ đọc c.<trường> hoặc c.totals.<trường> / c.stats.<trường>.
    // Rà các trường truy cập KHÔNG qua totals/stats — chúng phải là chỉ số cấp cao trong danh sách.
    for (const m of new Set(src.matchAll(/\bc\.([A-Za-z0-9_]+)/g))) {
      const ref = m[1];
      if (ref === 'totals' || ref === 'stats') continue;
      expect(valid.has(ref), `measure tham chiếu c.${ref}`).toBe(true);
    }
  });
});
