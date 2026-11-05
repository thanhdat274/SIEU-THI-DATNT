import { describe, expect, it } from 'vitest';
import { theftRisk, theftSpawnChance, theftCatchChance, THEFT_DOG_RETAIN, THEFT_CAMERA_RETAIN, THEFT_DOG_CATCH, THEFT_CAMERA_CATCH } from '../data/theftRisk';
import { GUARD_DETECT } from '../data/staff';

/**
 * GĐ1283 — Khóa BẤT BIẾN TRUNG THỰC của nhóm helper CHỐNG TRỘM (không double-count):
 *   - `theftSpawnChance` nhân các mức phòng thủ (chó ×0.45, camera ×0.7) — chúng COMPOSE (×), không
 *     cộng chồng. Nếu ai đó đổi sang cộng sẽ phình P(trộm) giảm sai → làm giá trị phòng thủ "lớn hơn
 *     thật" (over-count tiền bảo vệ).
 *   - `theftRisk.cameraSavesPerDay` là MARGINAL trên nền phòng thủ ĐÃ CÓ (có chó thì nền spawn đã nhỏ)
 *     → khi có chó, camera "tiết kiệm ước" PHẢI nhỏ hơn khi không chó. Nếu ai đó tính trên toàn bộ
 *     pool (bỏ sót chó) sẽ lặp lại phần chó đã kìm → nói camera giữ nhiều tiền hơn thật.
 *   - Đã lắp camera → cameraSavesPerDay = 0 (không báo lại lần hai).
 * Đây là tính chất các thẻ Rủi ro (Upgrades camera) đang dựa vào; khóa để phòng hồi quy.
 */

const F = 1000; // khách hôm nay
const R = 5_000_000; // doanh thu hôm nay → giỏ bán lẻ 5000

const risk = (hasDog: boolean, hasCamera: boolean) =>
  theftRisk({ level: 30, customers: F, revenue: R, hasCamera, hasDog });

describe('GĐ1283 — coherence: phòng thủ chống trộm không double-count (spawn × composes, camera marginal)', () => {
  it('theftSpawnChance: chó × camera COMPOSE (×), không cộng chồng — P sinh trộm không phình', () => {
    const none = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: false, hasCamera: false });
    const dog = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: true, hasCamera: false });
    const cam = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: false, hasCamera: true });
    const both = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: true, hasCamera: true });
    expect(dog).toBeCloseTo(none * THEFT_DOG_RETAIN, 10);            // ×0.45
    expect(cam).toBeCloseTo(none * THEFT_CAMERA_RETAIN, 10);         // ×0.7
    expect(both).toBeCloseTo(none * THEFT_DOG_RETAIN * THEFT_CAMERA_RETAIN, 10); // tích, KHÔNG cộng
    // cả hai phòng thủ → P < từng cái một (không thể "phình" lên cao hơn)
    expect(both).toBeLessThan(dog);
    expect(both).toBeLessThan(cam);
  });

  it('cameraSavesPerDay là MARGINAL: có chó → nền spawn đã nhỏ → camera tiết kiệm ÍT hơn khi không chó', () => {
    const savesNoDog = risk(false, false).cameraSavesPerDay; // full pool × 0.3
    const savesWithDog = risk(true, false).cameraSavesPerDay; // (pool đã ×0.45) × 0.3
    expect(savesNoDog).toBeGreaterThan(0);
    expect(savesWithDog).toBeGreaterThan(0);
    expect(savesWithDog).toBeLessThan(savesNoDog); // không lặp phần chó đã kìm
    expect(savesWithDog).toBeCloseTo(savesNoDog * THEFT_DOG_RETAIN, 6); // đúng bằng thị phần còn lại
  });

  it('đã lắp camera → cameraSavesPerDay = 0 (không báo lại lần hai)', () => {
    expect(risk(true, true).cameraSavesPerDay).toBe(0);
    expect(risk(false, true).cameraSavesPerDay).toBe(0);
  });

  it('bảo vệ (guard) MARGINAL: chỉ tính phần LỌT mà bảo vệ khép thêm, KHÔNG toàn bộ pool', () => {
    // Guard trong hirePayoff (GĐ1269) = expectedThieves × max(0, catchGuard − catchBase) × basket.
    // Lúc không chó/camera/quầy/Mắt tinh: catchBase = detectNobody; catchGuard = GUARD_DETECT 0.92.
    // Kiểm tra tính MARGINAL ở mức helper: catchChance không bao giờ vượt trần → bảo vệ chỉ bịt phần
    // lọt còn lại, không "tính lại" phần đã chặn bởi chó/camera (đã trừ trong spawn).
    // (Không nhân đôi: spawn đã nhân chó/camera, catch chỉ là Δ — khớp with các test GĐ1211/GĐ1269.)
    const base = theftCatchChance({ hasDog: true, hasCamera: true, guardOnDuty: false, cashierStaffed: false, hasSharpEye: false });
    const gd = theftCatchChance({ hasDog: true, hasCamera: true, guardOnDuty: true, cashierStaffed: false, hasSharpEye: false });
    // GĐ1211: chó + camera vẫn cộng lên khi có bảo vệ (guard là NỀN GUARD_DETECT) — không mất phần chó/camera.
    expect(gd).toBe(THEFT_DOG_CATCH + THEFT_CAMERA_CATCH + GUARD_DETECT);
    const marginal = Math.min(1, gd) - Math.min(1, base);
    expect(marginal).toBeGreaterThan(0); // vẫn còn phần lọt để bảo vệ bịt (có tác dụng)
    expect(marginal).toBeLessThan(1); // không bao giờ "bắt hơn 100%" — marginal, không toàn bộ
  });

  it('thuần — cùng đầu vào cho cùng kết quả', () => {
    expect(risk(true, false)).toEqual(risk(true, false));
    expect(theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: true, hasCamera: true }))
      .toBe(theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog: true, hasCamera: true }));
  });
});
