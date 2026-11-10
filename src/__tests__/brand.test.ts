import { describe, expect, it } from 'vitest';
import {
  BRAND_ENTRY_BATCHES, BRAND_ENTRY_SOLD, BRAND_FRANCHISE_SLOTS, BRAND_REP_TIERS,
  BRAND_WORKSHOP_CAPACITY, BRAND_WORKSHOP_MAX_STAFF, brandDealValue, brandLineEligible,
  brandLineSlots, brandObligations, brandPremium, brandRepTier, brandRunway,
  brandStockUnits, brandWorkshopCapacity, franchiseIncome, applyBrandRep, type BrandState,
} from '../data/brand';
import { productById } from '../data/products';

/** Nhãn mặc định cho test (chưa có gì ngoài tên + một dòng nắm giữ trong kho). */
const brand = (over: Partial<BrandState> = {}): BrandState => ({
  name: 'Nhà Năm',
  lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 200, sold: 60 }],
  stock: { hx_nuoc_mam: 30 },
  rep: 0,
  maxRep: 0,
  repLog: [],
  workshop: null,
  lastPackDay: 0,
  deals: {},
  franchises: [],
  franchiseDue: {},
  ...over,
});

describe('Hệ4-L1 — brandLineSlots: mở dần số dòng nhãn theo cấp', () => {
  it('0 dòng dưới 100, mở từng dòng đúng ngưỡng 100/115/130/145/160/180, tối đa 6', () => {
    expect(brandLineSlots(99)).toBe(0);
    expect(brandLineSlots(100)).toBe(1);
    expect(brandLineSlots(114)).toBe(1);
    expect(brandLineSlots(115)).toBe(2);
    expect(brandLineSlots(130)).toBe(3);
    expect(brandLineSlots(145)).toBe(4);
    expect(brandLineSlots(160)).toBe(5);
    expect(brandLineSlots(180)).toBe(6);
    expect(brandLineSlots(200)).toBe(6);
  });
});

describe('Hệ4-L1 — bậc uy tín nhãn (§4.6) và điều kiện vào nhãn (§4.3)', () => {
  it('5 bậc, ranh giới 19/20, 39/40, 59/60, 79/80, 100', () => {
    expect(BRAND_REP_TIERS).toHaveLength(5);
    expect(brandRepTier(0).name).toBe('Nhãn mới');
    expect(brandRepTier(19).premium).toBe(0.05);
    expect(brandRepTier(20).name).toBe('Có tiếng trong xóm');
    expect(brandRepTier(39).premium).toBe(0.1);
    expect(brandRepTier(40).premium).toBe(0.15);
    expect(brandRepTier(59).premium).toBe(0.15);
    expect(brandRepTier(60).premium).toBe(0.2);
    expect(brandRepTier(79).premium).toBe(0.2);
    expect(brandRepTier(80).name).toBe('Thương hiệu quốc dân');
    expect(brandRepTier(100).premium).toBe(0.25);
    expect(brandPremium(35)).toBe(0.1);
    expect(brandPremium(85)).toBe(0.25);
  });

  it('điều kiện vào nhãn: đủ 100 mẻ VÀ bán 500 đơn vị', () => {
    expect(BRAND_ENTRY_BATCHES).toBe(100);
    expect(BRAND_ENTRY_SOLD).toBe(500);
    expect(brandLineEligible(99, 500)).toBe(false);
    expect(brandLineEligible(100, 499)).toBe(false);
    expect(brandLineEligible(100, 500)).toBe(true);
  });
});

describe('Hệ4-L1 — giá trị kỳ giao đại lý (§4.5c)', () => {
  it('theo giá bán lẻ gợi ý × qty × pricePerUnit', () => {
    const def = { id: 'sap_cho_huyen', icon: '', title: '', unlock: 110, rep: 20, periodDays: 5, qty: 40, pricePerUnit: 0.82 };
    const expected = Math.round(productById('hx_nuoc_mam').sell * 40 * 0.82);
    expect(brandDealValue(def, 'hx_nuoc_mam')).toBe(expected);
  });
});

