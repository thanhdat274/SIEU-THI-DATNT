import { describe, expect, it } from 'vitest';
import { SHOP_HOURS, shopHoursLabel } from '../data/shopHours';

describe('Giờ mở riêng từng loại tiệm', () => {
  it('xôi, quán nước mở sớm hơn tạp hóa; tiện lợi 24/7', () => {
    expect(SHOP_HOURS.tiemXoi.from).toBeLessThan(SHOP_HOURS.grocery.from);
    expect(SHOP_HOURS.quanNuoc.from).toBeLessThan(SHOP_HOURS.grocery.from);
    expect(shopHoursLabel('convenience')).toBe('24/7');
  });
  it('tạp hóa, siêu thị, siêu thị lớn mở 8:00–22:30', () => {
    expect(shopHoursLabel('grocery')).toBe('8h–22h30');
    expect(shopHoursLabel('quanNuoc')).toBe('5h30–22h');
  });
});
