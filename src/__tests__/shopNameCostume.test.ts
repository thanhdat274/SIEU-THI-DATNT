import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { COSTUMES, PRESTIGE_COSTUMES } from '../data/costumes';

/** setShopName / setCostume — tên tiệm được cắt gọn, rỗng về mặc định; trang phục cần đủ cấp và số lần tái sinh. */

const g = () => useGame.getState();
const lvl = COSTUMES.find((c) => c.unlock > 1 && !(c.prestige ?? 0))!;
const ng = PRESTIGE_COSTUMES.find((c) => (c.prestige ?? 0) > 0)!;

beforeEach(() => {
  useGame.setState({ ...newGameData(), level: 1, costume: COSTUMES[0].id });
});

describe('setShopName', () => {
  it('cắt khoảng trắng và giới hạn 24 ký tự', () => {
    g().setShopName('  ' + 'a'.repeat(40) + '  ');
    expect(g().shopName).toBe('a'.repeat(24));
  });
  it('rỗng/toàn khoảng trắng: về tên mặc định', () => {
    g().setShopName('   ');
    expect(g().shopName).toBe('Tạp Hóa Đầu Ngõ');
  });
});

describe('setCostume', () => {
  it('thiếu cấp: không đổi', () => {
    const before = g().costume;
    g().setCostume(lvl.id);
    expect(g().costume).toBe(before);
    useGame.setState({ level: lvl.unlock });
    g().setCostume(lvl.id);
    expect(g().costume).toBe(lvl.id);
  });
  it('đồ NG+: đủ cấp vẫn cần đủ lần tái sinh', () => {
    useGame.setState({ level: 100 });
    const before = g().costume;
    g().setCostume(ng.id);
    expect(g().costume).toBe(before);
    useGame.setState({ biz: { ...g().biz, prestige: { ...g().biz.prestige, level: ng.prestige! } } });
    g().setCostume(ng.id);
    expect(g().costume).toBe(ng.id);
  });
  it('id lạ: bỏ qua', () => {
    const before = g().costume;
    g().setCostume('khong-co' as never);
    expect(g().costume).toBe(before);
  });
});
