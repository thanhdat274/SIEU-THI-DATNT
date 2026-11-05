import { describe, expect, it } from 'vitest';
import { theftSpawnChance, theftCatchChance, theftToday } from '../data/theftRisk';
import { GUARD_DETECT } from '../data/staff';
import { RISK_RULES } from '../data/risks';
import { hirePayoff } from '../data/hirePayoff';

/**
 * GĐ1287 — Khóa BẤT BIẾN TRUNG THỰC giữa GIÁ TRỊ BẢO VỆ (hirePayoff guard, GĐ1269) và
 * THƯỚC RÒ TRỘM (theftToday/theftCatchChance/theftSpawnChance, GĐ1211/1212/1215/236):
 *   - `hirePayoff` guard tính savedPerDay = expectedThieves × marginal × giỏ, với
 *     marginal = min(1, catchGuard) − min(1, catchBase), và theftToday.leakPerThief = spawn × (1 − min(1, catchBase)).
 *   - BẤT BIẾN 1 (không bịa tiền): marginal ≤ leakRate (1 − min(1, catchBase)) — bảo vệ chỉ được phép
 *     "khép" ĐÚNG phần đang LỌT, không bao giờ hơn. Bằng khi bảo vệ chạm trần phát hiện (catchGuard ≥ 1)
 *     → lúc đó savedPerDay = ĐÚNG lượng lọt hiện tại × giỏ; nhỏ hơn khi chưa chạm trần.
 *   - BẤT BIẾN 2 (không lặp lời khuyên / không kể lại phần đã chặn): spawn đã nhân chó×camera (GĐ1283),
 *     catchBase thấp (đã trừ phòng thủ có) → marginal chỉ là Δ; khi phòng thủ đã gần chắc (catchBase ≥ 1,
 *     marginal ≤ 0) hoặc đã có bảo vệ (guardCount>0) → hirePayoff trả ok:false (không ồn, không 'thuê thêm' lần hai).
 * Đây là tính chất hai thẻ đang DỰA VÀO khi hiện đồng thời "camera tiết kiệm ~X" (theftRisk) và
 * "thuê bảo vệ giữ ~Y" (hirePayoff guard); khóa lại để phòng hồi quy (nếu ai đó đổi hirePayoff sang tính
 * toàn bộ pool hoặc đổi catch/sắp khỏi đúng công thức là test đỏ ngay).
 */

