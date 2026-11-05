import { describe, expect, it } from 'vitest';
import { hirePayoff, HIRE_SHELF_MIN_LOSS } from '../data/hirePayoff';

/**
 * GĐ1292 — Khóa BẤT BIẾN TRUNG THỰC "TƯ VẤN THUÊ KHÔNG DOUBLE-COUNT cùng một lỗ giữa các vai".
 *
 * Tab Tuyển dụng (hirePayoff, GĐ1267/1269) đưa TƯ VẤN cho 4 vai kinh tế, mỗi vai vá ĐÚNG MỘT tín hiệu
 * đo được RIÊNG, và hai vai "giữ-mặt-tiền" (cashier/customer_care) vá CÙNG một lỗ chờ-quầy:
 *   - cashier        → waitMissed        (khách bỏ vì chờ quầy hôm nay)
 *   - customer_care  → waitMissed        (CÙNG tín hiệu — vá cùng một lỗ, không phải lỗ thứ hai)
 *   - stocker        → shelfMissInStorageLoss (lỡ vì kệ TRỐNG mà KHO CÒN)
 *   - cleaner        → dirtLoss          (bẩn mất lượt ghé)
 *   - guard          → phơi nhiễm trộm   (thuê bảo vệ khép phần LỌT, GĐ1269/1287)
 * BẤT BIẾN (nhân văn "mọi lời khuyên phải dựa trên nguồn trung thực, Nguyên tắc a"):
 * 1. PHÂN HOẠCH — ngoại trừ cashier/customer_care (cùng `waitMissed` theo THIẾT KẾ), không ai khác
 *    nhận tín hiệu của vai khác: kệ trống chỉ lên tiếng qua stocker, bẩn chỉ qua cleaner, trộm chỉ qua
 *    guard. Nếu sau này ai đó cho cashier cháy khi kệ trống (hoặc stocker khi chờ-về) là "một lỗ bị
 *    hai vai đòi" → phình tư vấn, test đỏ.
 * 2. SAME-LOSS KHÔNG CỘNG DỒN — cashier và customer_care trích ĐÚNG con số đo được `waitMissed`
 *    (không nhân/phân số để tạo cảm giác "hai lỗ cộng dồn"); khi waitMissed đổi, cả hai nói số MỚI này.
 * 3. IM KHI KHÔNG CÓ TÍN HIỆU — không bịa lỗ: waitMissed=0 → cả hai vai chờ đều im; shelf dưới ngưỡng
 *    → stocker im (không ồn đầu ngày).
 * 4. GUARD CHỈ VÌ TRỘM — chờ quầy đơn thuần (không phơi nhiễm trộm) KHÔNG kích bảo vệ; chỉ khi có
 *    phơi nhiễm THẬT (đông khách, chưa phòng thủ) bảo vệ mới lên tiếng.
 * Đây là tính chất các thẻ Tuyển dụng đang dựa vào khi hiện đồng thời nhiều gợi ý thuê; khóa để phòng
 * hồi quy. Test THUẦN — nhận dữ liệu đo được, không đổi production/state/save/kinh tế/seed (Luật 5).
 */
