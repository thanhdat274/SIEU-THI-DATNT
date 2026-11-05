import { describe, expect, it } from 'vitest';
import { bestCrop, cropPerDay } from '../data/farmValue';
import { bestCropForMenu, brewGrossPerUnit, cropRankForMenu } from '../data/farmQuanValue';
import { cropById } from '../data/garden';

describe('GĐ1104 — "Hôm nay đáng" nhìn thấy giá trị pha (thực đơn quán → định giá cây)', () => {
  it('brewGrossPerUnit: vải có Trà vải trên menu (mở 34) — giá trị pha/1 cao hơn bán lẻ nhà trồng', () => {
    const brew = brewGrossPerUnit('x_vai', 45, ['tra_vai']);
    expect(brew).not.toBeNull();
    expect(brew!.drink.id).toBe('tra_vai');
    // 4 ly × 20k − trà/đường/đá theo tỷ lệ ≈ 74.5k > bán lẻ 38.4k
    expect(brew!.perUnit).toBeGreaterThan(38_400);
    expect(brewGrossPerUnit('x_vai', 45, undefined)).toBeNull(); // không trên menu → không nhu cầu
    expect(brewGrossPerUnit('x_vai', 33, ['tra_vai'])).toBeNull(); // món chưa mở cấp
  });

  it('cropPerDay với valuePerUnit thấp hơn bán lẻ → y hệt hành vi cũ (max giữ bán lẻ)', () => {
    const c = cropById('rau_cai');
    const base = cropPerDay(c, { day: 150 });
    const overridden = cropPerDay(c, { day: 150, valuePerUnit: 1 });
    expect(overridden.perDay).toBe(base.perDay);
    expect(overridden.revenue).toBe(base.revenue);
  });

  it('bestCropForMenu có menu Trà vải (mùa vải) → vải lên đầu vì giá trị pha; không menu → y hệt bestCrop', () => {
    const day = 150; // tháng 6 — vải đúng mùa (5–7)
    const withMenu = bestCropForMenu(45, day, ['tra_vai']);
    expect(withMenu!.crop.id).toBe('vai');
    expect(withMenu!.drinkName).toBe('Trà vải');
    // không menu: hành vi cũ nguyên vẹn (cùng kết quả bestCrop)
    const plain = bestCrop(45, day);
    const noMenu = bestCropForMenu(45, day, undefined);
    expect(noMenu!.crop.id).toBe(plain!.crop.id);
    expect(noMenu!.drinkName).toBeUndefined();
  });

  it('món chưa mở cấp không được tính: menu tra_vai ở cấp 33 → xếp hạng như không menu', () => {
    const day = 150;
    const locked = cropRankForMenu(33, day, ['tra_vai']);
    const plain = cropRankForMenu(33, day, undefined);
    expect(locked.map((x) => x.crop.id)).toEqual(plain.map((x) => x.crop.id));
  });
});
