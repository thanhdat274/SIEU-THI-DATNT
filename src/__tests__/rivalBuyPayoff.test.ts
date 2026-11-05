/**
 * GĐ1308 — test THUẦN cho `rivalBuyPayoff` (phần khách cũ đối thủ ghé đông sau khi mua lại mặt bằng 12tr).
 * Tái dựng ĐÚNG cơ chế bizTraffic ×RIVAL_BUY_TRAFFIC trong RIVAL_BUY_DAYS ngày. Không đổi state/kinh tế/save;
 * co-op an toàn (không import store).
 */
import { describe, expect, it } from 'vitest';
import { RIVAL_BUY_DAYS, RIVAL_BUY_TRAFFIC, RIVAL_SHOP_PRICE } from '../data/rivals';
import type { BranchState } from '../data/branches';
import { rivalBuyPayoff } from '../data/rivalBuyPayoff';

const offer = { price: RIVAL_SHOP_PRICE } as const;
const branch = (revenueToday: number, vending = 0): BranchState =>
  ({ revenueToday, vendingRevenueToday: vending }) as unknown as BranchState;

describe('rivalBuyPayoff (GĐ1308) — khách cũ rival ghé đông bao nhiêu sau khi mua mặt bằng', () => {
  it('đã có chi nhánh doanh thu 400k/ngày → boost 15% = +60k/ngày, cả đợt 7 ngày 420k', () => {
    const r = rivalBuyPayoff(offer, branch(400_000));
    expect(r.boostPct).toBe(15);
    expect(r.days).toBe(RIVAL_BUY_DAYS);
    expect(r.extraPerDay).toBe(60_000); // 400000 × 0.15
    expect(r.totalBoost).toBe(420_000); // 60000 × 7
    expect(r.line).toContain('60.000đ/ngày');
    expect(r.line).toContain('420.000đ');
  });

  it('cộng doanh thu máy bán hàng vào mẫu tăng khách', () => {
    const r = rivalBuyPayoff(offer, branch(300_000, 100_000));
    expect(r.extraPerDay).toBe(60_000); // (300k+100k) × 0.15 = 60k
  });

  it('chưa có chào bán → line null, không ồn', () => {
    const r = rivalBuyPayoff(undefined, branch(400_000));
    expect(r.line).toBeNull();
    expect(r.extraPerDay).toBe(0);
  });

  it('chưa có chi nhánh (mua = mở chi nhánh) → line null, không soi phần đông khách', () => {
    const r = rivalBuyPayoff(offer, undefined);
    expect(r.line).toBeNull();
  });

  it('chi nhánh chưa có doanh thu hôm nay → line null, không bịa 0', () => {
    const r = rivalBuyPayoff(offer, branch(0));
    expect(r.line).toBeNull();
  });

  it('KHÔNG bịa — extraPerDay khớp doanh thu × (RIVAL_BUY_TRAFFIC−1) làm tròn 1000', () => {
    const revenue = 1_234_567;
    const r = rivalBuyPayoff(offer, branch(revenue));
    expect(r.extraPerDay).toBe(Math.round((revenue * (RIVAL_BUY_TRAFFIC - 1)) / 1000) * 1000);
  });

  it('price mặc định là RIVAL_SHOP_PRICE, compact thành 12tr', () => {
    const r = rivalBuyPayoff(offer, branch(400_000));
    expect(r.price).toBe(RIVAL_SHOP_PRICE);
    expect(r.line).toContain('12tr');
  });

  it('dòng ≤90 code point', () => {
    const r = rivalBuyPayoff(offer, branch(2_500_000));
    expect(r.line).not.toBeNull();
    expect([...r.line!].length).toBeLessThanOrEqual(90);
  });

  it('THUẦN deterministic — cùng input cho cùng kết quả', () => {
    const a = rivalBuyPayoff(offer, branch(400_000, 50_000));
    const b = rivalBuyPayoff(offer, branch(400_000, 50_000));
    expect(a).toEqual(b);
  });
});