describe('GĐ1292 — coherence: tư vấn thuê KHÔNG double-count cùng một lỗ giữa các vai', () => {
  const base = {
    wage: 300000,
    waitMissed: 0,
    shelfMissInStorageLoss: 0,
    dirt: 0,
    level: 30,
    customers: 1000,
    revenue: 5_000_000,
    guardCount: 0,
    cashierStaffed: false,
    hasDog: false,
    hasCamera: false,
    hasSharpEye: false,
  };

  it('PHÂN HOẠCH — mỗi vai kinh tế vá ĐÚNG tín hiệu của mình, không nhận lỗ của vai khác', () => {
    const waitOnly = { ...base, waitMissed: 12, shelfMissInStorageLoss: 0, dirt: 0 };
    const shelfOnly = { ...base, waitMissed: 0, shelfMissInStorageLoss: HIRE_SHELF_MIN_LOSS + 1, dirt: 0 };
    const dirtOnly = { ...base, waitMissed: 0, shelfMissInStorageLoss: 0, dirt: 60 };

    // cashier: chỉ cháy với waitMissed; kệ trống / bẩn không phải lỗ của thu ngân
    expect(hirePayoff('cashier', waitOnly).ok).toBe(true);
    expect(hirePayoff('cashier', shelfOnly).ok).toBe(false);
    expect(hirePayoff('cashier', dirtOnly).ok).toBe(false);

    // stocker: chỉ cháy với kệ trống dù kho còn; chờ-về / bẩn không phải lỗ người xếp
    expect(hirePayoff('stocker', shelfOnly).ok).toBe(true);
    expect(hirePayoff('stocker', waitOnly).ok).toBe(false);
    expect(hirePayoff('stocker', dirtOnly).ok).toBe(false);

    // cleaner: chỉ cháy với bẩn; chờ-về / kệ trống không phải lỗ lao công
    expect(hirePayoff('cleaner', dirtOnly).ok).toBe(true);
    expect(hirePayoff('cleaner', waitOnly).ok).toBe(false);
    expect(hirePayoff('cleaner', shelfOnly).ok).toBe(false);
  });

  it('SAME-LOSS — cashier & customer_care vá CÙNG một lỗ chờ-quầy: trích đúng con số đo được, không cộng dồn', () => {
    const a = hirePayoff('cashier', { ...base, waitMissed: 9 });
    const b = hirePayoff('customer_care', { ...base, waitMissed: 9 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    // Cả hai nói ĐÚNG "9 khách" — cùng một lỗ, không ai bịa số gấp đôi/phân số để thành "hai lỗ cộng dồn"
    expect(a.line).toContain('9 khách');
    expect(b.line).toContain('9 khách');
    // waitMissed đổi → cả hai cùng theo số MỚI (nguồn duy nhất, không lệch)
    expect(hirePayoff('cashier', { ...base, waitMissed: 18 }).line).toContain('18 khách');
    expect(hirePayoff('customer_care', { ...base, waitMissed: 18 }).line).toContain('18 khách');
  });

  it('IM KHI KHÔNG CÓ TÍN HIỆU — không bịa lỗ: không ai chờ → hai vai chờ đều im; kệ dưới ngưỡng → stocker im', () => {
    expect(hirePayoff('cashier', base).ok).toBe(false);
    expect(hirePayoff('customer_care', base).ok).toBe(false);
    expect(hirePayoff('stocker', { ...base, shelfMissInStorageLoss: HIRE_SHELF_MIN_LOSS - 1 }).ok).toBe(false);
    // im cả line rỗng (không lọt chữ mồi vào UI)
    expect(hirePayoff('cashier', base).line).toBe('');
  });

  it('GUARD CHỈ VÌ TRỘM — chờ quầy đơn thuần (không phơi nhiễm) KHÔNG kích bảo vệ; có phơi nhiễm thật mới lên tiếng', () => {
    // customers=0 → không phơi nhiễm trộm, dù đang mất khách vì chờ (waitMissed>0) → bảo vệ im
    expect(hirePayoff('guard', { ...base, customers: 0, revenue: 0, waitMissed: 20 }).ok).toBe(false);
    // có phơi nhiễm trộm thật (đông khách, chưa phòng thủ) → bảo vệ lên tiếng (GĐ1287 khóa marginal ≤ leakRate)
    const guard = hirePayoff('guard', base);
    expect(guard.ok).toBe(true);
    expect(guard.line).toContain('đ/ngày');
  });

  it('THUẦN — cùng đầu vào cho cùng kết quả (không RNG)', () => {
    expect(hirePayoff('guard', base)).toEqual(hirePayoff('guard', base));
    expect(hirePayoff('cleaner', { ...base, dirt: 60 })).toEqual(hirePayoff('cleaner', { ...base, dirt: 60 }));
    expect(hirePayoff('stocker', { ...base, shelfMissInStorageLoss: HIRE_SHELF_MIN_LOSS }))
      .toEqual(hirePayoff('stocker', { ...base, shelfMissInStorageLoss: HIRE_SHELF_MIN_LOSS }));
  });
});
