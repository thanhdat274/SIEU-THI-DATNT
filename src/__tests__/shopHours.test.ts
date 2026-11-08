import { describe, expect, it } from 'vitest';
import { SHOP_HOURS, shopHoursLabel } from '../data/shopHours';

describe('Giờ mở riêng từng loại tiệm', () => {
  it('xôi, quán nước mở sớm hơn tạp hóa; tiện lợi 24/7', () => {
    expect(SHOP_HOURS.tiemXoi.from).toBeLessThan(SHOP_HOURS.grocery.from);
    expect(SHOP_HOURS.quanNuoc.from).toBeLessThan(SHOP_HOURS.grocery.from);
    expect(shopHoursLabel('convenience')).toBe('24/7');
  });
  it('tạp hóa giữ 6:00–22:00 như trước (không đổi cân bằng)', () => {
    expect(shopHoursLabel('grocery')).toBe('6h–22h');
    expect(shopHoursLabel('quanNuoc')).toBe('5h30–22h');
  });
});
