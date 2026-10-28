import { describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { dailyQuests, emptyQuestLog, emptyTotals, type QuestContext } from '../data/quests';
import { newGarden } from '../data/garden';
import { newOnline } from '../data/online';
import { newSocial } from '../data/social';
import { COOK_ORDER_MUL } from '../data/phoneOrders';

/** Bộ test nhiệm vụ ngày đa dạng: hệ phụ vào pool xoay vòng theo ngày, counter ngày đo đúng hành động thật. */

// Thứ tự pool tuỳ chọn trong dailyQuests — test xoay vòng đối chiếu đúng thứ tự này
const OPTIONAL_POOL = ['daily_services', 'daily_combo', 'daily_cooked', 'daily_online', 'daily_farm', 'daily_social', 'daily_cook_orders'];
// Ba nhiệm vụ luôn hiện cố định (nhiệm vụ giữa đổi theo lễ/lời hẹn nên xét riêng)
const ALWAYS_IDS = ['daily_customers', 'daily_revenue', 'daily_smile'];

/** Ngữ cảnh nhiệm vụ dựng tay, thống kê ngày lấy mới (đúng như endDay dựng mỗi sáng). */
const ctxAt = (day: number, level: number, stats = newGameData().stats): QuestContext => ({
  day, level, stats, totals: emptyTotals(), staffCount: 0, shopTier: 0, warehouseTier: 0,
  ordersDone: 0, log: emptyQuestLog(), festivalGoods: [], reservationsToday: 0, rent: 20000,
});

const optionalIds = (c: QuestContext) => dailyQuests(c).map((q) => q.id).filter((id) => OPTIONAL_POOL.includes(id));

describe('xoay vòng nhiệm vụ ngày', () => {
  it('cấp 1: chỉ 4 nhiệm vụ luôn hiện, chưa có nhiệm vụ hệ phụ nào', () => {
    const quests = dailyQuests(ctxAt(1, 1));
    expect(quests).toHaveLength(4);
    const ids = quests.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining([...ALWAYS_IDS, 'daily_items']));
    for (const id of OPTIONAL_POOL) expect(ids).not.toContain(id);
  });

  it('cấp 30: đủ pool 7 mục, không quá 7 nhiệm vụ, 3 mục tuỳ chọn đúng công thức xoay theo ngày', () => {
    for (const day of [1, 5, 8, 21, 30]) {
      const quests = dailyQuests(ctxAt(day, 30));
      expect(quests.length).toBeLessThanOrEqual(7);
      // start = ngày % độ dài pool, lấy 3 mục kế tiếp vòng tròn
      const start = day % OPTIONAL_POOL.length;
      const expected = [0, 1, 2].map((i) => OPTIONAL_POOL[(start + i) % OPTIONAL_POOL.length]);
      expect(optionalIds(ctxAt(day, 30))).toEqual(expected);
    }
  });

  it('ngày khác nhau thì tổ hợp tuỳ chọn khác nhau (pool ≥ 4 mục)', () => {
    const combos = new Set([1, 2, 3, 4, 5, 6, 7].map((d) => optionalIds(ctxAt(d, 30)).join(',')));
    expect(combos.size).toBe(7);
  });
});

describe('counter ngày tăng theo hành động thật', () => {
  it('giao đơn app tới tay khách: stats.onlineDone tăng', () => {
    useGame.setState({ ...newGameData(), day: 3, level: 20, money: 500000, storage: { mi: 10 }, shopOpen: true, minutes: 600 });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 99999, orders: [{ id: 1, customer: 'A', items: { mi: 3 }, km: 2, placedAt: 600, dueAt: 700, status: 'new' }] } });
    expect(useGame.getState().acceptOnline(1, 'grab')).toBe(true);
    const carrying = useGame.getState().online.orders[0];
    useGame.setState({ minutes: carrying.arriveAt! });
    useGame.getState().tick(0);
    const s = useGame.getState();
    expect(s.online.done).toBe(1);
    expect(s.stats.onlineDone).toBe(1);
  });

  it('giao đơn nấu giá hời: stats.cookOrders tăng cùng totals.cookOrdersDone', () => {
    useGame.setState({
      ...newGameData(), day: 10, level: 25, money: 5000000, minutes: 600,
      furniture: [{ uid: 1, type: 'sugarcane_press', x: -2, z: -2, rot: 0, tiers: [] } as Furniture],
      phoneOrders: [{
        id: 7, houseId: 'nha_12', caller: 'Cô Hạnh', reason: 'đơn nấu', items: { nuoc_mia: 5 },
        calledAt: 500, answerBy: 520, dueAt: 900, status: 'ringing', premium: COOK_ORDER_MUL,
      }],
      storage: { mi: 10, nuoc: 10, banh: 5, nuoc_mia: 5 },
    });
    expect(useGame.getState().answerPhone(7)).toBe(true);
    expect(useGame.getState().deliverPhone(7)).toBe(true);
    const s = useGame.getState();
    expect(s.stats.cookOrders).toBe(1);
    expect(s.totals.cookOrdersDone).toBe(1);
  });

  it('thu hoạch luống chín: stats.farmHarvest tăng đúng số sản phẩm vào kho', () => {
    useGame.setState({ ...newGameData(), day: 5, level: 12, garden: { ...newGarden(), plots: [{ crop: 'rau_cai', growth: 3, wateredDay: 5 }] } });
    useGame.getState().harvestPlot(0);
    const s = useGame.getState();
    expect(s.storage.rau).toBe(8); // rau_cai cho 8 sản phẩm, không có bù nhìn thì đúng 8
    expect(s.stats.farmHarvest).toBe(8);
  });

  it('đăng bài quảng bá: stats.socialPosts tăng, mỗi ngày chỉ tính một bài', () => {
    useGame.setState({ ...newGameData(), day: 9, level: 12, social: { ...newSocial(), followers: 500 } });
    useGame.getState().promoteShop();
    expect(useGame.getState().stats.socialPosts).toBe(1);
    expect(useGame.getState().social.promoDay).toBe(9);
    useGame.getState().promoteShop(); // đăng lần nữa bị chặn — counter không tăng
    expect(useGame.getState().stats.socialPosts).toBe(1);
  });
});

describe('daily_farm hoàn thành theo số thu hoạch', () => {
  it('stats.farmHarvest đạt mục tiêu thì nhiệm vụ done, thiếu một đơn vị thì chưa (ctx dựng tay)', () => {
    const hit = dailyQuests(ctxAt(10, 8, { ...newGameData().stats, farmHarvest: 9999 }));
    const farm = hit.find((q) => q.id === 'daily_farm');
    expect(farm).toBeTruthy(); // cấp 8, ngày 10: trại nằm trong 3 mục được xoay tới
    expect(farm!.done).toBe(true);
    expect(farm!.current).toBe(farm!.target);
    const short = dailyQuests(ctxAt(10, 8, { ...newGameData().stats, farmHarvest: farm!.target - 1 }));
    const farmShort = short.find((q) => q.id === 'daily_farm')!;
    expect(farmShort.done).toBe(false);
    expect(farmShort.current).toBe(farm!.target - 1);
  });
});
