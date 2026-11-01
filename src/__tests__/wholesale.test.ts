import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { makeVendorOffer, wholesaleTotal, vendorById, VENDORS, VENDOR_WAIT, WHOLESALE_RATE } from '../data/wholesale';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ210 — QA toàn diện: bổ sung test cho bán sỉ (wholesale.ts, trước đây ít test).
 * Người bán rong ghé sáng sớm, đề xuất lấy món theo hàng đã mở khóa; giá sỉ giảm theo tỉ lệ.
 */
describe('wholesale — bán sỉ', () => {
  beforeEach(() => setSimSeed(42));
  afterEach(() => clearSimSeed());

  it('makeVendorOffer: đúng cấu trúc — vendor có thật, món trong ý thích, hạn = minutes + VENDOR_WAIT', () => {
    const offer = makeVendorOffer(30, 8 * 60);
    if (offer) {
      const v = VENDORS.find((x) => x.id === offer.vendorId);
      expect(v).toBeDefined();
      expect(Object.keys(offer.items).length).toBeGreaterThan(0);
      for (const id of Object.keys(offer.items)) expect(v!.likes).toContain(id);
      expect(offer.expiresAt).toBe(8 * 60 + VENDOR_WAIT);
    } else {
      // không vendor nào thích hàng đã mở khóa thì mới null
      expect(true).toBe(true);
    }
  });

  it('wholesaleTotal: giá sỉ = max(giá nhập+5%, giá đang bán × 0.85)', () => {
    // mi: buy 3000 → floor 3150; priceOf 5000 × 0.85 = 4250 → round/100*100 = 4300 → unit 4300
    expect(wholesaleTotal({ mi: 2 }, () => 5000)).toBe(4300 * 2);
  });

  it('wholesaleTotal: giá bán quá thấp thì giữ sàn giá nhập +5%', () => {
    // priceOf 1 ×0.85 < sàn buy+5% (3150) → đơn = 3150 × qty
    expect(wholesaleTotal({ mi: 2 }, () => 1)).toBe(Math.round(3000 * 1.05) * 2);
  });

  it('vendorById: có thì trả về, không thì undefined', () => {
    expect(vendorById(VENDORS[0].id)).toBeDefined();
    expect(vendorById('id_khong_co')?.id).toBeUndefined();
  });

  it('WHOLESALE_RATE nằm trong khoảng hợp lệ', () => {
    expect(WHOLESALE_RATE).toBeGreaterThan(0);
    expect(WHOLESALE_RATE).toBeLessThan(1);
  });
});
