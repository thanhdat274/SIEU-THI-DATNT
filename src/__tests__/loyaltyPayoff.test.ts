import { describe, expect, it } from 'vitest';
import { loyaltyPayoff, loyaltyTraffic, type Loyalty } from '../data/biz';

/**
 * GĐ129 — Chi phí–lợi ích Thẻ tích điểm: quà đã tặng (given/redeemed) so khách kéo thêm
 * nhờ +% traffic. THUẦN đọc, không đổi save/kinh tế. `extraCustomers` ước theo pattern
 * happyHourReport (customers × (1−1/mul)).
 */

const l = (over: Partial<Loyalty> = {}): Loyalty => ({ on: true, stamps: 5, redeemed: 10, given: 50000, ...over });
const st = (over: { customers?: number; revenue?: number } = {}) => ({ customers: 100, revenue: 2000000, ...over });

describe('loyaltyPayoff — đánh giá thẻ tích điểm', () => {
  it('tắt thẻ → null (không nhiễu khi không bật)', () => {
    expect(loyaltyPayoff(l({ on: false }), st())).toBeNull();
  });

  it('avgGift = given/redeemed; boostPct đúng theo stamps (5→12%, 10→6%, 15→4%)', () => {
    const p5 = loyaltyPayoff(l({ stamps: 5, redeemed: 10, given: 100000 }), st())!;
    expect(p5.avgGift).toBe(10000);
    expect(p5.boostPct).toBe(Math.round((loyaltyTraffic(l({ stamps: 5 })) - 1) * 100));
    expect(p5.boostPct).toBe(12);
    expect(loyaltyPayoff(l({ stamps: 10 }), st())!.boostPct).toBe(6);
    expect(loyaltyPayoff(l({ stamps: 15 }), st())!.boostPct).toBe(4);
  });

  it('extraCustomers ≈ customers × (1−1/mul) — đúng pattern happyHourReport', () => {
    const p = loyaltyPayoff(l({ stamps: 5 }), st({ customers: 112 }))!;
    const mul = loyaltyTraffic(l({ stamps: 5 })); // 1.12
    expect(p.extraCustomers).toBe(Math.round(112 * (1 - 1 / mul)));
    expect(p.extraCustomers).toBe(Math.round(112 * (1 - 1 / 1.12)));
  });

  it('costToday = avgGift × (customers/stamps) — dự phóng số quà hôm nay', () => {
    const p = loyaltyPayoff(l({ stamps: 5, redeemed: 10, given: 100000 }), st({ customers: 100 }))!;
    // avgGift=10000, redemptionsToday=100/5=20 → costToday=200000
    expect(p.costToday).toBe(200000);
  });

  it('verdict=keep khi lợi ích (extraValue) ≥ chi phí quà (costToday)', () => {
    // khách 100, revenue 2M → avgRev/customer=20000; extraCustomers (5 tem)=round(100*(1-1/1.12))=11
    // extraValue=11*20000=220000; costToday (avgGift 5000 × 20)=100000 → net=+120000 → keep
    const p = loyaltyPayoff(l({ stamps: 5, redeemed: 20, given: 100000 }), st({ customers: 100, revenue: 2000000 }))!;
    expect(p.extraValue).toBeGreaterThan(p.costToday);
    expect(p.net).toBeGreaterThan(0);
    expect(p.verdict).toBe('keep');
  });

  it('verdict=reduce khi chi phí quà vượt lợi ích', () => {
    // món rẻ nhất đắt (avgGift cao) → costToday vượt extraValue
    const p = loyaltyPayoff(l({ stamps: 5, redeemed: 10, given: 400000 }), st({ customers: 100, revenue: 1000000 }));
    // avgGift=40000 × 20 = 800k cost; extraCustomers=11, avgRev=10k → extraValue=110k → net<0
    expect(p!.costToday).toBeGreaterThan(p!.extraValue);
    expect(p!.verdict).toBe('reduce');
  });

  it('verdict=soon khi chưa có lần đổi nào (redeemed=0) — chưa đủ dữ liệu', () => {
    const p = loyaltyPayoff(l({ redeemed: 0, given: 0 }), st())!;
    expect(p.verdict).toBe('soon');
    expect(p.avgGift).toBe(0);
  });

  it('an toàn khi không chia 0: customers=0 → extraValue/costToday=0, không NaN', () => {
    const p = loyaltyPayoff(l({ stamps: 5, redeemed: 5, given: 25000 }), st({ customers: 0, revenue: 0 }))!;
    expect(Number.isFinite(p.extraCustomers)).toBe(true);
    expect(Number.isFinite(p.costToday)).toBe(true);
    expect(Number.isFinite(p.net)).toBe(true);
  });
});
