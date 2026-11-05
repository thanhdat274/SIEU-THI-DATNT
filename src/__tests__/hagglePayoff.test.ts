/**
 * GĐ1312 — test THUẦN cho `hagglePolicyEarn` (EV mỗi đơn mặc cả theo từng chính sách quầy).
 * Tái dựng ĐÚNG cơ chế chốt haggleSettle/haggleCounterOutcome từ hằng số game. Không đổi
 * state/kinh tế/save; co-op an toàn (không import store).
 */
import { describe, expect, it } from 'vitest';
import { haggleCounterOff, haggleOff } from '../data/counterDeals';
import { hagglePolicyEarn } from '../data/hagglePayoff';

describe('hagglePolicyEarn (GĐ1312) — EV các stance mặc cả', () => {
  it('đơn 20k, chủ để ask → Luôn bớt 18k > trả nửa 16.9k > giữ giá 12k, best Luôn bớt, loss 0', () => {
    const r = hagglePolicyEarn('ask', 20_000);
    expect(r.accept).toBe(18_000); // 20000 − haggleOff (2000)
    expect(r.counter).toBe(16_900); // 0.7×(20000−1000) + 0.18×20000
    expect(r.refuse).toBe(12_000); // 0.6×20000
    expect(r.best).toBe('accept');
    expect(r.bestEarn).toBe(18_000);
    expect(r.current).toBeNull();
    expect(r.loss).toBe(0);
  });

  it('đang để Giữ giá → mất ~6.000đ/đơn so với Luôn bớt, line chỉ mất', () => {
    const r = hagglePolicyEarn('refuse', 20_000);
    expect(r.loss).toBe(6_000); // 18000 − 12000
    expect(r.line).toContain('mất ~6.000đ/đơn');
    expect(r.line).toContain('Luôn bớt');
  });

  it('đang để Trả nửa → mất ~1.100đ/đơn', () => {
    const r = hagglePolicyEarn('counter', 20_000);
    expect(r.loss).toBe(1_100); // 18000 − 16900
    expect(r.line).toContain('mất ~1.100đ/đơn');
  });

  it('đang để Luôn bớt (tối ưu) → loss 0, line liệt kê 3 EV', () => {
    const r = hagglePolicyEarn('accept', 20_000);
    expect(r.loss).toBe(0);
    expect(r.current).toBe('accept');
    expect(r.line).toContain('18.000đ');
    expect(r.line).toContain('16.900đ');
    expect(r.line).toContain('12.000đ');
  });

  it('đơn 100k: accept 90k, counter 84.5k, refuse 60k — khớp công thức', () => {
    const r = hagglePolicyEarn('ask', 100_000);
    expect(haggleOff(100_000)).toBe(10_000);
    expect(haggleCounterOff(100_000)).toBe(5_000);
    expect(r.accept).toBe(90_000);
    expect(r.counter).toBe(84_500); // 0.7×95000 + 0.18×100000
    expect(r.refuse).toBe(60_000);
    expect(r.best).toBe('accept');
  });

  it('KHÔNG bịa — counter EV khớp 0.7×(T−counterOff) + 0.18×T', () => {
    const T = 47_000;
    const r = hagglePolicyEarn('ask', T);
    expect(r.counter).toBe(Math.round(0.7 * (T - haggleCounterOff(T)) + 0.18 * T));
  });

  it('dòng ≤90 code point', () => {
    const lines = ['ask', 'accept', 'counter', 'refuse'].map((p) => hagglePolicyEarn(p as never)!.line!);
    for (const l of lines) expect([...l].length).toBeLessThanOrEqual(90);
  });

  it('THUẦN deterministic — cùng input cho cùng kết quả', () => {
    const a = hagglePolicyEarn('refuse', 20_000);
    const b = hagglePolicyEarn('refuse', 20_000);
    expect(a).toEqual(b);
  });
});
