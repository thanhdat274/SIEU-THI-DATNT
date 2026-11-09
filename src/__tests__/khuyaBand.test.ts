import { describe, expect, it } from 'vitest';
import { timeBandAt } from '../data/rhythm';
import { SHOP_HOURS } from '../data/shopHours';

/** GĐ1948 — tiệm đón khách tới 22:30 (GĐ1843) nên 22:00–22:30 vẫn có món thèm "Tối muộn". */
describe('khung Tối muộn phủ tới giờ đóng', () => {
  it('mọi phút mở cửa tạp hóa đều thuộc một khung giờ', () => {
    for (let m = SHOP_HOURS.grocery.from; m < SHOP_HOURS.grocery.to; m++) expect(timeBandAt(m), `phút ${m}`).toBeDefined();
  });
  it('22:15 là Tối muộn, 22:30 hết khung', () => {
    expect(timeBandAt(22 * 60 + 15)?.id).toBe('khuya');
    expect(timeBandAt(22 * 60 + 30)).toBeUndefined();
  });
});
