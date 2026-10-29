import { describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { dailyQuests, emptyQuestLog, emptyTotals, type QuestContext } from '../data/quests';
import { newGarden } from '../data/garden';
import { newOnline } from '../data/online';
import { newSocial } from '../data/social';
import { COOK_ORDER_MUL } from '../data/phoneOrders';

/** Bộ test nhiệm vụ ngày đa dạng: hệ phụ vào pool xoay vòng theo ngày, counter ngày đo đúng hành động thật. */

// Thứ tự pool tuỳ chọn LUÔN hiện trong dailyQuests — test xoay vòng đối chiếu đúng thứ tự này.
// GĐ160 thêm daily_morning (mở từ cấp 1, luôn trong pool); daily_rain / daily_regulars là biến thể
// theo hoàn cảnh (chỉ ngày mưa / ngày có khách quen hẹn ghé — test riêng ở newbieQuests.test.ts,
// ở đây ctx không có weather/regulars nên ẩn, không thuộc pool xoay tĩnh).
const OPTIONAL_POOL = ['daily_services', 'daily_combo', 'daily_cooked', 'daily_online', 'daily_farm', 'daily_social', 'daily_cook_orders', 'daily_morning'];
// GĐ254: "Cuối tuần ăn vặt" chỉ vào pool ngày Thứ 7/CN — ngày thường xoay đúng 8 mục dưới đây.
const WEEKEND_QUEST = 'daily_weekend';
// Ba nhiệm vụ luôn hiện cố định (nhiệm vụ giữa đổi theo lễ/lời hẹn nên xét riêng)
const ALWAYS_IDS = ['daily_customers', 'daily_revenue', 'daily_smile'];
// Việc tuỳ chọn KHÔNG mở ở cấp 1 (cần dịch vụ/combo/trại/online/nấu — unlock 3+)
const LOCKED_AT_LV1 = ['daily_services', 'daily_combo', 'daily_cooked', 'daily_online', 'daily_farm', 'daily_social', 'daily_cook_orders'];

/** Ngữ cảnh nhiệm vụ dựng tay, thống kê ngày lấy mới (đúng như endDay dựng mỗi sáng). */
const ctxAt = (day: number, level: number, stats = newGameData().stats): QuestContext => ({
  day, level, stats, totals: emptyTotals(), staffCount: 0, shopTier: 0, warehouseTier: 0,
  ordersDone: 0, log: emptyQuestLog(), festivalGoods: [], reservationsToday: 0, rent: 20000,
});

const optionalIds = (c: QuestContext) => dailyQuests(c).map((q) => q.id).filter((id) => OPTIONAL_POOL.includes(id));

describe('xoay vòng nhiệm vụ ngày', () => {
  it('cấp 1: 4 nhiệm vụ luôn hiện + pool tuỳ chọn KHÔNG còn rỗng (GĐ160: daily_morning mở từ cấp 1)', () => {
    const quests = dailyQuests(ctxAt(1, 1));
    const ids = quests.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining([...ALWAYS_IDS, 'daily_items', 'daily_morning']));
    for (const id of LOCKED_AT_LV1) expect(ids).not.toContain(id);
    // Cấp 1 chưa có biến thể hoàn cảnh (không mưa, chưa biết khách quen nào ghé) → đúng 5 việc
    expect(quests).toHaveLength(5);
  });

  it('cấp 30: đủ pool 8 mục (cuối tuần 9), không quá 7 nhiệm vụ, 3 mục tuỳ chọn đúng công thức xoay theo ngày', () => {
    for (const day of [1, 5, 8, 21, 30]) {
      const quests = dailyQuests(ctxAt(day, 30));
      expect(quests.length).toBeLessThanOrEqual(7);
      // Pool ngày = 8 mục thường (+ weekend quest khi Thứ 7/CN); start = ngày % độ dài pool
      const pool = isWeekend(day) ? [...OPTIONAL_POOL, WEEKEND_QUEST] : OPTIONAL_POOL;
      const start = day % pool.length;
      const expected = [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
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

// ── GĐ254 — biến thể CUỐI TUẦN: Thứ 7/CN có thêm nhiệm vụ "Cuối tuần ăn vặt" ──
import { gameDayOfDoy, isWeekend, dayOfYear, weekdayOf } from '../data/calendar';
import { productById, WEEKEND_SNACKS } from '../data/products';
import { SEASONAL_GOODS } from '../data/calendar';
import type { DayStats } from '../core/store';

describe('biến thể cuối tuần (GĐ254)', () => {
  it('weekdayOf: ngày 1 = Thứ 2, Thứ 7/CN cuối tuần, lặp theo khối 7 ngày trùng nhịp tuần cũ', () => {
    expect(weekdayOf(1)).toBe('Thứ 2');
    expect(weekdayOf(6)).toBe('Thứ 7');
    expect(weekdayOf(7)).toBe('Chủ nhật');
    expect(weekdayOf(8)).toBe('Thứ 2');
    expect([6, 7, 13, 14].every(isWeekend)).toBe(true);
    expect([1, 5, 8, 30].some(isWeekend)).toBe(false);
  });

  it('cuối tuần pool thêm "Cuối tuần ăn vặt" cả cấp thấp; ngày thường không có', () => {
    expect(dailyQuests(ctxAt(1, 1)).map((q) => q.id)).not.toContain('daily_weekend');
    for (const d of [6, 7, 13]) {
      const qs = dailyQuests(ctxAt(d, 1));
      expect(qs.map((q) => q.id)).toContain('daily_weekend');
      expect(qs).toHaveLength(6); // 5 việc ngày thường + biến thể cuối tuần
    }
  });

  it('nhóm ăn vặt cuối tuần toàn món THẬT trong bảng hàng, dùng chung quest + khách (GĐ255)', () => {
    expect(WEEKEND_SNACKS.length).toBeGreaterThan(0);
    for (const id of WEEKEND_SNACKS) {
      const p = productById(id);
      expect(p).toBeTruthy();
      expect(p.unlock).toBeLessThanOrEqual(15); // nhóm có mặt từ sớm, mở dần theo cấp
    }
    // không trùng lặp
    expect(new Set(WEEKEND_SNACKS).size).toBe(WEEKEND_SNACKS.length);
  });

  it('counter đếm đúng NHÓM món ăn vặt (không tính món ngoài nhóm)', () => {
    const stats = {
      ...newGameData().stats,
      byItem: { mi: { qty: 3, revenue: 0, cost: 0 }, banh: { qty: 2, revenue: 0, cost: 0 }, giay: { qty: 5, revenue: 0, cost: 0 } },
    } as DayStats;
    const qs = dailyQuests(ctxAt(6, 1, stats));
    const w = qs.find((q) => q.id === 'daily_weekend')!;
    expect(w.current).toBe(5); // mì 3 + bánh 2, giấy vệ sinh không thuộc nhóm ăn vặt
    expect(w.target).toBe(6);
    expect(w.title).toBe('Cuối tuần ăn vặt');
  });
});

describe('lịch cả năm biết ô nào cuối tuần (GĐ256)', () => {
  it('gameDayOfDoy đảo đúng của dayOfYear; ô lịch giữ đúng thứ của ngày chơi', () => {
    expect(gameDayOfDoy(dayOfYear(1))).toBe(1);
    expect(gameDayOfDoy(dayOfYear(34))).toBe(34);
    expect(gameDayOfDoy(dayOfYear(365))).toBe(365);
    // ô của ngày 34 (Thứ 7) phải được đánh dấu cuối tuần qua nghịch đảo
    expect(isWeekend(gameDayOfDoy(dayOfYear(34)))).toBe(true);
    expect(isWeekend(gameDayOfDoy(dayOfYear(31)))).toBe(false);
  });
});

describe('nhất quán nhịp tuần × thứ (GĐ263 — khoá hệ cuối tuần với các nhịp 7 ngày cũ)', () => {
  it('mọi khối tuần [7k+1..7k+7] luôn bắt đầu Thứ 2, kết thúc Chủ nhật; thử thách tuần (ceil(day/7)) và chợ phiên (floor((day-1)/7)) cùng khối', () => {
    for (let day = 1; day <= 365; day++) {
      const blockStart = day - ((day - 1) % 7); // 1, 8, 15, …
      const blockEnd = blockStart + 6;
      expect(weekdayOf(blockStart)).toBe('Thứ 2');
      expect(weekdayOf(blockEnd)).toBe('Chủ nhật');
      expect(isWeekend(blockStart)).toBe(false);
      expect(isWeekend(blockEnd)).toBe(true);
      // cả tuần thử thách (ceil) lẫn tuần chợ phiên/sỉ (floor 0-based) chia đúng khối này
      const ceilWeek = Math.ceil(day / 7);
      const floorWeek = Math.floor((day - 1) / 7);
      expect(Math.ceil(blockEnd / 7)).toBe(ceilWeek);
      expect(Math.ceil(blockStart / 7)).toBe(ceilWeek);
      expect(floorWeek).toBe(ceilWeek - 1);
      // giữa tuần không phải cuối tuần: chỉ 2 ngày cuối khối là Thứ 7/CN
      if (day - blockStart < 5) expect(isWeekend(day)).toBe(false);
    }
  });
});

describe('bất biến nhóm ăn vặt cuối tuần (GĐ263)', () => {
  it('WEEKEND_SNACKS không chứa hàng mùa lễ (SEASONAL_GOODS) — nhánh chooseWants cuối tuần không cần lọc off-season', () => {
    for (const id of WEEKEND_SNACKS) expect(SEASONAL_GOODS.has(id)).toBe(false);
  });
});
