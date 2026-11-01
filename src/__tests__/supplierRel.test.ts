import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { newGameData } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { bizEndOfDay } from '../core/biz';
import { addRel, relTier, tierProgress, monthlyRelRebate, PARTNER_TIERS } from '../data/supplierRel';
import { emptyMonth } from '../data/biz';
import { unitCost, orderTotal, SUPPLIERS } from '../data/suppliers';

const cho = () => SUPPLIERS.find((s) => s.id === 'cho')!;

describe('GĐ67 — Mối quen lâu dài (supplierRel)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000 });
  });

  describe('addRel (helper thuần)', () => {
    it('chưa có hồ sơ → tạo mới {spent, orders:1}', () => {
      expect(addRel(undefined, 150000)).toEqual({ spent: 150000, orders: 1 });
    });
    it('đã có → cộng dồn spent + 1 đơn', () => {
      expect(addRel({ spent: 100000, orders: 3 }, 200000)).toEqual({ spent: 300000, orders: 4 });
    });
    it('không làm mất hồ sơ cũ (bất biến, clone)', () => {
      const rel = { spent: 100000, orders: 2 };
      addRel(rel, 50000);
      expect(rel).toEqual({ spent: 100000, orders: 2 });
    });
  });

  describe('relTier / tierProgress', () => {
    it('chưa đạt bậc nào → base level 0 (Mối xa)', () => {
      expect(relTier(0).level).toBe(0);
      expect(relTier(999999).level).toBe(0);
    });
    it('đạt ngưỡng → đúng bậc; vượt nhiều → bậc cao hơn', () => {
      expect(relTier(3_000_000).level).toBe(1);
      expect(relTier(12_000_000).level).toBe(2);
      expect(relTier(150_000_000).level).toBe(5);
      expect(relTier(999_000_000).level).toBe(5);
    });
    it('tierProgress: % tới bậc kế, max → 100 và next null', () => {
      const p = tierProgress(3_000_000); // vừa đạt bậc 1 (ngưỡng 3M), tới bậc 2 (12M)
      expect(p.cur.level).toBe(1);
      expect(p.next!.level).toBe(2);
      expect(p.pct).toBe(0);
      const pmax = tierProgress(999_000_000);
      expect(pmax.pct).toBe(100);
      expect(pmax.next).toBe(null);
    });
    it('PARTNER_TIERS ngưỡng tăng dần, không trùng level', () => {
      const levels = PARTNER_TIERS.map((t) => t.level);
      expect(new Set(levels).size).toBe(levels.length);
      for (let i = 1; i < PARTNER_TIERS.length; i++) expect(PARTNER_TIERS[i].threshold).toBeGreaterThan(PARTNER_TIERS[i - 1].threshold);
    });
  });

  describe('monthlyRelRebate', () => {
    it('chưa đạt bậc 1 → 0', () => {
      expect(monthlyRelRebate(0, 10_000_000)).toBe(0);
      expect(monthlyRelRebate(100000, 10_000_000)).toBe(0);
    });
    it('đạt bậc nhưng chưa đủ cam kết tháng → 0', () => {
      expect(monthlyRelRebate(30_000_000, 1000000)).toBe(0); // bậc 3 commit 9M
    });
    it('đủ bậc + đủ cam kết → min(spent×rate, cap)', () => {
      // bậc 1: rate 1% cap 150k
      expect(monthlyRelRebate(3_000_000, 1_500_000)).toBe(15000); // 1.5M×1% = 15k
      // bậc 3: rate 2% cap 600k — 12M×2% = 240k < cap
      expect(monthlyRelRebate(30_000_000, 12_000_000)).toBe(240000);
      // đạt nhưng vượt cap: bậc 5 rate 3% cap 1.5M — 100M×3% = 3M → cap 1.5M
      expect(monthlyRelRebate(150_000_000, 100_000_000)).toBe(1_500_000);
    });
  });

  describe('placeOrder ghi sổ mối quen', () => {
    it('đặt đơn giao ngay (daily minOrder 0) → cộng supplierRel + supplierRelMonth theo đúng mối', () => {
      useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000 });
      useGame.getState().placeOrder('daily', { mi: 5 });
      const s = useGame.getState();
      expect(s.biz.supplierRel.daily.orders).toBe(1);
      expect(s.biz.supplierRel.daily.spent).toBeGreaterThan(0);
      expect(s.biz.supplierRelMonth.daily).toBe(s.biz.supplierRel.daily.spent);
      expect(s.biz.supplierRel.cho).toBeUndefined(); // mối khác không bị đụng
    });
    it('đặt nhiều đơn → cộng dồn và số đơn tăng', () => {
      useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000 });
      useGame.getState().placeOrder('daily', { mi: 5 });
      const c1 = useGame.getState().biz.supplierRel.daily.spent;
      useGame.getState().placeOrder('daily', { mi: 5 });
      const s = useGame.getState();
      expect(s.biz.supplierRel.daily.orders).toBe(2);
      expect(s.biz.supplierRel.daily.spent).toBe(2 * c1);
      expect(s.biz.supplierRelMonth.daily).toBe(2 * c1);
    });
    it('đặt đơn giao sáng mai (cho delay 1, đủ minOrder) cũng ghi sổ', () => {
      useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000, warehouseTier: 3 }); // cap 80 thùng
      useGame.getState().placeOrder('cho', { mi: 60 }); // giá ~2.7k/thùng × 60 ≈ 160k > minOrder 150k
      const s = useGame.getState();
      expect(s.biz.supplierRel.cho.orders).toBe(1);
      expect(s.biz.supplierRel.cho.spent).toBeGreaterThan(0);
      expect(s.deliveries.length).toBe(1);
    });
    it('không đổi kinh tế: orderTotal/unitCost độc lập với hồ sơ quan hệ', () => {
      const before = orderTotal(cho(), { mi: 6 }, 1);
      useGame.setState({ biz: { ...useGame.getState().biz, supplierRel: { cho: { spent: 999_999_999, orders: 99 } } } });
      expect(orderTotal(cho(), { mi: 6 }, 1)).toBe(before);
      expect(unitCost(cho(), 'mi', 1)).toBe(unitCost(cho(), 'mi', 1));
    });
  });

  describe('bizEndOfDay — hoàn cuối tháng', () => {
    // day 32 = tháng 2; b.month month 1 → cuối tháng chốt. Money của 2 phép chạy chỉ khác phần hoàn mối quen
    // (thưởng tuần/tháng giống nhau nên trừ bù hết) — tách đúng số hoàn ròng.
    function runBiz(rel: Record<string, { spent: number; orders: number }>, month: Record<string, number>) {
      const base = { ...useGame.getState(), day: 32, level: 30, money: 50_000_000 }; // day 32 → tháng 2, chốt tháng 1
      base.biz = { ...base.biz, month: emptyMonth(1, 1, 1000000), supplierRel: rel, supplierRelMonth: month };
      return bizEndOfDay(base, base.stats);
    }
    it('đủ cam kết theo bậc → cộng hoàn vào money, news nhắc, reset tháng', () => {
      const low = runBiz({ cho: { spent: 30_000_000, orders: 2 } }, { cho: 2_000_000 }).money; // bậc 3 nhưng chưa đủ commit 9M
      const met = runBiz({ cho: { spent: 30_000_000, orders: 10 } }, { cho: 12_000_000 }); // 12M − commit 9M → 2% = 240k
      expect(met.money - low).toBe(240000);
      expect(met.biz.supplierRelMonth).toEqual({});
      expect(met.biz.supplierRel.cho.spent).toBe(30_000_000); // tích lũy cả ván giữ nguyên (chỉ reset tháng)
      expect(met.news.some((n) => n.includes('hoàn') && n.includes('Mối ruột'))).toBe(true);
    });
    it('chưa đủ cam kết → 0 hoàn, news không nhắc, tháng vẫn reset', () => {
      const out = runBiz({ cho: { spent: 30_000_000, orders: 2 } }, { cho: 2_000_000 });
      expect(out.news.some((n) => n.includes('hoàn'))).toBe(false);
      expect(out.biz.supplierRelMonth).toEqual({});
    });
    it('không có doanh mua tháng nào → không hoàn, không reset lỗi', () => {
      const out = runBiz({}, {});
      expect(out.news.some((n) => n.includes('hoàn'))).toBe(false);
      expect(out.biz.supplierRelMonth).toEqual({});
    });
  });

  describe('save-safe', () => {
    it('newBiz có supplierRel + supplierRelMonth mặc định {}', () => {
      const s = useGame.getState();
      expect(s.biz.supplierRel).toEqual({});
      expect(s.biz.supplierRelMonth).toEqual({});
    });
    it('round-trip: ghi sổ rồi snapshot → applySnapshot giữ hồ sơ', () => {
      useGame.setState({ ...newGameData(), day: 1, level: 30, money: 50_000_000 });
      useGame.getState().placeOrder('daily', { mi: 5 });
      const raw = snapshot();
      applySnapshot(raw);
      const s = useGame.getState();
      expect(s.biz.supplierRel.daily.orders).toBe(1);
      expect(s.biz.supplierRelMonth.daily).toBeGreaterThan(0);
    });
    it('bản lưu cũ thiếu 2 trường → tự bù {} và vẫn chơi', () => {
      const raw = snapshot();
      delete (raw.biz as unknown as Record<string, unknown>).supplierRel;
      delete (raw.biz as unknown as Record<string, unknown>).supplierRelMonth;
      applySnapshot(raw);
      const s = useGame.getState();
      expect(s.biz.supplierRel).toEqual({});
      expect(s.biz.supplierRelMonth).toEqual({});
      useGame.getState().placeOrder('daily', { mi: 5 }); // vẫn đặt được sau nạp cũ
      expect(useGame.getState().biz.supplierRel.daily.orders).toBe(1);
    });
  });
});
