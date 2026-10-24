import { beforeEach, describe, expect, it } from 'vitest';
import { keepChance } from '../data/pricing';
import { ageLots, markdown, spoilRate, takeOldest } from '../data/freshness';
import { pickPayment } from '../data/payments';
import { COOKED_PRODUCT_IDS, RECIPES, STATIONS } from '../data/recipes';
import { productById, PRODUCTS } from '../data/products';
import { REGULARS } from '../data/regulars';
import { FURNITURE, isCookStation } from '../data/furniture';
import { supplierSells, SUPPLIERS } from '../data/suppliers';
import { STORY_STEPS, dailyQuests, emptyQuestLog, emptyTotals } from '../data/quests';
import { MARKET_MAX, MARKET_MIN, demandMul, nextMarketIndex, scarcityMul } from '../data/market';
import { rentOf } from '../data/shopTiers';
import { nearExpiryRefuseChance } from '../data/freshness';
import { newGameData, questContext, useGame } from '../core/store';

/** Bộ test nền cho các công thức kinh tế: chạy trước khi đổi bất kỳ con số cân bằng nào. */

describe('recipes — dữ liệu nấu ăn phải liền mạch với catalog', () => {
  it('mọi nguyên liệu và thành phẩm của mọi công thức đều là sản phẩm hợp lệ', () => {
    for (const r of RECIPES) {
      for (const i of r.inputs) expect(productById(i.productId), `${r.id} cần nguyên liệu "${i.productId}"`).toBeTruthy();
      expect(productById(r.outputId), `${r.id} cho ra "${r.outputId}"`).toBeTruthy();
    }
  });

  it('món nhà làm có trong PRODUCTS nhưng không nhập được ở nhà cung cấp nào', () => {
    for (const id of COOKED_PRODUCT_IDS) {
      expect(PRODUCTS.some((p) => p.id === id), id).toBe(true);
      for (const sup of SUPPLIERS) expect(supplierSells(sup, id), `${sup.id} không được bán ${id}`).toBe(false);
    }
  });

  it('mỗi trạm trong công thức đều có mục nội thất tương ứng (id trùng tên)', () => {
    for (const st of STATIONS) {
      expect(isCookStation(st.id), st.id).toBe(true);
      expect(FURNITURE.some((f) => f.type === st.id), st.id).toBe(true);
    }
    for (const r of RECIPES) expect(isCookStation(r.station), r.station).toBe(true);
  });
});

describe('keepChance — khách có lấy hàng khi giá cao không', () => {
  it('giá bằng hoặc rẻ hơn gợi ý: luôn lấy', () => {
    expect(keepChance('nuoc', 6000)).toBe(1);
    expect(keepChance('nuoc', 5000)).toBe(1);
  });
  it('đắt 10%: nước suối (nhạy 2.6) giảm sâu hơn gạo (nhạy 1.1)', () => {
    expect(keepChance('nuoc', 6600)).toBeCloseTo(1 - 2.6 * 0.1);
    expect(keepChance('gao', 110000)).toBeCloseTo(1 - 1.1 * 0.1);
  });
  it('khách nhạy giá thì giảm gấp; quá đắt thì chạm sàn 10%', () => {
    expect(keepChance('gao', 110000, 2)).toBeCloseTo(1 - 1.1 * 2 * 0.1);
    expect(keepChance('nuoc', 20000)).toBe(0.1);
  });
});

describe('tồn kho theo lô — FEFO và hao hụt', () => {
  it('takeOldest lấy lô cận hạn trước', () => {
    const [rest, taken] = takeOldest([{ qty: 5, life: 10 }, { qty: 5, life: 2 }], 3);
    expect(taken).toEqual([{ qty: 3, life: 2 }]);
    // Phần còn lại giữ thứ tự hạn ngắn trước
    expect(rest).toEqual([{ qty: 2, life: 2 }, { qty: 5, life: 10 }]);
  });
  it('spoilRate: tủ mát giữ hạn; đồ mát để kho hỏng gấp 2; rau trên quầy ngày nắng hỏng 1.3×, trong kho 1.95×', () => {
    expect(spoilRate('suachua', 'fridge', 'sunny')).toBe(1);
    expect(spoilRate('suachua', 'storage', 'cloudy')).toBe(2);
    expect(spoilRate('rau', 'produce', 'sunny')).toBeCloseTo(1.3);
    expect(spoilRate('rau', 'storage', 'sunny')).toBeCloseTo(1.95);
  });
  it('markdown cận hạn: còn 1 ngày giảm 50%, còn dài không giảm', () => {
    expect(markdown('sua', 1)).toBe(0.5);
    expect(markdown('sua', 30)).toBe(0);
  });
  it('ageLots tách phần hết hạn và trừ hạn phần còn', () => {
    const [kept, spoiled] = ageLots([{ qty: 4, life: 0.5 }, { qty: 3, life: 2 }], 1);
    expect(spoiled).toBe(4);
    expect(kept).toEqual([{ qty: 3, life: 1 }]);
  });
});

