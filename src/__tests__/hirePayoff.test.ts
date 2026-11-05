import { describe, expect, it } from 'vitest';
import { hirePayoff, HIRE_SHELF_MIN_LOSS, GUARD_MIN_SAVE } from '../data/hirePayoff';

/** GĐ1267 + GĐ1269 — soi TUYỂN DỤNG: "thuê vai này vá lỗ nào đang rò khách/tiền hôm nay?"
 *  Helper THUẦN — không đổi state/kinh tế; chỉ đọc tín hiệu THẬT đang đo + hằng số game. */

const base = {
  wage: 100_000,
  waitMissed: 0,
  shelfMissInStorageLoss: 0,
  dirt: 0,
  level: 20,
  customers: 0,
  revenue: 0,
};

describe('cashier — vá lỗ khách bỏ vì chờ quầy', () => {
  it('hôm nay có khách bỏ vì chờ thì nhắc đúng số', () => {
    const p = hirePayoff('cashier', { ...base, waitMissed: 6 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('6');
  });

  it('không ai bỏ vì chờ thì không ồn', () => {
    expect(hirePayoff('cashier', base).ok).toBe(false);
  });
});

describe('customer_care — giữ khách đang chờ', () => {
  it('có khách bỏ vì chờ thì nhắc thêm người hỏi thăm', () => {
    const p = hirePayoff('customer_care', { ...base, waitMissed: 3 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('3');
  });

  it('không có khách chờ thì không ồn', () => {
    expect(hirePayoff('customer_care', base).ok).toBe(false);
  });
});

describe('stocker — vá lỗ kệ trống dù kho còn', () => {
  it('lỡ kệ trống-dù-kho-còn đáng kể thì nhắc thêm người xếp', () => {
    const p = hirePayoff('stocker', { ...base, shelfMissInStorageLoss: 120_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('120.000');
  });

  it('lỡ nhỏ dưới ngưỡng thì không ồn', () => {
    expect(hirePayoff('stocker', { ...base, shelfMissInStorageLoss: HIRE_SHELF_MIN_LOSS - 1 }).ok).toBe(false);
  });
});

describe('cleaner — vá lỗ sàn bẩn mất khách', () => {
  it('sàn bẩn đang mất từ mốc cảnh báo thì nhắc lao công kèm tiền', () => {
    // dirt 70 → mất ~28% lượt; level 20 khách/ngày đủ để vượt mốc warn (4 khách)
    const p = hirePayoff('cleaner', { ...base, dirt: 70, level: 20, customers: 100, revenue: 500_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('khách');
  });

  it('sạch sẽ thì không ồn', () => {
    expect(hirePayoff('cleaner', { ...base, dirt: 5, level: 20, customers: 100, revenue: 500_000 }).ok).toBe(false);
  });

  it('khách mất dưới mốc warn (bẩn ít / cấp thấp ít khách) thì không ồn — thể hiện ngưỡng thật', () => {
    // dirt 30 → mất 12% lượt; level 0 có 20 khách/ngày → 2.4 khách < warn (4)
    expect(hirePayoff('cleaner', { ...base, dirt: 30, level: 0, customers: 5, revenue: 10_000 }).ok).toBe(false);
  });
});

describe('guard — giá trị bảo vệ so với phơi nhiễm trộm (GĐ1269)', () => {
  /** Tiệm đông khách, chưa có phòng thủ → trộm kỳ vọng lọt đáng kể, bảo vệ nâng P(bắt) lên 0.92. */
  const busy = { ...base, customers: 200, revenue: 2_000_000, wage: 100_000 };

  it('chưa có bảo vệ + trộm đang lọt → nhắc đúng số vụ + tiền', () => {
    const p = hirePayoff('guard', busy);
    expect(p.ok).toBe(true);
    expect(p.line).toContain('vụ lọt');
    expect(p.line).toContain('24.600'); // 200×0.015×0.82×10.000
  });

  it('đã có bảo vệ trong đội → không nói "thuê thêm" (không ồn)', () => {
    expect(hirePayoff('guard', { ...busy, guardCount: 1 }).ok).toBe(false);
  });

  it('phòng thủ hiện tại đã gần bắt chắc (chó+camera+quầy+Mắt tinh) → bảo vệ thêm 0 → không nói quá', () => {
    const p = hirePayoff('guard', {
      ...busy, cashierStaffed: true, hasDog: true, hasCamera: true, hasSharpEye: true,
    });
    expect(p.ok).toBe(false); // catchBase đã ≥1, marginal 0 — trung thực
  });

  it('cửa tiệm vắng / không phơi nhiễm trộm → không ồn', () => {
    expect(hirePayoff('guard', { ...base, customers: 0 }).ok).toBe(false);
  });

  it('giá trị nhỏ dưới ngưỡng (GUARD_MIN_SAVE) → không ồn tránh nhiễu', () => {
    const p = hirePayoff('guard', { ...base, customers: 50, revenue: 200_000 });
    expect(GUARD_MIN_SAVE).toBeGreaterThan(2460); // 50×0.015×0.82×4.000
    expect(p.ok).toBe(false);
  });

  it('bảo vệ giữ được hơn lương → nhắc "đáng hơn lương"', () => {
    const p = hirePayoff('guard', { ...base, customers: 500, revenue: 6_000_000, wage: 50_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('đáng hơn lương');
  });
});

describe('vai chưa có lỗ TIỀN trung thực đo được', () => {
  it('courier / manager / cook / bartender / butcher / farmhand / warehouse_mgr → không nói quá', () => {
    for (const r of ['courier', 'manager', 'cook', 'bartender', 'butcher', 'farmhand', 'warehouse_mgr']) {
      expect(hirePayoff(r, base).ok).toBe(false);
    }
  });
});
