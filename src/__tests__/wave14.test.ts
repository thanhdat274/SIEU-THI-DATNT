import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { bizEndOfDay, achievementCtx } from '../core/biz';
import { ACHIEVEMENTS, inspectionResult, INSPECTION_EVERY, INSPECTION_FINE, INSPECTION_REWARD, newBiz } from '../data/biz';
import { productById } from '../data/products';

/** Bộ test đợt 14 — thành tựu cho tính năng mới, tủ hỏng mất lạnh, thanh tra định kỳ, tên tiệm. */

describe('thành tựu gắn với đợt 13', () => {
  it('đủ 3 thành tựu mới và đo đúng counter', () => {
    const ids = ['impulse_100', 'cook_orders_10', 'counter_kill'];
    for (const id of ids) expect(ACHIEVEMENTS.some((a) => a.id === id), id).toBe(true);
    const ctx = { ...achievementCtx(useGame.getState()), impulseSold: 100, cookOrdersDone: 10, counterKills: 1 };
    expect(ACHIEVEMENTS.find((a) => a.id === 'impulse_100')!.done(ctx)).toBe(true);
    expect(ACHIEVEMENTS.find((a) => a.id === 'cook_orders_10')!.done(ctx)).toBe(true);
    expect(ACHIEVEMENTS.find((a) => a.id === 'counter_kill')!.done(ctx)).toBe(true);
    // Chưa đạt thì false
    expect(ACHIEVEMENTS.find((a) => a.id === 'impulse_100')!.done({ ...ctx, impulseSold: 99 })).toBe(false);
  });

  it('achievementCtx đọc counter từ totals và biz', () => {
    useGame.setState({
      ...newGameData(),
      totals: { ...newGameData().totals, impulseSold: 7, cookOrdersDone: 3 },
      biz: { ...newBiz(), counterKills: 2 },
    });
    const ctx = achievementCtx(useGame.getState());
    expect(ctx.impulseSold).toBe(7);
    expect(ctx.cookOrdersDone).toBe(3);
    expect(ctx.counterKills).toBe(2);
  });

  it('đòn phản công kết liễu đối thủ thì counterKills +1 (đối thủ tự chết thì không)', () => {
    const rand = Math.random;
    Math.random = () => 0.99; // không sale tự phát, không trả đũa
    const base = () => {
      const s = useGame.getState();
      return { ...s, biz: { ...newBiz(), rival: { name: 'X', strength: 5, openedDay: 1 }, counter: { tactic: 'ad' as const, day: s.day } } };
    };
    useGame.setState({ ...newGameData(), day: 10, level: 10 });
    const out = bizEndOfDay(base(), { revenue: 0, spent: 0, wages: 0, itemsSold: 40, customers: 5, unhappy: 0, xp: 0 });
    Math.random = rand;
    expect(out.biz.rival).toBeNull();
    expect(out.biz.counterKills).toBe(1);
    // Không có đợt phản công: 5★ đánh giá tốt khiến đối thủ yếu kiệt tự đóng cửa — không tính counterKill
    const fiveStars = { id: 1, day: 10, minute: 1, stars: 5, author: 'A', text: 't' };
    useGame.setState({ ...newGameData(), day: 10, level: 10, reviews: [fiveStars, { ...fiveStars, id: 2 }, { ...fiveStars, id: 3 }] });
    Math.random = () => 0.99;
    const out2 = bizEndOfDay({ ...useGame.getState(), biz: { ...newBiz(), rival: { name: 'X', strength: 1, openedDay: 1 } } }, { revenue: 0, spent: 0, wages: 0, itemsSold: 40, customers: 5, unhappy: 0, xp: 0 });
    Math.random = rand;
    expect(out2.biz.rival).toBeNull();
    expect(out2.biz.rivalsBeaten).toBe(1);
    expect(out2.biz.counterKills).toBe(0);
  });
});

describe('tủ mát hỏng — mất lạnh, hàng hỏng nhanh như để kho', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), day: 10, level: 20, minutes: 19 * 60, weather: 'sunny', autoSwap: false,
      furniture: [
        // Tủ mát hỏng còn 2 sữa chua (còn 2 ngày): qua đêm theo hệ số "kho" (2) → hỏng cả lô
        { uid: 1, type: 'fridge', x: 2, z: 1, rot: 0, broken: true, tiers: [{ productId: 'suachua', count: 2, lots: [{ qty: 2, life: 2 }] }] },
        // Tủ mát tốt y hệt: giữ lạnh (hệ số 1) → còn 1 ngày hạn, hàng sống qua đêm
        { uid: 2, type: 'fridge', x: 3, z: 1, rot: 0, wear: 10, tiers: [{ productId: 'suachua', count: 2, lots: [{ qty: 2, life: 2 }] }] },
      ] as Furniture[],
    });
  });
  it('qua đêm: tủ hỏng mất hết hàng mát, tủ tốt giữ được', () => {
    useGame.getState().sleep();
    const s = useGame.getState();
    const broken = s.furniture.find((f) => f.uid === 1)!;
    const intact = s.furniture.find((f) => f.uid === 2)!;
    expect(broken.tiers[0].count).toBe(0);
    expect(intact.tiers[0].count).toBe(2);
    expect(intact.tiers[0].lots?.[0].life).toBe(1);
  });
});