describe('Hệ4-L1 — xưởng đóng gói công suất (§4.5a)', () => {
  it('20/45/80 đơn vị mỗi thợ theo bậc, tối đa 3 thợ', () => {
    expect(BRAND_WORKSHOP_MAX_STAFF).toBe(3);
    expect(BRAND_WORKSHOP_CAPACITY).toEqual([20, 45, 80]);
    expect(brandWorkshopCapacity({ staff: 2, tier: 0 })).toBe(40);
    expect(brandWorkshopCapacity({ staff: 3, tier: 1 })).toBe(135);
    expect(brandWorkshopCapacity({ staff: 2, tier: 2 })).toBe(160);
  });
});

describe('Hệ4-L1 — runway & nghĩa vụ hàng nhãn', () => {
  it('đếm tổng kho nhãn', () => {
    expect(brandStockUnits(brand())).toBe(30);
  });

  it('obligations gồm kỳ đại lý đến hạn trong 7 ngày + nhượng quyền', () => {
    const b = brand({
      deals: {
        sap_cho_huyen: { defId: 'sap_cho_huyen', productId: 'hx_nuoc_mam', dueDay: 110, delivered: 0, pending: true },
      },
      franchises: [{ id: 'pho_co', openedDay: 1, health: 100, missedWeeks: 0 }],
      franchiseDue: { pho_co: 130 }, // ngoài cửa sổ 7 ngày ở ngày 110
    });
    const obl = brandObligations(b, 110); // chỉ đại lý (do hôm nay)
    expect(obl).toHaveLength(1);
    expect(obl[0].type).toBe('deal');
    const obl2 = brandObligations(b, 123); // nhượng quyền đến hạn 130 nằm trong 7 ngày tới
    expect(obl2.map((o) => o.type)).toContain('franchise');
  });

  it('runway: 0 nếu hết hàng, tỉ lệ với nhu cầu 7 ngày', () => {
    const b = brand({ stock: { hx_nuoc_mam: 40 } });
    const bFull = brand({ stock: { hx_nuoc_mam: 100 } });
    expect(brandRunway(brand(), 100)).toEqual({ stock: 30, need: 0, days: 7 });
    expect(brandRunway(b, 100)).toBeTruthy();
    expect(brandRunway(bFull, 100).stock).toBe(100);
  });
});

describe('Hệ4-L1 — uy tín: clamp 0–100 + repLog cửa sổ 14 ngày + maxRep', () => {
  it('không xuống dưới 0, không qua 100, ghi log và cập nhật maxRep', () => {
    const low = applyBrandRep(brand({ rep: 3 }), 120, -10, 'giao trễ');
    expect(low.rep).toBe(0);
    expect(low.repLog).toHaveLength(1);
    expect(low.maxRep).toBe(3);
    const high = applyBrandRep(brand({ rep: 98 }), 120, 10, 'review 5★');
    expect(high.rep).toBe(100);
    expect(high.maxRep).toBe(100);
  });

  it('repLog chỉ giữ 14 ngày gần nhất', () => {
    let b = brand({ rep: 10 });
    for (let d = 1; d <= 20; d++) b = applyBrandRep(b, d, 1, 'x');
    expect(b.repLog.length).toBeLessThanOrEqual(14);
    expect(b.repLog.every((e) => 20 - e.day < 14)).toBe(true);
  });
});

describe('Hệ4-L1 — nhượng quyền: thu nhập tất định theo quy mô + sức khoẻ + uy tín', () => {
  it('có 3 suất nhượng quyền, thu nhập khỏe > yếu, cùng ngày cùng seed ra cùng số', () => {
    expect(BRAND_FRANCHISE_SLOTS).toHaveLength(3);
    const a = franchiseIncome(100, 60, 1, 10);
    const b = franchiseIncome(40, 60, 1, 10);
    const same = franchiseIncome(100, 60, 1, 10);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeGreaterThan(b);
    expect(a).toBe(same); // tất định
  });
});
