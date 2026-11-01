import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { newGarden, makeFarmOrder, FARM_ORDER_UNLOCK, FARM_ORDER_DAYS } from '../data/garden';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, WRITE_OFF_FRIEND_LOSS } from '../data/credit';
import { PHONE_FRIEND_GAIN } from '../data/phoneOrders';

/**
 * GĐ666 — coverage sweep: đường nối trong chốt ngày (endDay) chưa test nào chạm tới dù
 * từng mảnh (farmhandChores, gardenNight, makeFarmOrder) đã unit-test ở farm.test.ts.
 * Khoá đúng các bước TRỘN vào đêm qua sleep(): phụ trại nộp kho, đơn trại quá hạn,
 * sổ nợ quỵt/nhắc, đơn gọi điện đang mang bị trả về kho.
 */

const g = () => useGame.getState();
const DAY = 10;

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  useGame.setState({
    ...newGameData(),
    day: DAY,
    level: Math.max(20, FARM_ORDER_UNLOCK),
    money: 10_000_000,
    minutes: 20 * 60,
    notify: () => {},
  });
});
afterEach(() => vi.restoreAllMocks());

const news = () => g().lastSummary?.news ?? [];

describe('chốt ngày: phụ trại lo trại hộ qua đêm', () => {
  it('tưới luống khô, đổ cám từ kho cho gà đói, gom trứng đủ vỉ về kho, tin 🧑‍🌾 vào news đêm', () => {
    const garden = newGarden();
    garden.plots[0] = { crop: 'rau_cai', growth: 1, wateredDay: 0 }; // khô, chưa đủ chín
    garden.pens.chicken = { count: 4, feedKg: 0, fedDay: 0, pending: 25 };
    useGame.setState({
      garden,
      storage: { ...g().storage, cam_ga: 5 },
      staff: [{ id: 1, name: 'Bé Tư', role: 'farmhand', skill: 1, wage: 0, shift: 'full' } as never],
    });
    const camBefore = g().storage.cam_ga;
    expect(g().sleep()).toBe(true);
    const after = g();
    // 25 trứng gà → 2 vỉ (mỗi vỉ 10) về kho; gà ăn 1 bao cám
    expect(after.storage.trung).toBeGreaterThanOrEqual(2);
    expect(after.storage.cam_ga).toBeLessThan(camBefore);
    const line = news().find((n) => n.includes('🧑‍🌾'));
    expect(line).toBeTruthy();
    expect(line!).toContain('tưới');
    expect(line!).toContain('Bé Tư');
  });

  it('không có phụ trại: không có tin 🧑‍🌾, gà đói nhịn nếu kho hết cám', () => {
    const garden = newGarden();
    garden.pens.chicken = { count: 4, feedKg: 0, fedDay: 0, pending: 25 };
    useGame.setState({ garden, storage: { ...g().storage, cam_ga: 0 } });
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.includes('🧑‍🌾'))).toBe(false);
    const line = news().find((n) => n.includes('đói không ra sản phẩm'));
    expect(line).toBeTruthy(); // farmhand không có nhưng gardenNight vẫn báo chuồng đói
  });
});

describe('chốt ngày: đơn nông sản của quán xóm', () => {
  it('quá hạn bị huỷ kèm tin; lập đơn mới giao ngày mai', () => {
    useGame.setState({ garden: { ...newGarden(), farmOrder: makeFarmOrder(DAY - 3) } });
    expect(g().sleep()).toBe(true);
    const after = g();
    expect(after.garden.farmOrder).not.toBeNull();
    // đơn mới lập cho ngày mai: dueDay = (day+1) + FARM_ORDER_DAYS
    expect(after.garden.farmOrder!.dueDay).toBe(DAY + 1 + FARM_ORDER_DAYS);
    expect(news().some((n) => n.includes('huỷ đơn nông sản quá hạn'))).toBe(true);
    expect(news().some((n) => n.includes('đặt mua nông sản'))).toBe(true);
  });

  it('chưa đủ cấp mở đơn trại: quá hạn huỷ nhưng không lập đơn mới', () => {
    useGame.setState({ level: FARM_ORDER_UNLOCK - 1, garden: { ...newGarden(), farmOrder: makeFarmOrder(DAY - 3) } });
    expect(g().sleep()).toBe(true);
    expect(g().garden.farmOrder).toBeNull();
    expect(news().some((n) => n.includes('huỷ đơn nông sản quá hạn'))).toBe(true);
    expect(news().some((n) => n.includes('đặt mua nông sản'))).toBe(false);
  });
});

describe('chốt ngày: sổ nợ khách quen', () => {
  it('nợ quá ' + DEBT_WRITE_OFF_DAYS + ' ngày: xoá nợ, mất thân thiết, tin quỵt nợ; nợ vừa muộn được nhắc nhưng giữ', () => {
    useGame.setState({
      debts: {
        ba_nam: { amount: 50_000, since: DAY - DEBT_WRITE_OFF_DAYS }, // tuổi 15 > 14 → quỵt
        chu_ba: { amount: 30_000, since: DAY - DEBT_LATE_DAYS },      // tuổi 8 = muộn+1 → nhắc
      },
      regulars: {
        ...newGameData().regulars,
        ba_nam: { friendship: 20, visits: 3, perks: [], discovered: [] },
      },
    });
    expect(g().sleep()).toBe(true);
    const after = g();
    expect(after.debts['ba_nam']).toBeUndefined();
    expect(after.debts['chu_ba']).toEqual({ amount: 30_000, since: DAY - DEBT_LATE_DAYS });
    expect(news().some((n) => n.includes('quỵt nợ'))).toBe(true);
    expect(news().some((n) => n.includes('nên nhắc nợ'))).toBe(true);
    expect(after.regulars['ba_nam']?.friendship).toBe(20 - WRITE_OFF_FRIEND_LOSS);
  });
});

describe('chốt ngày: đơn gọi điện đang mang đi qua đêm', () => {
  it('hàng đã soạn về kho, khách chấm 2 sao vì phật ý, thân thiết giảm', () => {
    const miBefore = g().storage.mi ?? 0;
    useGame.setState({
      phoneOrders: [{
        id: 1, houseId: 'n1', caller: 'Chú Ba xe ôm', regular: 'chu_ba', reason: 'thử',
        items: { mi: 5 }, calledAt: 8 * 60, answerBy: 9 * 60, dueAt: 10 * 60, status: 'carrying',
      } as never],
      regulars: { ...newGameData().regulars, chu_ba: { friendship: 15, visits: 2, perks: [], discovered: [] } },
    });
    expect(g().sleep()).toBe(true);
    const after = g();
    expect(after.storage.mi).toBe(miBefore + 5);
    expect(after.reviews.some((r) => r.stars === 2)).toBe(true);
    expect(after.regulars['chu_ba']?.friendship).toBe(15 - PHONE_FRIEND_GAIN);
    expect(after.phoneOrders.find((o) => o.id === 1)).toBeUndefined();
  });
});
