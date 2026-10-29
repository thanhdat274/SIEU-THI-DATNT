import { describe, it, expect } from 'vitest';
import { socialValue } from '../data/socialValue';
import { APOLOGY_COST, APOLOGY_MUL, CRISIS_MUL, HYPE_MUL } from '../data/social';
import type { SocialState, Buzz } from '../data/social';

// level 20 → customersPerDay = 100
const mk = (buzz: Buzz | null, day = 30): SocialState =>
  ({ followers: 0, posts: [], buzz, promoDay: 0, day }) as SocialState;

const buzz = (kind: Buzz['kind'], responded = false): Buzz =>
  ({ kind, postId: 1, until: 30, mul: kind === 'hype' ? HYPE_MUL : kind === 'crisis' ? (responded ? APOLOGY_MUL : CRISIS_MUL) : 1, responded });

describe('socialValue — soi ảnh hưởng buzz mạng xã hội ra khách/tiền', () => {
  it('không có buzz → calm, traffic 1', () => {
    const r = socialValue({ social: mk(null), day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.verdict).toBe('calm');
    expect(r.traffic).toBe(1);
    expect(r.deltaKhachPerDay).toBe(0);
  });

  it('hype ×1.25 → thêm 25 khách/ngày ≈ 500k (avg giỏ 20k)', () => {
    const r = socialValue({ social: mk(buzz('hype')), day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.traffic).toBe(HYPE_MUL);
    expect(r.deltaKhachPerDay).toBe(25);
    expect(r.avgPerVisit).toBe(20_000);
    expect(r.moneyDeltaPerDay).toBe(500_000);
    expect(r.verdict).toBe('hype');
  });

  it('khủng hoảng chưa xin lỗi → mất 28 khách/ngày, gợi ý xin lỗi giữ lại 20 khách/ngày', () => {
    const r = socialValue({ social: mk(buzz('crisis')), day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.traffic).toBe(CRISIS_MUL);
    expect(r.deltaKhachPerDay).toBeCloseTo(100 * (CRISIS_MUL - 1), 6); // -28
    expect(r.apologyCost).toBe(APOLOGY_COST);
    expect(r.apologyGainKhach).toBeCloseTo(100 * (APOLOGY_MUL - CRISIS_MUL), 6); // 20
    expect(r.verdict).toBe('crisisApologize');
  });

  it('đã xin lỗi → hệ số 0.92, không còn gợi ý xin lỗi nữa', () => {
    const r = socialValue({ social: mk(buzz('crisis', true)), day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.traffic).toBe(APOLOGY_MUL);
    expect(r.apologyGainKhach).toBe(0);
    expect(r.verdict).toBe('crisis');
  });

  it('buzz hết hạn → không còn tác dụng (calm)', () => {
    const r = socialValue({ social: mk({ ...buzz('hype'), until: 29 }), day: 30, level: 20, customers: 200, revenue: 4_000_000 });
    expect(r.verdict).toBe('calm');
    expect(r.traffic).toBe(1);
  });
});
