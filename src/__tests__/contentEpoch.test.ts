import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { CONTENT_EPOCH_NOW, EPOCH_LOCKED, contentEpoch, epochGate, setContentEpoch } from '../data/contentEpoch';
import { PRODUCTS, productById, unlockedProducts, type Product } from '../data/products';
import { RECIPES, RECIPE_MAP, type Recipe } from '../data/recipes';
import { installHeadless, type Snap } from './goldenFile';

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));
beforeEach(installHeadless);
afterEach(() => setContentEpoch(Infinity));

/**
 * KỶ NGUYÊN NỘI DUNG (SPEC-TOI-UU §T4). Bảo đảm cốt lõi: nội dung ghi `since` KHÔNG làm lệch sim
 * golden dù mở ở cấp 1 — nhờ vậy bỏ được quy ước "nội dung mới phải mở sau cấp 30".
 */
describe('epochGate — dòng có since tự khoá khi kỷ nguyên chưa tới', () => {
  it('mặc định người chơi thấy hết (kỷ nguyên vô cực)', () => {
    expect(contentEpoch()).toBe(Infinity);
    const rows = epochGate([{ unlock: 5, since: 1 }, { unlock: 7 }]);
    expect(rows.map((r) => r.unlock)).toEqual([5, 7]);
  });

  it('kỷ nguyên 0: dòng since:1 khoá, dòng gốc giữ nguyên; trả kỷ nguyên về thì mở lại', () => {
    const rows = epochGate([{ unlock: 5, since: 1 }, { unlock: 7 }]);
    setContentEpoch(0);
    expect(rows.map((r) => r.unlock)).toEqual([EPOCH_LOCKED, 7]);
    expect(rows.filter((r) => r.unlock <= 200)).toHaveLength(1);
    setContentEpoch(1);
    expect(rows[0].unlock).toBe(5);
  });

  it('bọc lại nhiều lần vẫn đúng; sao chép bằng spread giữ since', () => {
    const rows = epochGate(epochGate([{ unlock: 5, since: 1 }]));
    const copy = epochGate([{ ...rows[0] }]);
    setContentEpoch(0);
    expect(rows[0].unlock).toBe(EPOCH_LOCKED);
    expect(copy[0].unlock).toBe(EPOCH_LOCKED);
  });

  it('nội dung gốc (kỷ nguyên 0) không dòng nào bị khoá ở kỷ nguyên 0', () => {
    setContentEpoch(0);
    for (const p of PRODUCTS) if (!p.since) expect(p.unlock, p.id).toBeLessThan(EPOCH_LOCKED);
    for (const r of RECIPES) if (!r.since) expect(r.unlock, r.id).toBeLessThan(EPOCH_LOCKED);
  });

  it('thành phẩm của công thức có since cũng phải có since (không thì golden vẫn thấy món trên kệ)', () => {
    for (const r of RECIPES) if (r.since) expect(productById(r.outputId).since, `${r.id}: ghi since ở dòng COOKED_PRODUCTS của ${r.outputId}`).toBe(r.since);
  });
});

async function golden(): Promise<Snap> {
  const { runEconomySim } = await import('../dev/simEconomy');
  setSimSeed(169);
  setContentEpoch(0);
  try {
    const { rows } = await runEconomySim(30, 3, { betTier: 1.5 });
    const s = useGame.getState();
    return { money: Math.round(s.money), level: s.level, xp: s.xp, profit: rows.map((r) => r.operationalProfit), quest: rows.map((r) => r.quest) };
  } finally {
    setContentEpoch(Infinity);
    clearSimSeed();
  }
}

describe('golden không thấy nội dung mới', () => {
  it('thêm món + công thức since:1 mở ở CẤP 1 (rẻ, lãi cao) → sim golden cấp 30 không đổi một đồng', { timeout: 600_000 }, async () => {
    const before = await golden();
    // Món giả cố ý hấp dẫn (nhập 1k bán 9k) và mở từ cấp 1: nếu lọt vào sim chắc chắn làm lệch số.
    const fakeGoods: Product = { id: '__epoch_goods', name: 'Món giả kỷ nguyên 1', category: 'dry', buy: 1000, sell: 9000, color: 0xffffff, unlock: 1, since: CONTENT_EPOCH_NOW };
    const fakeDish: Product = { id: '__epoch_dish', name: 'Món nấu giả kỷ nguyên 1', category: 'dry', buy: 1000, sell: 30000, color: 0xffffff, unlock: 1, since: CONTENT_EPOCH_NOW };
    const fakeRecipe: Recipe = { id: 'recipe___epoch', name: 'Món nấu giả kỷ nguyên 1', station: 'hot_kettle', inputs: [{ productId: 'mi', quantity: 1 }], outputId: '__epoch_dish', outputQty: 4, durationMin: 5, unlock: 1, reputationGain: 1, since: CONTENT_EPOCH_NOW };
    PRODUCTS.push(...epochGate([fakeGoods, fakeDish]));
    RECIPES.push(...epochGate([fakeRecipe]));
    RECIPE_MAP[fakeRecipe.id] = fakeRecipe;
    try {
      // Người chơi thật thấy món mới ngay cấp 1…
      expect(unlockedProducts(1).some((p) => p.id === '__epoch_goods')).toBe(true);
      // …còn sim golden thì không.
      const after = await golden();
      expect(after).toEqual(before);
    } finally {
      PRODUCTS.splice(PRODUCTS.indexOf(fakeGoods), 1);
      PRODUCTS.splice(PRODUCTS.indexOf(fakeDish), 1);
      RECIPES.splice(RECIPES.indexOf(fakeRecipe), 1);
      delete RECIPE_MAP[fakeRecipe.id];
    }
  });

  it('đối chứng: cùng món giả mà KHÔNG ghi since thì sim lệch (chứng tỏ test trên có nghĩa)', { timeout: 600_000 }, async () => {
    const before = await golden();
    const fake: Product = { id: '__epoch_goods0', name: 'Món giả không since', category: 'dry', buy: 1000, sell: 9000, color: 0xffffff, unlock: 1 };
    PRODUCTS.push(fake);
    try {
      expect(await golden()).not.toEqual(before);
    } finally {
      PRODUCTS.splice(PRODUCTS.indexOf(fake), 1);
    }
  });
});
