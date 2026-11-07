import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { PRODUCTS } from '../data/products';
import { MARKET_TIERS, clampMarketMult, marketSellThrough, marketTierQuote, marketTierUnlocked, type MarketTier } from '../data/chophien';

/** GĐ1518 — chợ 3 cấp: xóm y cũ, phường/đầu mối mở sau golden 30, phí sạp, tự đặt giá. */
const recs = () => Array.from({ length: 14 }, (_, i) => ({ day: i + 1, qty: 1, revenue: 5000, cost: 3000, spoiled: 0, lost: 0 }));
const setup = (level: number, qty = 80) => useGame.setState({
  ...newGameData(), level, day: 7, marketClearedDay: 0, storage: { mi: qty }, storageLots: {}, furniture: [],
  demand: { mi: 1 }, analytics: { items: { mi: recs() }, flags: {} }, money: 0,
});
beforeEach(() => useGame.setState(newGameData()));

describe('marketTiers (GĐ1518)', () => {
  it('mở khoá: phường 32, đầu mối 40 (sau golden 30); xóm luôn mở', () => {
    expect(MARKET_TIERS.phuong.unlock).toBeGreaterThan(30);
    expect(marketTierUnlocked('phuong', 31)).toBe(false);
    expect(marketTierUnlocked('daumoi', 40)).toBe(true);
    expect(marketTierUnlocked('xom', 1)).toBe(true);
  });

  it('giá rao: kẹp 0,3–3; tỉ lệ bán không tăng khi giá tăng', () => {
    expect(clampMarketMult(5)).toBe(3);
    expect(clampMarketMult(0)).toBe(0.3);
    for (const t of ['phuong', 'daumoi'] as MarketTier[])
      for (let m = 0.3; m < 3; m += 0.1) expect(marketSellThrough(m + 0.1, t)).toBeLessThanOrEqual(marketSellThrough(m, t));
  });

  it('mọi món × cấp × giá: tiền ròng/món < giá bán lẻ (bán ở tiệm luôn lời hơn)', () => {
    for (const p of PRODUCTS) for (const t of ['phuong', 'daumoi'] as MarketTier[]) for (const m of [0.3, 1, 1.5, 2, 3]) {
      const val = { day: 7, rows: [{ id: p.id, name: p.name, qty: 10, est: Math.round(10 * p.sell * 0.75 * 1.2), reason: 'slow' as const }], total: 0, units: 10 };
      const q = marketTierQuote(val, t, m);
      if (q.units) expect(q.net / q.units).toBeLessThan(p.sell);
    }
  });

  it('xóm (không truyền gì) giữ y kết quả cũ: 15 món', () => {
    setup(50);
    const r = useGame.getState().sellMarketSurplus();
    expect(r.ok).toBe(true);
    expect(r.units).toBe(15);
    expect(r.fee).toBe(0);
  });

  it('cấp khoá bị từ chối, không đổi tiền/kho', () => {
    setup(31);
    expect(useGame.getState().sellMarketSurplus({ tier: 'phuong' })).toEqual({ ok: false, reason: 'locked' });
    expect(useGame.getState().storage.mi).toBe(80);
    expect(useGame.getState().money).toBe(0);
  });

  it('đầu mối: trần 60, trừ phí 5%, báo giá = kết quả, một lần mỗi ngày', () => {
    setup(45);
    const r = useGame.getState().sellMarketSurplus({ tier: 'daumoi', mult: 0.5 });
    expect(r.ok).toBe(true);
    expect(r.units).toBe(60);
    const st = useGame.getState();
    expect(st.storage.mi).toBe(20);
    expect(st.money).toBe(r.pay);
    expect(r.fee).toBe(Math.round((r.pay! + r.fee!) * 0.05));
    expect(useGame.getState().sellMarketSurplus({ tier: 'phuong' }).reason).toBe('already');
  });

  it('rao giá cao bán ít hơn', () => {
    setup(45);
    const lo = useGame.getState().sellMarketSurplus({ tier: 'phuong', mult: 1 });
    setup(45);
    const hi = useGame.getState().sellMarketSurplus({ tier: 'phuong', mult: 2 });
    expect(hi.units!).toBeLessThan(lo.units!);
  });
});

import { MARKET_HOT_BONUS, marketHotCategory } from '../data/chophien';
import { CATEGORIES, productById } from '../data/products';
describe('sạp thu mua giá cao (GĐ1519)', () => {
  it('nhóm hot tất định theo tuần, xoay qua mọi nhóm', () => {
    expect(marketHotCategory(7)).toBe(marketHotCategory(13));
    const n = Object.keys(CATEGORIES).length;
    const seen = new Set(Array.from({ length: n }, (_, i) => marketHotCategory(i * 7)));
    expect(seen.size).toBe(n);
  });
  it('món thuộc nhóm hot được trả thêm 15% (dưới trần), xóm không đổi', () => {
    const p = PRODUCTS.find((x) => x.sell >= 5000)!;
    const day = Array.from({ length: 200 }, (_, i) => i * 7).find((d) => marketHotCategory(d) === p.category)!;
    const other = Array.from({ length: 200 }, (_, i) => i * 7).find((d) => marketHotCategory(d) !== p.category)!;
    const row = { id: p.id, name: p.name, qty: 10, est: Math.round(10 * p.sell * 0.75), reason: 'slow' as const };
    const hot = marketTierQuote({ day, rows: [row], total: 0, units: 10 }, 'phuong', 0.5);
    const cold = marketTierQuote({ day: other, rows: [row], total: 0, units: 10 }, 'phuong', 0.5);
    expect(hot.gross).toBe(Math.round(cold.gross * (1 + MARKET_HOT_BONUS)));
    expect(marketTierQuote({ day, rows: [row], total: 0, units: 10 }, 'xom', 1).gross).toBe(row.est);
    expect(productById(p.id).category).toBe(p.category);
  });
});
