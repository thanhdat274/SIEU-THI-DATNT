import { describe, expect, it } from 'vitest';
import { isCookStation, type FurnitureType } from '../data/furniture';
import { HOME_ITEMS } from '../data/biz';
import { PETS } from '../data/bizAchievements';
import * as R from '../data/regulars';

// GĐ1623 — chặn thành tựu đòi nhiều hơn số thứ có trong game (cùng loại lỗi bậc 7 ở GĐ1621).
describe('GĐ1623 — thành tựu đạt được', () => {
  const STATIONS: FurnitureType[] = ['hot_kettle', 'food_grill', 'blender', 'drink_counter', 'fryer', 'sugarcane_press', 'rice_station', 'steamer', 'gift_wrap'];
  it('đủ 8 loại trạm nấu cho "Nhà hàng thu nhỏ"', () => expect(STATIONS.filter(isCookStation).length).toBeGreaterThanOrEqual(8));
  it('đủ 4 món nhà cho "Tổ ấm", 2 bé cho "Tiệm có bé cưng"', () => {
    expect(HOME_ITEMS.length).toBeGreaterThanOrEqual(4);
    expect(PETS.length).toBeGreaterThanOrEqual(2);
  });
  it('đủ 10 khách quen cho "Hẻm tui thân nhau"', () => {
    const arr = Object.values(R).find((v) => Array.isArray(v) && v.length > 5 && (v[0] as { id?: string })?.id) as unknown[];
    expect(arr.length).toBeGreaterThanOrEqual(10);
  });
});
