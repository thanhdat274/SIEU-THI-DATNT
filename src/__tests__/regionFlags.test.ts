import { describe, expect, it } from 'vitest';
import { FLAG_TIER_DECOR, FLAG_TIER_PRICE, REGION_FLAGS, regionFlagByType, regionFlagDecorBonus, regionFlagTier, regionPriceMul, stockedProductIds } from '../data/regionFlags';
import { REGION_PRODUCTS } from '../data/regionSpecialty';
import { furnitureDef, FURNITURE } from '../data/furniture';
import { productById } from '../data/products';
import { DISH_STAR_STEPS } from '../data/dishStars';
import type { Furniture } from '../core/store';

const shelfTiers = (slots: { productId: string | null; count: number }[]): Furniture['tiers'] => slots;
const mkFurn = (type: string, extra: Record<string, unknown> = {}, tiers: Furniture['tiers'] = []): Furniture =>
  ({ uid: 1, type, x: 0, z: 0, rot: 0, tiers, ...extra } as unknown as Furniture);

const shelfWith = (items: [string, number][]): Furniture =>
  mkFurn('shelf', {}, shelfTiers([
    { productId: items[0]?.[0] ?? null, count: items[0]?.[1] ?? 0 },
    { productId: items[1]?.[0] ?? null, count: items[1]?.[1] ?? 0 },
    { productId: items[2]?.[0] ?? null, count: items[2]?.[1] ?? 0 },
    { productId: items[3]?.[0] ?? null, count: items[3]?.[1] ?? 0 },
    { productId: items[4]?.[0] ?? null, count: items[4]?.[1] ?? 0 },
    { productId: null, count: 0 },
  ]));

describe('regionFlags — bảng hiệu vinh danh đặc sản 4 miền (GĐ1505)', () => {
  it('dữ liệu đặc sản chia đủ 4 miền, mỗi miền ≥2 loại, biên ×1.70, unlock ≥42 (an toàn sim golden L30)', () => {
    const regions = new Set(REGION_PRODUCTS.map((p) => p.region));
    expect([...regions].sort()).toEqual(['Bắc', 'Nam', 'Trung', 'Tây Nguyên'].sort());
    for (const region of regions) {
      expect(REGION_PRODUCTS.filter((p) => p.region === region).length).toBeGreaterThanOrEqual(2);
    }
    for (const p of REGION_PRODUCTS) {
      // biên chuẩn ×1.70 (GĐ1321); vài món GĐ1086 cũ lệch nhẹ (1.71) — chấp nhận khoảng 1.6–1.8
      expect(p.sell).toBeGreaterThanOrEqual(p.buy * 1.6);
      expect(p.sell).toBeLessThanOrEqual(p.buy * 1.8);
      expect(p.unlock).toBeGreaterThanOrEqual(42);
      expect(productById(p.id).id).toBe(p.id); // đã đăng ký vào danh mục bán được
    }
  });

  it('4 bảng hiệu khớp 4 miền, món furniture có thật, decor gốc 4', () => {
    expect(REGION_FLAGS.length).toBe(4);
    for (const flag of REGION_FLAGS) {
      expect(flag.items.length).toBeGreaterThanOrEqual(2);
      const def = FURNITURE.find((f) => f.type === flag.type);
      expect(def?.decor).toBe(4);
      expect(def?.unlock).toBe(42);
      expect(regionFlagByType(flag.type)?.name).toBe(flag.name);
    }
  });

  it('tier: chưa đủ bộ = 0 → đủ bộ bày kệ = 1 → đủ bộ + mọi loại 1★ = 2', () => {
    const nam = REGION_FLAGS.find((f) => f.name === 'Nam')!;
    const stocked = new Set(nam.items);
    expect(regionFlagTier(nam, new Set(), {})).toBe(0);
    expect(regionFlagTier(nam, stocked, {})).toBe(1);
    // 1★ cần DISH_STAR_STEPS[0] lượt bán mỗi loại
    const served: Record<string, number> = {};
    for (const id of nam.items) served[id] = DISH_STAR_STEPS[0] - 1;
    expect(regionFlagTier(nam, stocked, served)).toBe(1);
    for (const id of nam.items) served[id] = DISH_STAR_STEPS[0];
    expect(regionFlagTier(nam, stocked, served)).toBe(2);
  });

  it('bonus 🩷: 0 khi chưa đủ bộ, +4 khi đủ bộ, +12 khi vinh danh; bỏ kệ hỏng và đồ dùng thử', () => {
    const bac = REGION_FLAGS.find((f) => f.name === 'Bắc')!;
    const banner = mkFurn(bac.type);
    expect(regionFlagDecorBonus([banner], new Set(), {})).toBe(0);
    expect(regionFlagDecorBonus([banner], new Set(bac.items), {})).toBe(FLAG_TIER_DECOR[1]);
    const served: Record<string, number> = {};
    for (const id of bac.items) served[id] = DISH_STAR_STEPS[0];
    expect(regionFlagDecorBonus([banner], new Set(bac.items), served)).toBe(FLAG_TIER_DECOR[2]);
    expect(regionFlagDecorBonus([mkFurn(bac.type, { broken: true })], new Set(bac.items), served)).toBe(0);
    expect(regionFlagDecorBonus([mkFurn(bac.type, { trial: true })], new Set(bac.items), served)).toBe(0);
  });

  it('giá đặc sản: không bảng = 1×, đủ bộ = 1.02×, vinh danh = 1.05×; hàng thường không đổi', () => {
    const tayNguyen = REGION_FLAGS.find((f) => f.name === 'Tây Nguyên')!;
    const banner = mkFurn(tayNguyen.type);
    const served: Record<string, number> = {};
    for (const id of tayNguyen.items) served[id] = DISH_STAR_STEPS[0];
    expect(regionPriceMul('shelf', [], new Set(), {})).toBe(1); // hàng thường
    expect(regionPriceMul(tayNguyen.items[0], [banner], new Set(tayNguyen.items), {})).toBe(1 + FLAG_TIER_PRICE[1]);
    expect(regionPriceMul(tayNguyen.items[0], [banner], new Set(tayNguyen.items), served)).toBe(1 + FLAG_TIER_PRICE[2]);
    // thiếu 1 loại là mất trọn thưởng — buộc giữ đủ bộ bày kệ
    const thieu = new Set(tayNguyen.items); thieu.delete(tayNguyen.items[0]);
    expect(regionPriceMul(tayNguyen.items[0], [banner], thieu, served)).toBe(1);
  });

  it('stockedProductIds đọc đúng hàng trên kệ, bỏ kệ hỏng/dùng thử', () => {
    const list = [shelfWith([['rg_kho_tom', 3], ['rg_tra_shan', 0]]), mkFurn('shelf', { broken: true }, shelfTiers([{ productId: 'rg_com_lang', count: 2 }, { productId: null, count: 0 }, { productId: null, count: 0 }, { productId: null, count: 0 }, { productId: null, count: 0 }, { productId: null, count: 0 }]))];
    const ids = stockedProductIds(list);
    expect(ids.has('rg_kho_tom')).toBe(true);
    expect(ids.has('rg_tra_shan')).toBe(false); // count 0
    expect(ids.has('rg_com_lang')).toBe(false); // kệ hỏng
  });

  it('bảng hiệu gắn vào sàn 0 tầng (decor-only) — không chiếm ô hàng', () => {
    for (const flag of REGION_FLAGS) {
      const def = furnitureDef(flag.type as Parameters<typeof furnitureDef>[0]);
      expect(def.tiers).toBe(0);
      expect(def.slots).toBe(0);
    }
  });
});
