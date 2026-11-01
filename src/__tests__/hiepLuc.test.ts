import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, newGameData } from '../core/store';
import { bizEndOfDay, signHiepLuc } from '../core/biz';
import { newBranch, type BranchState } from '../data/branches';
import { emptyMonth } from '../data/biz';
import {
  hiepLucEligible, hiepLucPayoff, hiepLucBonus, HIEPLUC_COC, HIEPLUC_MIN, HIEPLUC_RATE,
  HIEPLUC_CAP, HIEPLUC_STREAK_MAX, newHiepLuc,
} from '../data/hiepLuc';

const openBranch = (): BranchState => {
  const b = newBranch();
  b.open = true;
  b.shelf = { gao: 5 };
  return b;
};
const quan = (open: boolean) => ({ open, staff: open ? 2 : 0, price: 'vua' as const });

describe('GĐ74 — Đối tác chi nhánh × quán nước: hiệp lực tháng (hiepLuc)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 5, level: 40, money: 50_000_000 });
  });

  describe('helper thuần', () => {
    it('hiepLucEligible: đủ cấp + cả 2 cơ sở mở', () => {
      expect(hiepLucEligible(openBranch(), quan(true), 40)).toBe(true);
      expect(hiepLucEligible(null, quan(true), 40)).toBe(false); // thiếu chi nhánh
      expect(hiepLucEligible(openBranch(), quan(false), 40)).toBe(false); // quán đóng
      expect(hiepLucEligible(openBranch(), quan(true), 20)).toBe(false); // dưới cấp mở quán
    });
    it('hiepLucBonus: dưới ngưỡng → 0, trên ngưỡng → min(Σ×rate, cap)', () => {
      expect(hiepLucBonus(HIEPLUC_MIN - 1)).toBe(0);
      expect(hiepLucBonus(HIEPLUC_MIN)).toBe(Math.round(HIEPLUC_MIN * HIEPLUC_RATE));
      expect(hiepLucBonus(HIEPLUC_CAP / HIEPLUC_RATE + 1_000_000)).toBe(HIEPLUC_CAP);
    });
    it('hiepLucPayoff: nhân chuỗi tháng, tăng dần tới trần +80%', () => {
      const cb = 8_000_000;
      const b0 = hiepLucBonus(cb);
      expect(hiepLucPayoff(cb, 0)).toBe(Math.round(b0 * 1));
      expect(hiepLucPayoff(cb, 1)).toBe(Math.round(b0 * 1.05));
      expect(hiepLucPayoff(cb, HIEPLUC_STREAK_MAX / 0.05)).toBe(Math.round(b0 * (1 + HIEPLUC_STREAK_MAX)));
    });
    it('newHiepLuc mặc định không đối tác', () => {
      expect(newHiepLuc()).toEqual({ m: 0, active: false, coc: 0 });
    });
  });

  describe('bizEndOfDay — tích lũy + chốt hiệp lực cuối tháng', () => {
    // day 32 = tháng 2, b.month tháng 1 → chốt tháng 1. HiepLuc.m = 1 (đối tác cho tháng 1).
    function runHiep(active: boolean, combined: number, streak: number, partnerMonthly = true) {
      const base = { ...useGame.getState(), day: 32, level: 40, money: 50_000_000 };
      base.biz = {
        ...base.biz,
        month: emptyMonth(1, 1, 1000000),
        hiepLuc: { m: partnerMonthly ? 1 : 2, active, coc: active ? HIEPLUC_COC : 0 },
        hiepLucMonth: combined,
        hiepLucStreak: streak,
      };
      return bizEndOfDay(base, base.stats);
    }
    it('đủ doanh thu chung → thưởng hiệp lực + chuỗi + hoàn cọc, cuối tháng', () => {
      const off = runHiep(false, 8_000_000, 0).money;
      const out = runHiep(true, 8_000_000, 0);
      expect(out.money - off).toBe(hiepLucPayoff(8_000_000, 0) + HIEPLUC_COC); // thưởng + hoàn cọc
      expect(out.biz.hiepLucStreak).toBe(1);
      expect(out.biz.hiepLuc!.active).toBe(false);
      expect(out.biz.hiepLuc!.coc).toBe(0);
      expect(out.biz.hiepLucMonth).toBe(0);
      expect(out.news.some((n) => n.includes('Đối tác chi nhánh × quán nước') && n.includes('thưởng hiệp lực'))).toBe(true);
    });
    it('dưới ngưỡng → không thưởng, vẫn hoàn cọc, streak về 0', () => {
      const off = runHiep(false, HIEPLUC_MIN - 1, 2).money;
      const out = runHiep(true, HIEPLUC_MIN - 1, 2);
      expect(out.money - off).toBe(HIEPLUC_COC); // chỉ hoàn cọc
      expect(out.biz.hiepLucStreak).toBe(0);
      expect(out.news.some((n) => n.includes('chưa đủ ngưỡng'))).toBe(true);
    });
    it('không active hoặc đối tác cho tháng khác → không thưởng không hoàn', () => {
      const off = runHiep(false, 8_000_000, 1).money;
      expect(runHiep(false, 8_000_000, 1).money).toBe(off);
      expect(runHiep(false, 8_000_000, 1).news.some((n) => n.includes('Đối tác chi nhánh'))).toBe(false);
      expect(runHiep(true, 8_000_000, 1, false).money).toBe(off); // hiepLuc.m=2 ≠ closed 1
    });
    it('chuỗi tháng liên tiếp làm thưởng cao hơn', () => {
      const off = runHiep(false, 8_000_000, 0).money;
      const s1 = runHiep(true, 8_000_000, 0).money - off;
      const s3 = runHiep(true, 8_000_000, 3).money - off;
      expect(s3).toBeGreaterThan(s1);
    });
    it('ngày thường (không chốt tháng) tích lũy doanh thu chung vào hiepLucMonth', () => {
      const base = { ...useGame.getState(), day: 20, level: 40, money: 50_000_000 };
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000), hiepLuc: { m: 1, active: true, coc: HIEPLUC_COC }, hiepLucMonth: 5_000_000 };
      const out = bizEndOfDay(base, base.stats, 2_000_000);
      expect(out.biz.hiepLucMonth).toBe(7_000_000);
      expect(out.biz.hiepLuc!.active).toBe(true); // chưa chốt
    });
    it('người chưa đối tác không ảnh hưởng money (tích lũy bỏ qua)', () => {
      const base = { ...useGame.getState(), day: 20, level: 40, money: 50_000_000 };
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000), hiepLuc: newHiepLuc(), hiepLucMonth: 0 };
      const out = bizEndOfDay(base, base.stats, 2_000_000);
      expect(out.biz.hiepLucMonth).toBe(0);
      const base2 = { ...useGame.getState(), day: 20, level: 40, money: 50_000_000 };
      base2.biz = { ...base2.biz, month: emptyMonth(1, 1, 1000000), hiepLuc: newHiepLuc(), hiepLucMonth: 0 };
      expect(out.money).toBe(bizEndOfDay(base2, base2.stats, 2_000_000).money);
    });
  });

  describe('signHiepLuc — action lập đối tác', () => {
    it('chưa đủ 2 cơ sở → không trừ tiền, notify', () => {
      useGame.setState({ level: 29, branch: null, money: 1_000_000 });
      const before = useGame.getState().money;
      signHiepLuc();
      expect(useGame.getState().money).toBe(before);
      expect(useGame.getState().biz.hiepLuc!.active).toBe(false);
    });
    it('đủ điều kiện → trừ cọc + active, notify', () => {
      useGame.setState({ level: 40, branch: openBranch(), money: 1_000_000 });
      const s0 = useGame.getState();
      s0.biz.quanNuoc = { ...s0.biz.quanNuoc, open: true };
      signHiepLuc();
      const s = useGame.getState();
      expect(s.money).toBe(1_000_000 - HIEPLUC_COC);
      expect(s.biz.hiepLuc!.active).toBe(true);
      expect(s.biz.hiepLuc!.coc).toBe(HIEPLUC_COC);
      expect((s.stats.spent || 0)).toBe((s0.stats.spent || 0) + HIEPLUC_COC);
    });
    it('thiếu tiền cọc → không lập', () => {
      useGame.setState({ level: 40, branch: openBranch(), money: 1000 });
      signHiepLuc();
      expect(useGame.getState().biz.hiepLuc!.active).toBe(false);
    });
    it('đã đối tác tháng này → no-op', () => {
      useGame.setState({ level: 40, branch: openBranch(), money: 1_000_000 });
      const s0 = useGame.getState();
      s0.biz.quanNuoc = { ...s0.biz.quanNuoc, open: true };
      signHiepLuc();
      const moneyAfter1 = useGame.getState().money;
      signHiepLuc();
      expect(useGame.getState().money).toBe(moneyAfter1);
    });
  });
});