describe('pickPayment — khách chọn hình thức thanh toán', () => {
  it('đơn nhỏ ở cấp 1 chỉ có tiền mặt / chuyển khoản', () => {
    const picks = new Set(Array.from({ length: 50 }, (_, i) => pickPayment(10000, 1, () => i / 50)));
    expect([...picks].every((p) => p === 'cash' || p === 'bank')).toBe(true);
  });
  it('đơn lớn (≥150k): tiền mặt giảm thế, không tiền mặt tăng thế', () => {
    const counts: Record<string, number> = { cash: 0, bank: 0, wallet: 0, card: 0 };
    for (let i = 0; i < 2000; i++) counts[pickPayment(200000, 15, () => i / 2000)]++;
    expect(counts.cash / 2000).toBeLessThan(0.3);
    expect(counts.card + counts.wallet).toBeGreaterThan(0);
  });
});

describe('P2 — tiền nhà, giá thị trường, hàng cận hạn, khách quen', () => {
  it('rentOf: tiệm nhỏ nhẹ, lên siêu thị thì đáng kể', () => {
    expect(rentOf(0)).toBe(20000);
    expect(rentOf(1)).toBe(50000);
    expect(rentOf(2)).toBe(140000);
    expect(rentOf(4)).toBe(500000);
  });

  it('giá tham chiếu: khan hàng kéo lên, tồn nhiều kéo xuống, trôi tối đa 3%/ngày trong biên', () => {
    expect(scarcityMul(0)).toBe(1.08);
    expect(scarcityMul(8)).toBe(1.04);
    expect(scarcityMul(60)).toBe(0.96);
    expect(demandMul(5)).toBeCloseTo(1.1);
    expect(demandMul(0)).toBeCloseTo(0.95);
    // Hết hàng + cầu cao: nhích lên từng bước, không vọt quá biên
    let idx = 1;
    for (let i = 0; i < 40; i++) idx = nextMarketIndex(idx, 0, 0, 10);
    expect(idx).toBeLessThanOrEqual(1.08 * 1.1 + 0.001);
    expect(idx).toBeGreaterThan(MARKET_MIN);
    // Tồn rất nhiều + ít cầu: giảm dần nhưng không dưới sàn
    idx = 1;
    for (let i = 0; i < 40; i++) idx = nextMarketIndex(idx, 100, 0, 0);
    expect(idx).toBeGreaterThanOrEqual(MARKET_MIN);
    expect(idx).toBeLessThan(1);
  });

  it('hàng cận hạn: còn 1 ngày có bị một phần khách bỏ, còn dài thì không', () => {
    expect(nearExpiryRefuseChance(1, 'dry')).toBe(0.12);
    expect(nearExpiryRefuseChance(1, 'fresh')).toBe(0.2);
    expect(nearExpiryRefuseChance(2, 'fresh')).toBe(0);
  });

  it('khách quen mới: món ưa thích hợp lệ và đã mở ở cấp unlock của chính họ', () => {
    expect(REGULARS.length).toBe(28);
    for (const r of REGULARS) {
      const favs = r.favorites.filter((id) => productById(id).unlock <= r.unlock);
      expect(favs.length, `${r.id} cần món ưa thích mở được ở cấp ${r.unlock}`).toBeGreaterThan(0);
    }
  });

  it('nhiệm vụ ngày đổi theo ngữ cảnh: lễ → bán hàng của dịp, có lời hẹn → giữ đúng hẹn', () => {
    const base = {
      day: 10, level: 10, stats: newGameData().stats, totals: emptyTotals(), staffCount: 0,
      shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(), rent: 20000,
    };
    const usual = dailyQuests({ ...base, festivalGoods: [], reservationsToday: 0 });
    expect(usual.find((q) => q.id === 'daily_items')).toBeTruthy();
    const fest = dailyQuests({ ...base, festivalGoods: ['banh', 'keomut'], reservationsToday: 0 });
    const fq = fest.find((q) => q.id === 'daily_festival')!;
    expect(fq).toBeTruthy();
    expect(usual.find((q) => q.id === 'daily_items')).toBeTruthy();
    expect(fest.find((q) => q.id === 'daily_items')).toBeUndefined();
    const res = dailyQuests({ ...base, festivalGoods: [], reservationsToday: 2 });
    expect(res.find((q) => q.id === 'daily_reserve')?.target).toBe(2);
  });
});

