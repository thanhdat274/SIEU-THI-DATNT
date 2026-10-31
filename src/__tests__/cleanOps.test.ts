import { describe, it, expect } from 'vitest';
import { CLEAN_MIN_CUSTOMERS, CLEAN_TIERS, cleanBonus, cleanDayMet, nextCleanTier, type CleanStats } from '../data/cleanOps';
import { useGame, newGameData } from '../core/store';
import { bizEndOfDay } from '../core/biz';

const clean = (over: Partial<CleanStats> = {}): CleanStats => ({ customers: 15, ...over });

describe('cleanOps — Nếp vận hành (GĐ79)', () => {
  it('đủ khách + không ai bỏ vì chờ/hết hàng → sạch', () => {
    expect(cleanDayMet(clean())).toBe(true);
  });

  it('ít khách hơn ngưỡng → không sạch (chặn đóng cửa trục lợi)', () => {
    expect(cleanDayMet(clean({ customers: CLEAN_MIN_CUSTOMERS - 1 }))).toBe(false);
  });

  it('có khách bỏ vì chờ quầy (wait) → không sạch', () => {
    expect(cleanDayMet(clean({ missed: { wait: 1 } }))).toBe(false);
  });

  it('có khách bỏ vì hết hàng (stock) → không sạch', () => {
    expect(cleanDayMet(clean({ missed: { stock: 2 } }))).toBe(false);
  });

  it('giá cao (price) làm khách bỏ nhưng KHÔNG tính là mất vận hành (đòn kinh tế)', () => {
    expect(cleanDayMet(clean({ missed: { price: 3 } }))).toBe(true);
  });

  it('món cũ (expired) không tính là mất vận hành', () => {
    expect(cleanDayMet(clean({ missed: { expired: 1 } }))).toBe(true);
  });

  it('4 mốc chuỗi: 3/7/14/30', () => {
    expect(CLEAN_TIERS.map((t) => t.n)).toEqual([3, 7, 14, 30]);
  });

  it('nextCleanTier trả mốc kế tiếp, null khi đã max', () => {
    expect(nextCleanTier(0)!.n).toBe(3);
    expect(nextCleanTier(5)!.n).toBe(7);
    expect(nextCleanTier(30)).toBeNull();
  });

  it('thưởng theo cấp: cao cấp hơn thì nhiều hơn', () => {
    expect(cleanBonus(3, 40)).toBeGreaterThan(0);
    expect(cleanBonus(3, 50)).toBeGreaterThan(cleanBonus(3, 40));
  });
});

describe('bizEndOfDay — streak + thưởng mốc (diff 2-run)', () => {
  const baseState = () => {
    useGame.setState({ ...newGameData(), day: 1, level: 40, money: 50_000_000 });
    const s = useGame.getState();
    return {
      ...s,
      day: 40, level: 40, money: 50_000_000,
      biz: { ...s.biz, cleanStreak: 2, cleanBest: 5, cleanClaimed: 0 },
    };
  };

  it('ngày sạch → tự đứt/tiếp chuỗi: streak 2→3, nhận thưởng mốc 3 một lần', () => {
    const s = baseState();
    const stats = { ...s.stats, customers: 15, missed: {} };
    const out = bizEndOfDay(s, stats);
    expect(out.biz.cleanStreak).toBe(3);
    expect(out.biz.cleanClaimed).toBe(3);
    expect(out.biz.cleanBest).toBe(5);
  });

  it('ngày TỪNG sạch (2→3) thưởng đúng cleanBonus(3); fallback so với hôm không sạch = đúng chênh', () => {
    const sClean = baseState();
    const sDirty = baseState();
    const outC = bizEndOfDay(sClean, { ...sClean.stats, customers: 15, missed: {} });
    const outD = bizEndOfDay(sDirty, { ...sDirty.stats, customers: 15, missed: { wait: 1 } });
    expect(outC.biz.cleanStreak).toBe(3);
    expect(outD.biz.cleanStreak).toBe(0); // đứt chuỗi
    // rival = null trong newGameData → missed chỉ ảnh hưởng block nếp vận hành
    expect(outC.money - outD.money).toBe(cleanBonus(3, 40));
  });

  it('không sạch → đứt chuỗi về 0, không thưởng', () => {
    const s = baseState();
    const out = bizEndOfDay(s, { ...s.stats, customers: 15, missed: { stock: 1 } });
    expect(out.biz.cleanStreak).toBe(0);
    expect(out.biz.cleanClaimed).toBe(0);
  });

  it('đã nhận mốc rồi (cleanClaimed = mốc) → không nhận lại cùng mốc', () => {
    const s = baseState();
    s.biz = { ...s.biz, cleanStreak: 7, cleanBest: 7, cleanClaimed: 7 };
    const out = bizEndOfDay(s, { ...s.stats, customers: 15, missed: {} });
    // streak 7→8, chưa tới mốc 14 → không có thưởng mốc mới, cleanClaimed giữ nguyên
    expect(out.biz.cleanStreak).toBe(8);
    expect(out.biz.cleanClaimed).toBe(7);
  });

  it('đạt mốc mới (cleanClaimed < mốc) → nhận thưởng mốc mới', () => {
    const s = baseState();
    s.biz = { ...s.biz, cleanStreak: 7, cleanBest: 7, cleanClaimed: 3 };
    const out = bizEndOfDay(s, { ...s.stats, customers: 15, missed: {} });
    expect(out.biz.cleanStreak).toBe(8);
    expect(out.biz.cleanClaimed).toBe(7); // nhảy tới mốc 7
  });

  it('save-safe: field mặc định 0 trong newBiz', () => {
    const s = useGame.getState();
    expect(s.biz.cleanStreak ?? 0).toBe(0);
    expect(s.biz.cleanBest ?? 0).toBe(0);
    expect(s.biz.cleanClaimed ?? 0).toBe(0);
  });
});
