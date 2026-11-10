import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import { buildStanceCtx } from '../data/stanceData';
import {
  isSpecialtyProduct, stanceFit, fitBinhDan, fitDacSan, fitTienLoi, leaningStance,
  binhDanCheapRatio, type StanceCtx,
} from '../data/stance';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { REGION_PRODUCTS } from '../data/regionSpecialty';

/**
 * GĐ Hệ3-L1 (SPEC-CHIEU-SAU §3.4) — ĐỊNH VỊ TIỆM: CHỈ ĐO.
 * `stanceFit(ctx)` đo 3 hướng (Bình dân / Đặc sản / Tiện lợi) khớp X/Y tiêu chí, KHÔNG đổi kinh tế.
 * Cổng cấp 60 (R3 L1) → golden L30 không đổi; tất cả hàm thuần đọc số liệu đã đo.
 */

const base: StanceCtx = {
  pricedShelfCells: 10, cheapCells: 0, overCells: 0, specialtyCells: 0,
  qualityRating: 3.5, openHours: 15, servicesCount: 0, machinesCount: 0, walkoutQueueRate: 0,
};

describe('isSpecialtyProduct — hàng đặc sản (SPEC §3.4)', () => {
  it('món nấu / hàng nhà làm–hàng xóm / đặc sản vùng → true; hàng thường → false', () => {
    const [cooked] = [...COOKED_PRODUCT_IDS];
    const [neighbor] = [...NEIGHBOR_ONLY_IDS];
    const region = REGION_PRODUCTS[0].id;
    expect(isSpecialtyProduct(cooked)).toBe(true);
    expect(isSpecialtyProduct(neighbor)).toBe(true);
    expect(isSpecialtyProduct(region)).toBe(true);
    expect(isSpecialtyProduct('mi')).toBe(false);
  });
  it('nhà trồng (homegrown) cũng tính là đặc sản', () => {
    expect(isSpecialtyProduct('cai_ngot', { cai_ngot: 3 })).toBe(true);
    expect(isSpecialtyProduct('cai_ngot', {})).toBe(false);
  });
});

describe('fitBinhDan — rẻ nhất hẻm', () => {
  it('khớp khi ≥70% ô kệ ≤97% thị trường và không món nào >110%', () => {
    const good = { ...base, pricedShelfCells: 10, cheapCells: 7, overCells: 0 };
    expect(binhDanCheapRatio(good)).toBe(0.7);
    expect(fitBinhDan(good).fit).toBe(true);
    const short = { ...base, pricedShelfCells: 10, cheapCells: 6, overCells: 0 };
    expect(fitBinhDan(short).fit).toBe(false);
    const over = { ...base, pricedShelfCells: 10, cheapCells: 7, overCells: 1 };
    expect(fitBinhDan(over).fit).toBe(false);
  });
});

describe('fitDacSan — ngon có tiếng', () => {
  it('khớp khi ≥40% ô kệ đặc sản và danh tiếng chất lượng ≥4,0', () => {
    const good = { ...base, pricedShelfCells: 10, specialtyCells: 4, qualityRating: 4.0 };
    expect(fitDacSan(good).fit).toBe(true);
    const shortSpec = { ...base, pricedShelfCells: 10, specialtyCells: 3, qualityRating: 4.2 };
    expect(fitDacSan(shortSpec).fit).toBe(false);
    const lowRating = { ...base, pricedShelfCells: 10, specialtyCells: 5, qualityRating: 3.9 };
    expect(fitDacSan(lowRating).fit).toBe(false);
  });
});

describe('fitTienLoi — lúc nào cũng mở', () => {
  it('khớp khi mở ≥18h + ≥4 dịch vụ + ≥3 máy + khách bỏ chờ ≤5%', () => {
    const good = { ...base, openHours: 24, servicesCount: 4, machinesCount: 3, walkoutQueueRate: 0.05 };
    expect(fitTienLoi(good).fit).toBe(true);
    const fewService = { ...good, servicesCount: 3 };
    expect(fitTienLoi(fewService).fit).toBe(false);
    const longQueue = { ...good, walkoutQueueRate: 0.06 };
    expect(fitTienLoi(longQueue).fit).toBe(false);
    const notOpen = { ...good, openHours: 15 };
    expect(fitTienLoi(notOpen).fit).toBe(false);
  });
});

describe('stanceFit / leaningStance', () => {
  it('trả đủ 3 hướng, mỗi hướng có checks + fit', () => {
    const r = stanceFit(base);
    expect(r.map((x) => x.id)).toEqual(['binh_dan', 'dac_san', 'tien_loi']);
    for (const f of r) expect(f.checks.length).toBeGreaterThan(0);
  });
  it('leaningStance: nghiêng về hướng khớp nhiều tiêu chí nhất; nếu bằng nhau lấy hướng đầu', () => {
    const binhDan = { ...base, pricedShelfCells: 10, cheapCells: 8 }; // 2/2 → Bình dân
    expect(leaningStance(binhDan)).toBe('binh_dan');
    const tienLoi = { ...base, openHours: 24, servicesCount: 5, machinesCount: 4 }; // 4/4 → Tiện lợi
    expect(leaningStance(tienLoi)).toBe('tien_loi');
  });
});

describe('buildStanceCtx — đọc từ GameState (không đổi state)', () => {
  it('ván mới: kệ khai trương (mi/nuoc/banh) giá gốc → tỉ lệ bình dân theo giá mặc định', () => {
    const s = newGameData();
    const ctx = buildStanceCtx(s);
    expect(ctx.pricedShelfCells).toBeGreaterThan(0);
    expect(ctx.servicesCount).toBe(0);
    expect(ctx.openHours).toBe(15);
  });
  it('đếm máy tự phục vụ từ nội thất đã đặt', () => {
    const s = newGameData();
    s.furniture.push({ uid: 99, type: 'claw_machine', x: 0, z: 0, rot: 0, tiers: [], broken: false } as never);
    expect(buildStanceCtx(s).machinesCount).toBe(1);
  });
});
