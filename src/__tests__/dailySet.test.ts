import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import { dailyQuests, dailySetProgress, emptyQuestLog, emptyTotals, isBetCore, type QuestContext } from '../data/quests';

/** Tiến độ TRỌN BỘ nhiệm vụ hôm nay: đếm X/M, "xong hết" và "nhận hết thưởng" — mồi quay lại khép ngày. */

const ctx = (
  day = 1, level = 1,
  stats = newGameData().stats,
  log = emptyQuestLog(),
): QuestContext => ({
  day, level, stats, totals: emptyTotals(), staffCount: 0, shopTier: 0, warehouseTier: 0,
  ordersDone: 0, log, festivalGoods: [], reservationsToday: 0, rent: 20000,
});

// Stats đủ đè làm cả bộ cấp 1 (customers/revenue/itemsSold đều vượt target, unhappy=0 để daily_smile
// tính được; byHour đè nhiệm vụ GĐ160 "Sớm hôm đón khách" — doanh thu 6h–9h)
const bigStats = {
  ...newGameData().stats,
  customers: 100, revenue: 200000, itemsSold: 100, unhappy: 0,
  byHour: { 6: { customers: 9, revenue: 999_999 }, 7: { customers: 9, revenue: 999_999 }, 8: { customers: 9, revenue: 999_999 } },
};

describe('dailySetProgress — khép trọn bộ nhiệm vụ ngày', () => {
  it('đầu ngày (chưa làm gì): total = số việc hôm nay, done/claimed = 0, chưa khép bộ', () => {
    const c = ctx();
    const qs = dailyQuests(c);
    const p = dailySetProgress(c);
    expect(p.total).toBe(qs.length);
    expect(p.done).toBe(0);
    expect(p.claimed).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.allDone).toBe(false);
    expect(p.allClaimed).toBe(false);
  });

  it('làm xong hết nhưng chưa nhận thưởng: allDone, done=total, claimed=0', () => {
    const c = ctx(1, 1, bigStats as never);
    const p = dailySetProgress(c);
    expect(p.total).toBeGreaterThan(0);
    expect(p.done).toBe(p.total);
    expect(p.pct).toBe(100);
    expect(p.allDone).toBe(true);
    expect(p.allClaimed).toBe(false);
  });

  it('xong và nhận hết thưởng: allClaimed, claimed=total', () => {
    const c = ctx(1, 1, bigStats as never, { day: 1, claimedDaily: dailyQuests(ctx(1, 1, bigStats as never)).map((q) => q.id), claimedStory: [] });
    const p = dailySetProgress(c);
    expect(p.claimed).toBe(p.total);
    expect(p.allDone).toBe(true);
    expect(p.allClaimed).toBe(true);
  });

  it('một phần (chỉ đạt 1 việc): 0 < done < total', () => {
    const stats = { ...newGameData().stats, customers: 6, revenue: 0, itemsSold: 0, unhappy: 0 };
    const p = dailySetProgress(ctx(1, 1, stats as never));
    expect(p.done).toBe(1); // chỉ daily_customers (6≥5)
    expect(p.total).toBeGreaterThan(p.done);
    expect(p.allDone).toBe(false);
    expect(p.allClaimed).toBe(false);
    expect(p.pct).toBe(Math.round((1 / p.total) * 100));
  });

  it('khớp với đếm tay trên dailyQuests (mọi trường hợp)', () => {
    const c = ctx(1, 1, bigStats as never);
    const qs = dailyQuests(c);
    const p = dailySetProgress(c);
    expect(qs.filter((q) => q.done).length).toBe(p.done);
    expect(qs.filter((q) => q.claimed).length).toBe(p.claimed);
  });

  it('helper thuần: hai lần cùng ngữ cảnh cho kết quả giống hệt', () => {
    expect(dailySetProgress(ctx(1, 1, bigStats as never))).toEqual(dailySetProgress(ctx(1, 1, bigStats as never)));
  });
});

// GĐ108 — "Khách vui vẻ" (daily_smile) đổi từ "tất-cả-hoặc-không" (1 khách phàn nàn → current=0) sang
// đếm KHÁCH VUI (customers − unhappy, không âm) — ngày có vài khách quạu vẫn tính được khách hài lòng.
describe('daily_smile đếm khách vui (GĐ108)', () => {
  const smileOf = (customers: number, unhappy: number) =>
    dailyQuests(ctx(1, 1, { ...newGameData().stats, customers, unhappy } as never)).find((q) => q.id === 'daily_smile')!;

  it('không ai phàn nàn → xong (khách hài lòng đủ mục tiêu)', () => {
    const q = smileOf(12, 0);
    expect(q.done).toBe(true); // 12 ≥ target 8
    expect(q.current).toBe(8); // current hiển thị chặn ở target
  });

  it('có khách phàn nàn → vẫn thuộc (đếm phần hài lòng thay vì về 0)', () => {
    const q = smileOf(20, 3);
    expect(q.done).toBe(true); // 20−3 = 17 ≥ 8 → vẫn xong
  });

  it('chưa đủ khách vui thì chưa thuộc, kể cả khi tổng khách đông nhưng phần nản lớn', () => {
    const q = smileOf(9, 3); // 9−3 = 6 < 8
    expect(q.done).toBe(false);
  });

  it('quá nhiều khách phàn nàn → hụt nhưng không âm (floor 0)', () => {
    const q = smileOf(5, 9);
    expect(q.current).toBe(0); // 5−9 → clamp 0, không âm
    expect(q.done).toBe(false);
  });

  it('vẫn nằm bộ nhiệm vụ ngày thường, nhưng KHÔNG trong bộ kèo việc chính (GĐ107)', () => {
    const q = smileOf(12, 0);
    expect(q).toBeTruthy(); // có trong bộ ngày
    expect(isBetCore('daily_smile')).toBe(false); // không trong bộ kèo việc chính
  });
});
