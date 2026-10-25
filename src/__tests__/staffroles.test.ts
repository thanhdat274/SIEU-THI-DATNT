import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { spoilOvernight } from '../core/stock';
import { bartenderBoost } from '../core/slices/orders';
import { newBiz, rivalNightAI, type Rival } from '../data/biz';
import { REGULARS, regularCheckout } from '../data/regulars';
import { bestSkillOnDuty, type Staff, type StaffRole } from '../data/staff';

/** Bộ test đợt 22 — dọn dẹp: rival trả khách quay lại, hiệu ứng thật của pha chế/quản lý kho/chăm sóc khách, boa món nhà làm. */

const staff = (role: StaffRole, skill: number, shift: Staff['shift'] = 'morning'): Staff =>
  ({ id: 1, name: 'Người thử', role, skill, wage: 100000, shift });

describe('rivalNightAI — khách quen bị lôi kéo có thể quay lại', () => {
  const def = REGULARS[0];
  const rival: Rival = { name: 'Tạp hóa Thử', strength: 50, openedDay: 1, personality: 'cutter', poached: { [def.id]: 9 } };
  const ctx = {
    day: 10, byItem: {}, priceOf: () => 0,
    friendships: { [def.id]: 10 }, giftCounter: true, staff: [], rng: () => 0.5,
  };

  it('đang chạy tri ân khách quen: khách bị lôi kéo quay về, khỏi bị lôi lại trong đêm', () => {
    const out = rivalNightAI(rival, ctx);
    expect(out.returned).toContain(def.id);
    expect(out.rival.poached?.[def.id]).toBeUndefined();
  });

  it('không có đòn nào thì khách còn mải mua bên đối thủ (không quay lại)', () => {
    const out = rivalNightAI(rival, { ...ctx, giftCounter: false, rng: () => 0.99 });
    expect(out.returned).not.toContain(def.id);
  });
});

describe('bestSkillOnDuty — tay nghề vai này đang trực ca', () => {
  it('trong ca thì lấy sao cao nhất, ngoài ca hoặc sai vai thì 0', () => {
    expect(bestSkillOnDuty([staff('bartender', 4)], 'bartender', 8 * 60)).toBe(4);
    expect(bestSkillOnDuty([staff('bartender', 4), staff('bartender', 2, 'afternoon')], 'bartender', 8 * 60)).toBe(4);
    expect(bestSkillOnDuty([staff('bartender', 4)], 'bartender', 15 * 60)).toBe(0); // ca sáng đã hết
    expect(bestSkillOnDuty([staff('cashier', 5)], 'bartender', 8 * 60)).toBe(0);
  });
});

describe('bartenderBoost — pha chế tăng tốc mẻ trạm pha chế', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), minutes: 8 * 60 }));

  it('5★ trực ca sáng: mẻ trạm pha nhanh thêm 50%; ngoài ca thì thôi', () => {
    useGame.setState({ staff: [staff('bartender', 5)] });
    expect(bartenderBoost(() => useGame.getState())).toBeCloseTo(1.5);
    useGame.setState({ minutes: 20 * 60 });
    expect(bartenderBoost(() => useGame.getState())).toBe(1);
  });
});

describe('spoilOvernight — quản lý kho làm hàng hỏng chậm lại', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), weather: 'cloudy' }));

  it('kem để kho ngoài tủ lạnh cấp 1 (chứa được 40 món): quản lý kho 5★ giữ nốt phần thừa', () => {
    const seed = () => useGame.setState({
      storage: { kem: 60 },
      storageLots: { kem: [{ qty: 60, life: 2.5 }] },
    });
    seed();
    const noMgr = spoilOvernight(useGame.getState());
    seed();
    useGame.setState({ staff: [staff('warehouse_mgr', 5)] });
    seed();
    const withMgr = spoilOvernight(useGame.getState());
    expect(noMgr.items).toBe(20); // 40 món vào tủ lạnh kho an toàn, 20 món ngoài hỏng hết
    expect(withMgr.items).toBe(0); // có quản lý kho: tốc độ hỏng ×0.7, 20 món còn sống
  });
});

describe('regularCheckout — boa thêm khi mua món nhà làm', () => {
  it('món trạm pha chế được boa trong khoảng COOKED_TIP_RANGE, món thường không', () => {
    const def = REGULARS[0];
    const low = regularCheckout(def, undefined, [{ id: 'ca_phe_sua_da', price: 20000 }], 1, () => 0);
    const high = regularCheckout(def, undefined, [{ id: 'ca_phe_sua_da', price: 20000 }], 1, () => 0.999);
    expect(low.tip).toBe(500);
    expect(high.tip).toBe(2000);
    const plain = regularCheckout(def, undefined, [{ id: 'nuoc', price: 20000 }], 1, () => 0);
    expect(plain.tip).toBe(0);
  });
});
