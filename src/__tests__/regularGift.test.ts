import { describe, it, expect } from 'vitest';
import { regularGiftPlan, REGULAR_GIFT_LEVEL } from '../data/regularGift';
import { REGULARS } from '../data/regulars';
import { productById } from '../data/products';

const def = REGULARS[0];
const fav = def.favorites.find((f) => productById(f).unlock <= 60)!;

describe('GĐ1557 tặng quà khách quen', () => {
  it('khoá dưới cấp 38', () => {
    expect('error' in regularGiftPlan(def, undefined, REGULAR_GIFT_LEVEL - 1, 5, { [fav]: 3 })).toBe(true);
  });
  it('chọn món khách thích còn trong kho', () => {
    expect(regularGiftPlan(def, undefined, 60, 5, { [fav]: 3 })).toEqual({ productId: fav });
  });
  it('kho trống → lỗi', () => {
    expect(regularGiftPlan(def, undefined, 60, 5, {})).toEqual({ error: 'Kho không có món khách thích' });
  });
  it('mỗi ngày 1 lần', () => {
    const prog = { lastGiftDay: 5 } as never;
    expect(regularGiftPlan(def, prog, 60, 5, { [fav]: 3 })).toEqual({ error: 'Hôm nay đã tặng rồi' });
    expect(regularGiftPlan(def, prog, 60, 6, { [fav]: 3 })).toEqual({ productId: fav });
  });
});

import { giftFriendship } from '../data/regularGift';
describe('GĐ1558 quà sinh nhật', () => {
  it('ngày sinh nhật ×2', () => {
    expect(giftFriendship(false)).toBe(3);
    expect(giftFriendship(true)).toBe(6);
  });
});

import { giftableCount } from '../data/regularGift';
describe('GĐ1559 đếm khách tặng được', () => {
  it('trừ khách đã tặng hôm nay', () => {
    expect(giftableCount([def], {}, 60, 5, { [fav]: 1 })).toBe(1);
    expect(giftableCount([def], { [def.id]: { lastGiftDay: 5 } as never }, 60, 5, { [fav]: 1 })).toBe(0);
    expect(giftableCount([def], {}, 30, 5, { [fav]: 1 })).toBe(0);
  });
});
