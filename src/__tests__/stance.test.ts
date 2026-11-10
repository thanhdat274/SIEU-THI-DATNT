import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import { buildStanceCtx } from '../data/stanceData';
import {
  isSpecialtyProduct, stanceFit, fitBinhDan, fitDacSan, fitTienLoi, leaningStance,
  binhDanCheapRatio, type StanceCtx,
  STANCE_TIER_DAYS, stanceTier, applyStanceDay, stanceActive,
  stanceTraffic, stanceLowCap, stanceOverSensitivity, stanceDishMul, stancePullSlope,
} from '../data/stance';
import { PRICE_RULES } from '../data/pricing';
import { referenceSell } from '../data/pricing';import { COOKED_PRODUCT_IDS } from '../data/recipes';
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

describe('Hệ3-L3 — bậc biển & tích lũy ngày khớp (SPEC §3.5)', () => {
  it('bậc theo tổng ngày khớp 3/10/21/35/50', () => {
    expect(stanceTier(0)).toBe(0);
    expect(stanceTier(2)).toBe(0);
    expect(stanceTier(3)).toBe(1);
    expect(stanceTier(10)).toBe(2);
    expect(stanceTier(21)).toBe(3);
    expect(stanceTier(35)).toBe(4);
    expect(stanceTier(50)).toBe(5);
    expect(stanceTier(80)).toBe(5);
    expect(STANCE_TIER_DAYS.length).toBe(5);
  });
  it('khớp → +1 ngày và xoá missStreak; lệch 1-2 ngày không phạt', () => {
    const base = { id: 'binh_dan' as const, since: 100, fitDays: 5, missStreak: 0 };
    expect(applyStanceDay(base, true, 100).fitDays).toBe(6);
    expect(applyStanceDay(base, true, 100).missStreak).toBe(0);
    const miss1 = applyStanceDay(base, false, 100);
    expect(miss1.fitDays).toBe(5);
    expect(miss1.missStreak).toBe(1);
    const miss2 = applyStanceDay(miss1, false, 100);
    expect(miss2.missStreak).toBe(2);
    expect(miss2.fitDays).toBe(5); // 1-2 ngày lỡ tay không sao
  });
  it('lệch 3 ngày liền → tụt 1 bậc (fitDays về ngưỡng bậc dưới), missStreak về 0', () => {
    const b3 = { id: 'binh_dan' as const, since: 100, fitDays: 21, missStreak: 0 }; // bậc 3
    const m1 = applyStanceDay(b3, false, 100);
    const m2 = applyStanceDay(m1, false, 100);
    const dropped = applyStanceDay(m2, false, 100);
    expect(dropped.fitDays).toBe(10); // ngưỡng bậc 2
    expect(stanceTier(dropped.fitDays)).toBe(2);
    expect(dropped.missStreak).toBe(0);
  });
  it('đang làm lại biển (switchUntil chưa qua) thì không tích lũy, không hiệu lực', () => {
    const st = { id: 'binh_dan' as const, since: 100, fitDays: 21, missStreak: 0, switchUntil: 110 };
    expect(stanceActive(st, 100)).toBe(false);
    expect(applyStanceDay(st, false, 100)).toEqual({ id: 'binh_dan', since: 100, fitDays: 21, missStreak: 0, switchUntil: 110 });
    expect(stanceActive({ ...st, switchUntil: 105 } as never, 110)).toBe(true);
  });
});

describe('Hệ3-L3 — hiệu ứng kinh tế Bình dân (SPEC §3.4), neutral khi không treo biển', () => {
  const binh5 = { stance: { id: 'binh_dan' as const, since: 1, fitDays: 50, missStreak: 0 } }; // bậc 5
  const binh3 = { stance: { id: 'binh_dan' as const, since: 1, fitDays: 21, missStreak: 0 } }; // bậc 3
  const dac1 = { stance: { id: 'dac_san' as const, since: 1, fitDays: 21, missStreak: 0 } }; // hướng khác chưa có hiệu ứng
  it('Bình dân bậc 5: khách ghé +20%, trần rẻ kéo 1.15→1.25, độ dốc rẻ kéo ×9, chê đắt ×1.5, sao món nửa', () => {
    const ref = referenceSell('nuoc'); // thị trường nước suối (món có thật)
    expect(stanceTraffic(binh5)).toBeCloseTo(1.2);
    expect(stanceLowCap(binh5)).toBeCloseTo(1.25);
    expect(stancePullSlope(binh5)).toBeCloseTo(1 + 3); // ×4 ở bậc 5
    expect(stanceOverSensitivity(binh5, 'nuoc', ref * 1.5)).toBeCloseTo(1.5);
    expect(stanceOverSensitivity(binh5, 'nuoc', ref * 0.5)).toBe(1); // bán ≤ thị trường → không chê thêm
    expect(stanceDishMul(binh5)).toBeCloseTo(0.5);
  });
  it('không treo biển → mọi hệ số trung tính (không phá golden / nền kinh tế)', () => {
    expect(stanceTraffic({})).toBe(1);
    expect(stanceLowCap({})).toBe(PRICE_RULES.lowPriceDemandCap);
    expect(stancePullSlope({})).toBe(1);
    expect(stanceOverSensitivity({}, 'mi', 99999)).toBe(1);
    expect(stanceDishMul({})).toBe(1);
  });
  it('hướng khác (Đặc sản) chưa có hiệu ứng ở L3 → neutral', () => {
    expect(stanceTraffic(dac1)).toBe(1);
    expect(stancePullSlope(dac1)).toBe(1);
    expect(stanceOverSensitivity(dac1, 'mi', 99999)).toBe(1);
    expect(stanceDishMul(dac1)).toBe(1);
  });
  it('bậc 3 (khung §3.8): hệ số tuyến tính ~60% của bậc 5', () => {
    const ref = referenceSell('nuoc');
    expect(stanceTraffic(binh3)).toBeCloseTo(1.12);
    expect(stanceLowCap(binh3)).toBeCloseTo(1.21);
    expect(stancePullSlope(binh3)).toBeCloseTo(1 + 3 * 0.6);
    expect(stanceOverSensitivity(binh3, 'nuoc', ref * 1.5)).toBeCloseTo(1.3);
    expect(stanceDishMul(binh3)).toBeCloseTo(0.7);
  });
});