describe('store — checkout, đếm quest và vòng nấu ăn', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(),
      speed: 1,
      minutes: 8 * 60,
      day: 10,
      level: 25,
      money: 10000000,
      // Một trạm ép mía để nấu được recipe_nuoc_mia (traicay 4 → nuoc_mia 6)
      furniture: [
        { uid: 1, type: 'sugarcane_press', x: -2, z: -2, rot: 0, tiers: [] },
        { uid: 2, type: 'shelf', x: 0.4, z: -2, rot: 0, tiers: [] },
      ],
      storage: { mia: 4 },
      storageLots: { mia: [{ qty: 2, life: 1 }, { qty: 2, life: 20 }] },
    });
  });

  it('checkout: phí theo hình thức, vốn theo giá nhập, sổ byMethod/byItem ghi đúng', () => {
    const before = useGame.getState().money;
    useGame.getState().checkout(
      [{ id: 'nuoc', price: 6000 }, { id: 'nuoc', price: 6000 }, { id: 'banh', price: 8000 }],
      0, 0, 'wallet',
    );
    const s = useGame.getState();
    const fee = Math.round(20000 * 0.01);
    expect(s.money - before).toBe(20000 - fee);
    expect(s.stats.fees).toBe(fee);
    expect(s.stats.byMethod?.wallet).toEqual({ revenue: 20000, count: 1 });
    expect(s.stats.byItem?.nuoc).toEqual({ qty: 2, revenue: 12000, cost: 8000 });
    expect(s.totals.revenue).toBe(20000);
  });

  it('startCook: trừ nguyên liệu FEFO, đủ điều kiện mới nấu; trạm bận thì từ chối', () => {
    const s = useGame.getState();
    expect(s.startCook('recipe_nuoc_mia')).toBe(true);
    let after = useGame.getState();
    expect(after.cookJobs).toHaveLength(1);
    expect(after.storage.mia).toBe(0);
    expect(after.storageLots.mia).toEqual([]);
    // Một trạm chỉ nấu một mẻ một lúc
    useGame.setState({ storage: { mia: 4 }, storageLots: { mia: [{ qty: 4, life: 9 }] } });
    expect(useGame.getState().startCook('recipe_nuoc_mia')).toBe(false);
  });

  it('tick đủ phút game thì mẻ xong: thành phẩm vào kho, tiền không đổi', () => {
    useGame.getState().startCook('recipe_nuoc_mia');
    const before = useGame.getState().money;
    // recipe_nuoc_mia mất 6 phút game; 1 giây thật = 2 phút game ở 1×
    useGame.getState().tick(3);
    const s = useGame.getState();
    expect(s.cookJobs).toHaveLength(0);
    expect(s.storage.nuoc_mia).toBe(10);
    expect(s.money).toBe(before);
  });

  it('reservation: giữ đúng hẹn khách mừng (+thân thiết, xoá hẹn), hẹn mà không mua được thì phật ý', () => {
    const def = REGULARS[0];
    const fav = def.favorites[0];
    // Đủ thân và có lời hẹn hôm nay
    useGame.setState({
      regulars: { [def.id]: { friendship: 10, visits: 5, perks: [], discovered: [fav] } },
      reservations: { [def.id]: { productId: fav, qty: 1, day: 10 } },
    });
    useGame.getState().regularVisit(def.id, [{ id: fav, price: 1000 }], true);
    let s = useGame.getState();
    // +2 mua đúng món thích, +2 giữ đúng hẹn
    expect(s.regulars[def.id].friendship).toBe(14);
    expect(s.reservations[def.id]).toBeUndefined();
    // Hẹn mà không mua được món đó: −2 (thân thiết trong ngày đã tính một lần rồi nên chỉ mất phần hẹn)
    useGame.setState({ reservations: { [def.id]: { productId: fav, qty: 2, day: 10 } } });
    useGame.getState().regularVisit(def.id, [{ id: 'nuoc', price: 6000 }], true);
    s = useGame.getState();
    expect(s.regulars[def.id].friendship).toBe(12);
  });

  it('quest đo đúng chỉ số: hợp đồng đếm contractsDone, review 5 sao đếm fiveStars, mua hàng đếm spent', async () => {
    const s = useGame.getState();
    // Giao một kỳ hợp đồng trực tiếp (bỏ qua cổng danh tiếng)
    const { SUPPLY_CONTRACTS } = await import('../data/contracts');
    const def = SUPPLY_CONTRACTS[0];
    useGame.setState({
      contracts: { [def.id]: { defId: def.id, dueDay: 10, delivered: 0, pending: true } },
      storage: { ...def.items },
    });
    expect(useGame.getState().deliverContract(def.id)).toBe(true);
    useGame.getState().addReview(5);
    useGame.getState().addReview(4);
    useGame.getState().buy('nuoc', 10);
    const ctx = questContext(useGame.getState());
    expect(STORY_STEPS.find((x) => x.id === 'story_first_contract')!.measure(ctx)).toBe(ctx.totals.contractsDone);
    expect(ctx.totals.contractsDone).toBe(1);
    expect(ctx.totals.fiveStars).toBe(1);
    expect(ctx.totals.spent).toBe(productById('nuoc').buy * 10);
  });
});