describe('GĐ1287 — coherence: giá trị bảo vệ (hirePayoff guard) = đúng phần LỌT trộm đang đo (theftToday)', () => {
  const C = 1000; // khách hôm nay
  const R = 5_000_000; // doanh thu → giỏ bán lẻ 5000
  const basket = R / C;

  it('bảo vệ chạm trần phát hiện → marginal = đúng leakRate hiện tại → savedPerDay = lượng lọt × giỏ (không bịa)', () => {
    const spawn = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: true, hasCamera: false });
    const base = theftCatchChance({ hasDog: true, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false });
    const gd = theftCatchChance({ hasDog: true, hasCamera: false, guardOnDuty: true, cashierStaffed: false, hasSharpEye: false });
    // trần phát hiện: chó ×0.45 spawn; guard nâng PHÁT HIỆN lên GUARD_DETECT → catchGuard = 1.17 ≥ 1
    expect(Math.min(1, gd)).toBe(1);
    const marginal = Math.min(1, gd) - Math.min(1, base);
    const leakRate = 1 - Math.min(1, base);
    expect(marginal).toBeCloseTo(leakRate, 10); // bảo vệ khép đúng phần lọt, không hơn
    // savedPerDay (công thức hirePayoff) = expectedThieves × marginal × giỏ
    const savedPerDay = (C * spawn) * marginal * basket;
    // thước đo độc lập theftToday: lượng lọt hiện tại = khách × leakPerThief × giỏ
    const leakPerThief = theftToday({ hasDog: true, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }).leakPerThief;
    const currentLeak = C * leakPerThief * basket;
    expect(savedPerDay).toBeCloseTo(currentLeak, 6); // giá trị bảo vệ = ĐÚNG tiền đang lọt, không bịa
    // hirePayoff thực sự đồng ý (ok + có số đ/ngày)
    const hp = hirePayoff('guard', { wage: 500000, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 0, level: 30, customers: C, revenue: R, guardCount: 0, cashierStaffed: false, hasDog: true, hasCamera: false, hasSharpEye: false });
    expect(hp.ok).toBe(true);
    expect(hp.line).toContain('đ/ngày');
  });

  it('bảo vệ CHƯA chạm trần (không chó/camera) → marginal < leakRate: chỉ khép phần tới, không khép toàn bộ lọt', () => {
    const spawn = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: false, hasCamera: false });
    const base = theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false });
    const gd = theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: true, cashierStaffed: false, hasSharpEye: false });
    expect(base).toBe(RISK_RULES.theft.detectNobody); // 0.1 — không ai đứng quầy
    expect(gd).toBe(GUARD_DETECT); // 0.92 < 1 — CHƯA chạm trần
    const marginal = Math.min(1, gd) - Math.min(1, base); // 0.82
    const leakRate = 1 - Math.min(1, base);                // 0.9
    expect(marginal).toBeLessThan(leakRate); // trung thực: bảo vệ chưa chắc chắn tuyệt đối
    const savedPerDay = (C * spawn) * marginal * basket;
    const currentLeak = C * (spawn * (1 - Math.min(1, base))) * basket;
    expect(savedPerDay).toBeLessThan(currentLeak); // không bao giờ hơn tiền đang lọt
  });

  it('phòng thủ đã gần chắc (catchBase ≥ 1, marginal ≤ 0) → hirePayoff trả ok:false (không thổi giá trị bảo vệ)', () => {
    // cashier + chó + camera + Mắt tinh: base = 0.55+0.25+0.3+0.3 = 1.4 → min(1,·)=1 → leak 0 → marginal=0
    const base = theftCatchChance({ hasDog: true, hasCamera: true, guardOnDuty: false, cashierStaffed: true, hasSharpEye: true });
    expect(Math.min(1, base)).toBe(1);
    const hp = hirePayoff('guard', { wage: 300000, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 0, level: 30, customers: C, revenue: R, guardCount: 0, cashierStaffed: true, hasDog: true, hasCamera: true, hasSharpEye: true });
    expect(hp.ok).toBe(false); // không còn phần lọt để bảo vệ bịt → không nói "thuê giữ chắc"
    expect(hp.line).toBe('');
  });

  it('đã có bảo vệ (guardCount>0) → ok:false (không lặp lời khuyên thuê lần hai / không kể lại)', () => {
    const hp = hirePayoff('guard', { wage: 300000, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 0, level: 30, customers: C, revenue: R, guardCount: 1, cashierStaffed: false, hasDog: false, hasCamera: false, hasSharpEye: false });
    expect(hp.ok).toBe(false);
    expect(hp.line).toBe('');
  });

  it('không phơi nhiễm trộm (customers=0) → savedPerDay=0, ok:false (không bịa số khi không có khách)', () => {
    const spawn = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: false, hasCamera: false });
    const base = theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false });
    const gd = theftCatchChance({ hasDog: false, hasCamera: false, guardOnDuty: true, cashierStaffed: false, hasSharpEye: false });
    const saved = (0 * spawn) * (Math.min(1, gd) - Math.min(1, base));
    expect(saved).toBe(0);
    const hp = hirePayoff('guard', { wage: 100000, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 0, level: 30, customers: 0, revenue: 0, guardCount: 0, cashierStaffed: false, hasDog: false, hasCamera: false, hasSharpEye: false });
    expect(hp.ok).toBe(false);
  });

  it('THUẦN — cùng đầu vào cho cùng kết quả (không RNG)', () => {
    const a = { wage: 300000, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 0, level: 30, customers: C, revenue: R, guardCount: 0, cashierStaffed: false, hasDog: true, hasCamera: false, hasSharpEye: false };
    expect(hirePayoff('guard', a)).toEqual(hirePayoff('guard', a));
    expect(theftToday({ hasDog: true, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }))
      .toEqual(theftToday({ hasDog: true, hasCamera: false, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false }));
  });
});
