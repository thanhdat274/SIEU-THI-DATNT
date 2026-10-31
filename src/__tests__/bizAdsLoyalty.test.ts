import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { buyAd, buyRivalShop, redeemLoyalty, setLoyalty } from '../core/biz';
import { ADS, RIVAL_BUY_DAYS, activeAds } from '../data/biz';

/**
 * biz.ts — quảng cáo, thẻ tích điểm, mua lại mặt bằng rival.
 * Khoá: quảng cáo chạy đúng số ngày và không mua chồng khi đang chạy, hết hạn thì mua lại được;
 * tặng thẻ tích điểm chọn món rẻ nhất; mua mặt bằng rival trừ giá, tạo chi nhánh, xoá lời chào bán.
 */

const g = () => useGame.getState();
const ad = ADS[0];

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 10_000_000, level: 50, day: 5 });
  useGame.setState({ biz: { ...g().biz, ads: [], rivalForSale: undefined } });
});

describe('quảng cáo', () => {
  it('mua: trừ giá, chạy từ hôm nay tới hết `days` ngày', () => {
    const m0 = g().money;
    buyAd(ad.id);
    expect(g().money).toBe(m0 - ad.price);
    expect(g().biz.ads).toEqual([{ id: ad.id, untilDay: 5 + ad.days - 1 }]);
  });

  it('đang chạy thì mua lại bị chặn (không trừ tiền); hết hạn rồi mua được', () => {
    buyAd(ad.id);
    const m = g().money;
    buyAd(ad.id);
    expect(g().money).toBe(m);
    useGame.setState({ day: 5 + ad.days });
    expect(activeAds(g().biz.ads, g().day)).toEqual([]);
    buyAd(ad.id);
    expect(g().money).toBe(m - ad.price);
    expect(g().biz.ads).toHaveLength(1);
  });

  it('thiếu cấp, thiếu tiền, id lạ: không mua', () => {
    useGame.setState({ level: ad.unlock - 1 });
    buyAd(ad.id);
    useGame.setState({ level: 50, money: ad.price - 1 });
    buyAd(ad.id);
    buyAd('khong-co');
    expect(g().biz.ads).toEqual([]);
    expect(g().money).toBe(ad.price - 1);
  });
});

describe('thẻ tích điểm', () => {
  it('bật/tắt và đổi số tem; không đổi số tem khi không truyền', () => {
    setLoyalty(true, 10);
    expect(g().biz.loyalty).toMatchObject({ on: true, stamps: 10 });
    setLoyalty(false);
    expect(g().biz.loyalty).toMatchObject({ on: false, stamps: 10 });
  });

  it('đủ tem: tặng món RẺ NHẤT trong giỏ, ghi số lần và tổng tiền đã tặng; giỏ rỗng thì 0', () => {
    const l0 = g().biz.loyalty;
    expect(redeemLoyalty([])).toBe(0);
    expect(g().biz.loyalty).toEqual(l0);
    expect(redeemLoyalty([30_000, 12_000, 50_000])).toBe(12_000);
    expect(redeemLoyalty([8_000])).toBe(8_000);
    expect(g().biz.loyalty.redeemed).toBe(l0.redeemed + 2);
    expect(g().biz.loyalty.given).toBe(l0.given + 20_000);
  });
});

describe('mua lại mặt bằng rival', () => {
  const offer = { name: 'Tạp hóa Hai Lúa', price: 2_000_000, until: 99 };

  it('chưa có chi nhánh: trừ giá, thành chi nhánh mới, xoá lời chào bán, mở cửa sổ khách cũ', () => {
    useGame.setState({ branch: null, biz: { ...g().biz, rivalForSale: offer } });
    const m0 = g().money;
    buyRivalShop();
    expect(g().money).toBe(m0 - offer.price);
    expect(g().branch).not.toBeNull();
    expect(g().biz.rivalForSale).toBeUndefined();
    expect(g().biz.rivalBuyUntil).toBe(5 + RIVAL_BUY_DAYS);
  });

  it('không có lời chào bán hoặc thiếu tiền: không đổi gì', () => {
    buyRivalShop();
    expect(g().branch).toBeNull();
    useGame.setState({ biz: { ...g().biz, rivalForSale: offer }, money: offer.price - 1 });
    buyRivalShop();
    expect(g().money).toBe(offer.price - 1);
    expect(g().biz.rivalForSale).toEqual(offer);
    expect(g().branch).toBeNull();
  });
});
