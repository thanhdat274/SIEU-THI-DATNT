import { describe, expect, it } from 'vitest';
import { hirePayoff, HIRE_SHELF_MIN_LOSS } from '../data/hirePayoff';

/** GĐ1267 — soi TUYỂN DỤNG: "thuê vai này vá lỗ nào đang rò khách/tiền hôm nay?"
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

describe('vai chưa có lỗ TIỀN trung thực đo được', () => {
  it('courier / guard / manager / cook / bartender / butcher / farmhand / warehouse_mgr → không nói quá', () => {
    for (const r of ['courier', 'guard', 'manager', 'cook', 'bartender', 'butcher', 'farmhand', 'warehouse_mgr']) {
      expect(hirePayoff(r, base).ok).toBe(false);
    }
  });
});
