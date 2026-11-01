import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { buyHomeItem, buyService, buyVehicle, earnService, eatBreakfast } from '../core/biz';
import { BREAKFAST, HOME_ITEMS, VEHICLES } from '../data/biz';
import { SERVICES } from '../data/services';

/**
 * biz.ts — sắm đồ nhà, mở dịch vụ quầy, bữa sáng, mua xe: tiêu tiền một lần theo cấp.
 * Khoá: mỗi món mua một lần, đúng cấp, đủ tiền (không trừ khi bị chặn), sổ chi cập nhật;
 * xe chỉ nâng lên (không mua xe đạp khi đã có xe máy); bữa sáng một lần/ngày và trước 11h; dịch vụ ghi sổ theo id.
 */

const g = () => useGame.getState();
const spentOf = () => g().stats.spent;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 50_000_000, level: 50, day: 4, minutes: 8 * 60 });
  useGame.setState({ biz: { ...g().biz, home: [], services: [], vehicle: 'none', breakfastDay: -1 } });
});

describe('đồ nhà', () => {
  it('mua: trừ giá, ghi vào nhà, ghi sổ chi; mua lại không trừ thêm', () => {
    const it0 = HOME_ITEMS[0];
    const s0 = spentOf();
    buyHomeItem(it0.id);
    expect(g().biz.home).toEqual([it0.id]);
    expect(spentOf()).toBe(s0 + it0.price);
    buyHomeItem(it0.id);
    expect(spentOf()).toBe(s0 + it0.price);
  });

  it('thiếu cấp / thiếu tiền / id lạ: không mua, không trừ', () => {
    const hi = HOME_ITEMS.find((h) => h.unlock > 2)!;
    useGame.setState({ level: hi.unlock - 1 });
    const m = g().money;
    buyHomeItem(hi.id);
    buyHomeItem('khong-co');
    expect(g().biz.home).toEqual([]);
    useGame.setState({ level: 50, money: hi.price - 1 });
    buyHomeItem(hi.id);
    expect(g().biz.home).toEqual([]);
    expect(g().money).toBe(hi.price - 1);
    expect(m).toBe(50_000_000);
  });
});

describe('xe', () => {
  const bike = VEHICLES[0];
  const moto = VEHICLES[1];

  it('mua xe đạp rồi nâng lên xe máy; có xe máy thì không mua xe đạp lại (không hạ cấp, không trừ tiền)', () => {
    buyVehicle(bike.id);
    expect(g().biz.vehicle).toBe('bike');
    buyVehicle(moto.id);
    expect(g().biz.vehicle).toBe('moto');
    const m = g().money;
    buyVehicle(bike.id);
    expect(g().biz.vehicle).toBe('moto');
    expect(g().money).toBe(m);
  });

  it('thiếu cấp hoặc tiền: không mua', () => {
    useGame.setState({ level: moto.unlock - 1 });
    buyVehicle(moto.id);
    expect(g().biz.vehicle).toBe('none');
    useGame.setState({ level: 50, money: bike.price - 1 });
    buyVehicle(bike.id);
    expect(g().biz.vehicle).toBe('none');
  });
});

describe('bữa sáng', () => {
  it('ăn: trừ giá, ghi breakfastDay; ăn lại cùng ngày không trừ', () => {
    const m0 = g().money;
    eatBreakfast();
    expect(g().money).toBe(m0 - BREAKFAST.price);
    expect(g().biz.breakfastDay).toBe(4);
    eatBreakfast();
    expect(g().money).toBe(m0 - BREAKFAST.price);
  });

  it('quá 11 giờ: không ăn sáng nữa', () => {
    useGame.setState({ minutes: 11 * 60 + 1 });
    const m0 = g().money;
    eatBreakfast();
    expect(g().money).toBe(m0);
    expect(g().biz.breakfastDay).toBe(-1);
  });
});

describe('dịch vụ quầy', () => {
  const svc = SERVICES[0];

  it('mở dịch vụ: trừ giá một lần; id lạ bỏ qua', () => {
    const m0 = g().money;
    buyService(svc.id);
    expect(g().biz.services).toEqual([svc.id]);
    expect(g().money).toBe(m0 - svc.price);
    buyService(svc.id);
    buyService('khong-co');
    expect(g().money).toBe(m0 - svc.price);
  });

  it('một lượt dịch vụ: cộng két + doanh thu + sổ theo dịch vụ; id thiếu thì chỉ cộng tổng', () => {
    const m0 = g().money;
    const r0 = g().stats.revenue;
    earnService(svc.id, 3000);
    earnService(svc.id, 2000);
    earnService(undefined, 1000);
    expect(g().money).toBe(m0 + 6000);
    expect(g().stats.revenue).toBe(r0 + 6000);
    expect(g().stats.services).toBe(6000);
    expect(g().stats.byService![svc.id]).toBe(5000);
    expect(g().biz.serviceLife![svc.id]).toBe(5000);
  });
});
