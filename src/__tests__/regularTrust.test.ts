import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { newGameData } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { REGULARS, emptyProgress } from '../data/regulars';
import {
  lifetimeRegularVisits, vipTierOf, nextTierOf, monthlyTriAn,
  VIP_TIERS, EMOTIONAL_FRIENDSHIP,
} from '../data/regularTrust';
import { emptyMonth } from '../data/biz';

const prog = (friendship: number, visits: number) => ({
  ...emptyProgress(), friendship, visits,
  discovered: REGULARS[0].favorites,
});

describe('GĐ69 — Sổ thương mến: bể khách quen toàn tiệm + quà tri ân cuối tháng (regularTrust)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000 });
  });

  describe('helper thuần', () => {
    it('lifetimeRegularVisits cộng tổng lượt khách quen cả ván (bể), trống → 0', () => {
      expect(lifetimeRegularVisits({})).toBe(0);
      expect(lifetimeRegularVisits({ a: prog(10, 5), b: prog(20, 12) })).toBe(17);
      expect(lifetimeRegularVisits(undefined as unknown as Record<string, never>)).toBe(0);
    });
    it('VIP_TIERS tăng dần theo bậc (threshold/rate/cap)', () => {
      for (let i = 1; i < VIP_TIERS.length; i++) {
        expect(VIP_TIERS[i].threshold).toBeGreaterThan(VIP_TIERS[i - 1].threshold);
      }
      expect(VIP_TIERS[0].level).toBe(1);
      expect(VIP_TIERS.at(-1)!.level).toBe(4);
    });
    it('vipTierOf đúng biên ngưỡng', () => {
      expect(vipTierOf(0).level).toBe(0);
      expect(vipTierOf(29).level).toBe(0);
      expect(vipTierOf(30).level).toBe(1);
      expect(vipTierOf(119).level).toBe(1);
      expect(vipTierOf(120).level).toBe(2);
      expect(vipTierOf(300).level).toBe(3);
      expect(vipTierOf(999).level).toBe(4);
    });
    it('nextTierOf trả bậc kế tiếp, max → null', () => {
      expect(nextTierOf(0)!.level).toBe(1);
      expect(nextTierOf(30)!.level).toBe(2);
      expect(nextTierOf(600)).toBeNull();
    });
    it('monthlyTriAn: chưa bậc 1 hoặc không mối ruột → 0', () => {
      expect(monthlyTriAn(5, 50, 2).amount).toBe(0); // chưa bậc 1
      expect(monthlyTriAn(30, 50, 0).amount).toBe(0); // không mối ruột
    });
    it('monthlyTriAn: đủ bậc + mối ruột → min(lượt × rate, cap)', () => {
      const r = monthlyTriAn(300, 100, 2); // bậc 3 Tiệm ruột, rate 1800, cap 260k
      expect(r.tier.name).toBe('Tiệm ruột');
      expect(r.amount).toBe(Math.min(100 * 1800, 260000));
      const capped = monthlyTriAn(600, 1000, 1); // bậc 4, 1000 lượt × 2600 = 2.6M > cap 500k
      expect(capped.amount).toBe(500000);
    });
  });

  describe('regularVisit — mỗi khách quen phục vụ cộng triAnMonth', () => {
    it('khách quen mua hàng (paid) → biz.triAnMonth +1, không đổi spent', () => {
      const fav = REGULARS[0].favorites[0];
      useGame.setState({ regulars: { [REGULARS[0].id]: prog(5, 3) }, biz: { ...useGame.getState().biz, triAnMonth: 0 } });
      const before = useGame.getState().stats.spent;
      const tip = useGame.getState().regularVisit(REGULARS[0].id, [{ id: fav, price: 5000 }], true);
      expect(tip).toBeGreaterThanOrEqual(0);
      expect(useGame.getState().biz.triAnMonth).toBe(1);
      expect(useGame.getState().stats.spent).toBe(before);
    });
    it('khách quen về tay không (không paid) → không cộng triAnMonth', () => {
      useGame.setState({ regulars: { [REGULARS[0].id]: prog(5, 3) }, biz: { ...useGame.getState().biz, triAnMonth: 0 } });
      useGame.getState().regularVisit(REGULARS[0].id, [], false);
      expect(useGame.getState().biz.triAnMonth).toBe(0);
    });
  });

  describe('bizEndOfDay — quà tri ân cuối tháng (soi gương hoàn mối quen GĐ67)', () => {
    // day 32 = tháng 2, b.month tháng 1 → chốt tháng 1. Money hai phép chạy chỉ khác phần tri ân
    // (thưởng tuần/tháng như nhau nên trừ bù hết) → tách đúng số quà ròng.
    function runTri(regulars: Record<string, ReturnType<typeof prog>>, monthVisits: number) {
      const base = { ...useGame.getState(), day: 32, level: 30, money: 50_000_000, regulars };
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000), triAnMonth: monthVisits, triAnPaidMonth: undefined };
      return bizEndOfDay(base, base.stats);
    }
    it('đủ bậc Tiệm + mối ruột → cộng quà vào money, news nhắc, reset tháng + ghi đã trả', () => {
      const close = prog(EMOTIONAL_FRIENDSHIP + 10, 300); // bậc 3, friendship ≥ 40 → mối ruột
      const base = runTri({ a: close }, 100).money; // chạy một phép có tri ân
      const out = runTri({ a: close }, 100);
      expect(out.money).toBe(base);
      expect(out.news.some((n) => n.includes('Sổ thương mến') && n.includes('Tiệm ruột'))).toBe(true);
      expect(out.biz.triAnMonth).toBe(0);
      expect(out.biz.triAnPaidMonth).toBe(2);
    });
    it('quà đúng lượng: diff giữa chạy có tri ân vs không mối ruột', () => {
      const close = prog(EMOTIONAL_FRIENDSHIP + 10, 300); // mối ruột, bậc 3
      const cold = prog(5, 300); // cùng bể bậc 3 nhưng không mối ruột
      const withTri = runTri({ a: close }, 100).money;
      const noTri = runTri({ a: cold }, 100).money;
      expect(withTri - noTri).toBe(Math.min(100 * 1800, 260000)); // rate bậc 3 = 1800
    });
    it('chưa đạt bậc 1 → không quà, không news tri ân, tháng vẫn reset', () => {
      const low = prog(50, 10); // bể 10 < 30 → chưa bậc 1
      const out = runTri({ a: low }, 40);
      expect(out.news.some((n) => n.includes('Sổ thương mến'))).toBe(false);
      expect(out.biz.triAnMonth).toBe(0);
    });
    it('đã trả tháng này (triAnPaidMonth = m) → không trả kép', () => {
      const close = prog(EMOTIONAL_FRIENDSHIP + 10, 300);
      const base = { ...useGame.getState(), day: 32, level: 30, money: 50_000_000, regulars: { a: close } };
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000), triAnMonth: 100, triAnPaidMonth: 2 };
      const out = bizEndOfDay(base, base.stats);
      expect(out.news.some((n) => n.includes('Sổ thương mến'))).toBe(false);
    });
  });
});
