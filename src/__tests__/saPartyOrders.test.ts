import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS, offerForDay } from '../data/orders';
import { productById } from '../data/products';

// GĐ1709 + GĐ1720 (gộp GĐ1722): đơn tiệc món chuỗi sả — hợp lệ và thật sự được mời.
const CASES: [string, string][] = [['gio_ga_xao_sa', 'ga_xao_sa'], ['cuoi_bo_xao_sa', 'bo_xao_sa'], ['tan_gia_goi_buoi', 'goi_buoi_tom'], ['day_thang_che_gac', 'che_gac'], ['lop_hoc_mit_chien', 'mit_chien_gion'], ['nhau_goi_xoai', 'goi_xoai_tom_kho']];

describe.each(CASES)('đơn %s', (orderId, dish) => {
  const o = PARTY_ORDERS.find((x) => x.id === orderId)!;
  it('đặt 16 phần, mở không sớm hơn món, có thưởng', () => {
    expect(o.items).toEqual({ [dish]: 16 });
    expect(o.unlock).toBeGreaterThanOrEqual(productById(dish).unlock);
    expect(o.bonus).toBeGreaterThan(0);
  });
  it('quét 30 seed × 140 ngày ở cấp 60: xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === orderId) n++;
    expect(n).toBeGreaterThan(0);
  });
});
