import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { UPGRADES, upgradeById } from '../data/upgrades';
import { isNight, LATE_WAKE_AT, NIGHT_PRICE_MUL, NIGHT_THEFT_MUL, nightTrafficAt } from '../data/night';
import { dailyWage, SHIFTS } from '../data/staff';
import { PROFESSIONS, PROFESSION_LOOK } from '../data/professions';
import { PRODUCTS } from '../data/products';
import { productById } from '../data/products';

/** Bộ test đợt 16 — tiệm 24h: nâng cấp ca đêm, giá đêm, nghề ca đêm, ngủ muộn dậy trễ. */

describe('nâng cấp ca đêm', () => {
  it('nâng cấp "Mở ca đêm 24h" mở ở cấp 55, giá lớn kiểu endgame', () => {
    const up = upgradeById('night');
    expect(up).toBeTruthy();
    expect(up!.unlock).toBe(55);
    expect(up!.price).toBeGreaterThanOrEqual(10000000);
    expect(UPGRADES.some((u) => u.id === 'night')).toBe(true);
  });
});

describe('nhịp khách ban đêm', () => {
  it('isNight đúng ranh giới 22h–6h, tính cả phút vượt nửa đêm (24h–30h)', () => {
    expect(isNight(21 * 60 + 59)).toBe(false);
    expect(isNight(22 * 60)).toBe(true);
    expect(isNight(23 * 60 + 59)).toBe(true);
    expect(isNight(0)).toBe(true);
    expect(isNight(5 * 60 + 59)).toBe(true);
    expect(isNight(6 * 60)).toBe(false);
    expect(isNight(26 * 60)).toBe(true); // 2h sáng hôm sau khi đang chơi ca đêm
  });

  it('đêm khách thưa nhưng không im lặng: 22h–24h đông hơn 0h–6h, ngày thì trả null', () => {
    expect(nightTrafficAt(23 * 60)).toBeGreaterThan(nightTrafficAt(2 * 60)!);
    expect(nightTrafficAt(22 * 60)).toBeGreaterThan(0);
    expect(nightTrafficAt(5 * 60)).toBeGreaterThan(0);
    expect(nightTrafficAt(12 * 60)).toBeNull();
  });
});

describe('ca đêm của nhân viên', () => {
  it('ca chiều/cả ngày kéo tới 22h30 — khớp giờ đóng cửa tiệm (22h30)', () => {
    expect(SHIFTS.afternoon.to).toBe(22 * 60 + 30);
    expect(SHIFTS.full.to).toBe(22 * 60 + 30);
    expect(SHIFTS.afternoon.from).toBe(14 * 60);
  });

  it('ca đêm 22h–6h (phút 1320–1800), lương ×1.5', () => {
    expect(SHIFTS.night.from).toBe(22 * 60);
    expect(SHIFTS.night.to).toBe(30 * 60);
    expect(SHIFTS.night.pay).toBe(1.5);
    const st = { id: 1, name: 'A', role: 'cashier' as const, skill: 3, wage: 200000, shift: 'night' as const, perks: [] };
    expect(dailyWage(st)).toBe(300000);
  });
});

describe('giá ban đêm', () => {
  it('có nâng cấp ca đêm thì bán đắt hơn ×1.15 lúc khuya; ngày thì giá như thường', () => {
    const biz = { ...newGameData().biz, upgrades: ['night' as const] };
    useGame.setState({ ...newGameData(), minutes: 23 * 60, biz });
    expect(useGame.getState().priceOf('mi')).toBe(Math.round(5000 * NIGHT_PRICE_MUL));
    useGame.setState({ minutes: 12 * 60 });
    expect(useGame.getState().priceOf('mi')).toBe(5000);
    // Không có nâng cấp: khuya vẫn giá thường
    useGame.setState({ ...newGameData(), minutes: 23 * 60 });
    expect(useGame.getState().priceOf('mi')).toBe(5000);
  });
});

describe('rủi ro và hậu quả ca đêm', () => {
  it('trộm hoạt động gấp đôi ban đêm', () => {
    expect(NIGHT_THEFT_MUL).toBe(2);
  });

  it('ngủ sau nửa đêm: hôm sau dậy trễ tới 8h sáng', () => {
    useGame.setState({ ...newGameData(), day: 10, minutes: 25 * 60 });
    expect(useGame.getState().sleep()).toBe(true);
    expect(useGame.getState().day).toBe(11);
    expect(useGame.getState().minutes).toBe(LATE_WAKE_AT);
    expect(LATE_WAKE_AT).toBe(8 * 60);
  });

  it('ngủ trong tối 18h–24h: hôm sau vẫn dậy 6h như thường', () => {
    useGame.setState({ ...newGameData(), day: 10, minutes: 21 * 60 });
    expect(useGame.getState().sleep()).toBe(true);
    expect(useGame.getState().minutes).toBe(6 * 60);
  });
});

describe('nghề ca đêm', () => {
  const NIGHT_JOBS = ['bouncer', 'night_driver', 'shift3_worker'];
  it('3 nghề ca đêm có khung giờ sau nửa đêm và món ưa thích đều tồn tại', () => {
    for (const id of NIGHT_JOBS) {
      const p = PROFESSIONS.find((x) => x.id === id);
      expect(p, id).toBeTruthy();
      // Có ít nhất một khung giờ nằm trong đêm (bắt đầu từ 21h trở đi hoặc qua 0h)
      const hasNightHours = p!.hours.some(([from]) => from >= 21 * 60 || from === 0);
      expect(hasNightHours, `${id} phải có giờ ca đêm`).toBe(true);
      for (const like of p!.likes) {
        expect(PRODUCTS.some((x) => x.id === like), `${id} thích món không có: ${like}`).toBe(true);
      }
    }
  });

  it('bác sĩ về hưu đeo ống nghe (biến thể nhân vật còn sót)', () => {
    expect(PROFESSION_LOOK.retired_doctor?.props).toContain('stethoscope');
  });
});
