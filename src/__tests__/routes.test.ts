import { describe, expect, it } from 'vitest';
import {
  COOL_BOX, HAULERS, ROUTES, haulerById, haulerUnlocked, roundTripMinutes, routeBuyPrice,
  routeById, routeDiscountFor, routeUnlocked, tripCapacity, tripTravelCost,
} from '../data/routes';

/** Hệ 5-L1 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5): khung dữ liệu thuần + tính giờ/giá/sức chở. */

describe('HAULERS (phương tiện chở hàng)', () => {
  it('id duy nhất, mở sau cấp 30 (không đụng golden), sức chở dương', () => {
    const ids = new Set(HAULERS.map((h) => h.id));
    expect(ids.size).toBe(HAULERS.length);
    for (const h of HAULERS) {
      expect(h.unlock).toBeGreaterThan(30);
      expect(h.cases).toBeGreaterThan(0);
      expect(h.price).toBeGreaterThanOrEqual(0);
      expect(h.timeMul).toBeGreaterThan(0);
    }
  });

  it('xe khách rẻ nhất (vé cố định), xe tải chở nhiều nhất', () => {
    expect(haulerById('bus')?.cases).toBeLessThan(haulerById('moto')!.cases);
    expect(haulerById('xe_tai')?.cases).toBeGreaterThan(haulerById('ba_gac')!.cases);
    expect(haulerById('bus')?.tripCostFlat).toBe(60000);
  });

  it('thùng đá giữ lạnh có mốc riêng', () => {
    expect(COOL_BOX.unlock).toBe(46);
    expect(COOL_BOX.price).toBeGreaterThan(0);
  });
});

describe('ROUTES (tuyến)', () => {
  it('id duy nhất, mở sau cấp 30, giờ khứ hồi dương', () => {
    const ids = new Set(ROUTES.map((r) => r.id));
    expect(ids.size).toBe(ROUTES.length);
    for (const r of ROUTES) {
      expect(r.unlock).toBeGreaterThan(30);
      expect(r.hours).toBeGreaterThan(0);
    }
  });

  it('L1 có đúng 2 tuyến: Chợ huyện (theo ngành) + Miệt vườn (theo đặc sản Nam)', () => {
    expect(ROUTES.map((r) => r.id)).toEqual(['cho_huyen', 'miet_vuon']);
    const j = routeById('cho_huyen')!;
    expect(j.categoryDeals?.length).toBeGreaterThan(0);
    expect(j.goods).toHaveLength(0);
    const v = routeById('miet_vuon')!;
    expect(v.region).toBe('Nam');
    expect(v.goods).toHaveLength(5);
    expect(v.categoryDeals).toBeUndefined();
  });

  it('mọi đặc sản của Miệt vườn đều biên 30% và tồn tại trong bảng', () => {
    const v = routeById('miet_vuon')!;
    const names = new Set(v.goods.map((g) => {
      expect(g.discount).toBe(0.30);
      expect(g.weeklyCap).toBeGreaterThan(0);
      return g.productId;
    }));
    expect(names.size).toBe(5);
  });
});

describe('routeDiscountFor / routeBuyPrice (giá)', () => {
  it('Miệt vườn: món đặc sản → 30%', () => {
    const v = routeById('miet_vuon')!;
    expect(routeDiscountFor(v, 'rg_kho_tom', 'dry')).toBe(0.30);
  });
  it('Chợ huyện: hàng theo ngành → rẻ theo ngành; món ngoài ngành → 0', () => {
    const j = routeById('cho_huyen')!;
    expect(routeDiscountFor(j, 'any_fresh', 'fresh')).toBe(0.25);
    expect(routeDiscountFor(j, 'any_meat', 'meat')).toBe(0.20);
    expect(routeDiscountFor(j, 'any_dry', 'dry')).toBe(0);
  });
  it('giá mua = giá chuẩn × (1 − discount), clamp không âm', () => {
    expect(routeBuyPrice(100000, 0.30)).toBe(70000);
    expect(routeBuyPrice(100000, 0)).toBe(100000);
    expect(routeBuyPrice(100000, 1.5)).toBe(0);
  });
});

describe('roundTripMinutes / tripTravelCost (giờ & chi phí)', () => {
  const choHuyen = routeById('cho_huyen')!;
  it('Chợ huyện 3h: xe máy = 180 phút; xe khách = 234 phút (1,3×); ba gác = 207 phút (1,15×)', () => {
    expect(roundTripMinutes(choHuyen, haulerById('moto')!)).toBe(180);
    expect(roundTripMinutes(choHuyen, haulerById('bus')!)).toBe(234);
    expect(roundTripMinutes(choHuyen, haulerById('ba_gac')!)).toBe(207);
  });
  it('xe khách vé cố định 60k; xe máy tính theo giờ', () => {
    expect(tripTravelCost(haulerById('bus')!, 234)).toBe(60000);
    expect(tripTravelCost(haulerById('moto')!, 180)).toBe(45000); // 3h × 15k
  });
});

describe('sức chở + cổng cấp', () => {
  it('sức chở = cases của xe', () => {
    expect(tripCapacity(haulerById('moto')!)).toBe(8);
    expect(tripCapacity(haulerById('xe_tai')!)).toBe(80);
  });
  it('routeUnlocked / haulerUnlocked đúng mốc', () => {
    expect(routeUnlocked(routeById('miet_vuon')!, 44)).toBe(true);
    expect(routeUnlocked(routeById('miet_vuon')!, 43)).toBe(false);
    expect(haulerUnlocked(haulerById('ba_gac')!, 44)).toBe(true);
    expect(haulerUnlocked(haulerById('ba_gac')!, 30)).toBe(false);
  });
});