describe('thanh tra thị trường định kỳ', () => {
  it('đạt 4/4: thưởng; hỏng 2 tiêu chí: không đạt, phạt', () => {
    const good = inspectionResult({ dirt: 10, nearExpiryOnShelves: 0, priceIndex: 1, rating: 4.6 });
    expect(good.pass).toBe(true);
    expect(good.score).toBe(4);
    expect(good.notes).toHaveLength(4);
    expect(good.notes.every((n) => n.startsWith('✅'))).toBe(true);
    const bad = inspectionResult({ dirt: 70, nearExpiryOnShelves: 12, priceIndex: 1.4, rating: 4.5 });
    expect(bad.pass).toBe(false);
    expect(bad.score).toBe(1);
    expect(bad.notes.some((n) => n.startsWith('❌'))).toBe(true);
  });
  it('ngày đúng chu kỳ thì tiền két phản ánh thưởng/phạt', () => {
    // Ngày 14, cấp 12: thanh tra chạy; tiệm giá tốt sao tốt nhưng đang bẩn (1 tiêu chí hỏng → vẫn đạt)
    const five = { id: 1, day: 14, minute: 1, stars: 5, author: 'A', text: 't' };
    useGame.setState({
      ...newGameData(), day: 14, level: 12, minutes: 19 * 60, dirt: 60,
      prices: {}, reviews: [five, { ...five, id: 2 }, { ...five, id: 3 }],
    });
    const before = useGame.getState().money;
    useGame.getState().sleep();
    const s = useGame.getState();
    // Bẩn 60 (>30) là tiêu chí duy nhất hỏng → 3/4 vẫn ĐẠT: +thưởng (trừ tiền nhà 20k của bậc 0)
    expect(s.money - before).toBe(INSPECTION_REWARD - 20000);
    expect(s.day).toBe(15);
  });
});

describe('tên tiệm', () => {
  it('đổi tên được, rỗng thì về mặc định, cắt ngắn quá 24 ký tự', () => {
    useGame.setState({ ...newGameData() });
    useGame.getState().setShopName('Tạp Hóa Bà Năm');
    expect(useGame.getState().shopName).toBe('Tạp Hóa Bà Năm');
    useGame.getState().setShopName('   ');
    expect(useGame.getState().shopName).toBe('Tạp Hóa Đầu Ngõ');
    useGame.getState().setShopName('X'.repeat(40));
    expect(useGame.getState().shopName.length).toBe(24);
  });
});

describe('vá nốt nguyên văn đề xuất Nhóm A', () => {
  it('đơn tiệc có món nhà làm: 3 đơn mới mở sau cấp bếp, nguyên liệu đều là món hợp lệ', async () => {
    const { PARTY_ORDERS } = await import('../data/orders');
    const { COOKED_PRODUCT_IDS } = await import('../data/recipes');
    const cookedOrders = PARTY_ORDERS.filter((o) => Object.keys(o.items).some((id) => COOKED_PRODUCT_IDS.has(id)));
    expect(cookedOrders.length).toBeGreaterThanOrEqual(3);
    for (const o of cookedOrders) {
      expect(o.unlock, `${o.id} chỉ mời khi đã có bếp`).toBeGreaterThanOrEqual(21);
      for (const [id, qty] of Object.entries(o.items)) {
        expect(productById(id), `${o.id} dùng "${id}"`).toBeTruthy();
        expect(qty).toBeGreaterThan(0);
      }
    }
  });

  it('giao được đơn tiệc món nhà làm: nấu xong để kho rồi giao như thường', () => {
    useGame.setState({
      ...newGameData(), day: 10, level: 26, money: 1000000,
      order: { id: 'sn_trang', accepted: true, dueDay: 11 },
      storage: { tra_sua: 8, banh_mi_trung_nuong: 6 },
      storageLots: {},
    });
    const before = useGame.getState().money;
    expect(useGame.getState().deliverOrder()).toBe(true);
    const s = useGame.getState();
    expect(s.order).toBeNull();
    expect(s.ordersDone).toBe(1);
    // Tiền = giá bán từng món + thưởng đơn
    const pay = 18600 * 8 + 24700 * 6 + 180000;
    expect(s.money - before).toBe(pay);
  });

  it('đối đầu nhiều ngày liền: đòn nặng thêm mỗi ngày, chặn ở +3', () => {
    const rand = Math.random;
    Math.random = () => 0.99; // không sale tự phát, không trả đũa
    const run = (day: number, lastDay?: number, streak?: number) => {
      const s = useGame.getState();
      const base = { ...newBiz(), rival: { name: 'X', strength: 80, openedDay: 1 }, counter: { tactic: 'ad' as const, day }, counterLastDay: lastDay, counterStreak: streak };
      const out = bizEndOfDay({ ...s, day, level: 10, biz: base }, { revenue: 0, spent: 0, wages: 0, itemsSold: 40, customers: 5, unhappy: 0, xp: 0 });
      return { strength: out.biz.rival!.strength, streak: out.biz.counterStreak ?? 0, lastDay: out.biz.counterLastDay };
    };
    useGame.setState({ ...newGameData() });
    const d1 = run(10); // ngày đầu: hit 6
    expect(d1.streak).toBe(1);
    expect(d1.strength).toBe(80 + 1 - 6);
    const d2 = run(11, d1.lastDay, d1.streak); // ngày 2 liền: hit 6+1
    expect(d2.streak).toBe(2);
    expect(d2.strength).toBe(80 + 1 - 7);
    const d5 = run(14, 13, 6); // chuỗi dài: bonus chặn ở +3
    expect(d5.streak).toBe(7);
    expect(d5.strength).toBe(80 + 1 - 9);
    const gap = run(20, 18, 3); // nghỉ 1 ngày → chuỗi reset về 1
    expect(gap.streak).toBe(1);
    Math.random = rand;
  });
});
