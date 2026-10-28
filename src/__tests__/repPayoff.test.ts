import { describe, it, expect } from 'vitest';
import { repPayoff, repPayoffFocus, VISIT_BASE, HALF_STAR_BONUS } from '../data/repPayoff';
import { Reputation, RepFactor, REP_MIN_SAMPLES, REP_FACTORS } from '../data/reputation';
import { customersPerDay } from '../data/levels';

/** Dựng Reputation trực tiếp (overall = trung bình 5 mặt, weak = mặt thấp nhất). */
function makeRep(overall: number, samples: number, weak?: RepFactor): Reputation {
  const factors = {} as Record<RepFactor, number>;
  for (const k of REP_FACTORS) factors[k] = overall;
  if (weak) factors[weak] = overall - 0;
  return { factors, overall, samples, weakest: weak ?? null };
}

describe('repPayoff — danh tiếng đáng bao nhiêu khách', () => {
  it('chưa đủ 10 lượt khách → insufficient, mọi số = 0 (không lừa điểm giả 3.0)', () => {
    const p = repPayoff(makeRep(4.4, 5), 30);
    expect(p.insufficient).toBe(true);
    expect(p.absolute).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.extraKhach).toBe(0);
    expect(p.nextStarKhach).toBe(0);
  });

  it('5.0★, không chậu cây → +20% người đi đường, ~14 khách/ngày ở cấp 30', () => {
    const rep = makeRep(5, REP_MIN_SAMPLES + 5);
    const p = repPayoff(rep, 30);
    expect(p.insufficient).toBe(false);
    expect(p.absolute).toBeCloseTo(0.1, 6); // (5-3)*0.05
    expect(p.pct).toBeCloseTo(0.1 / VISIT_BASE, 6); // +20%
    expect(p.extraKhach).toBe(14); // 0.1 * customersPerDay(30)=140
  });

  it('4.0★ → +10%, ~7 khách/ngày; mỗi 0.5★ thêm ~3.5 khách/ngày', () => {
    const p = repPayoff(makeRep(4, REP_MIN_SAMPLES), 30);
    expect(p.absolute).toBeCloseTo(0.05, 6);
    expect(p.pct).toBeCloseTo(0.1, 6);
    expect(p.extraKhach).toBe(7);
    expect(p.nextStarPct).toBeCloseTo(HALF_STAR_BONUS / VISIT_BASE, 6); // +5%
    expect(p.nextStarKhach).toBe(4); // round(0.025*140)
  });

  it('3.0★ trung tính → 0 khách thêm', () => {
    const p = repPayoff(makeRep(3, REP_MIN_SAMPLES), 30);
    expect(p.absolute).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.extraKhach).toBe(0);
  });

  it('2.0★ → đang kéo tiệm mất ~7 khách/ngày (−10%)', () => {
    const p = repPayoff(makeRep(2, REP_MIN_SAMPLES), 30);
    expect(p.absolute).toBeCloseTo(-0.05, 6);
    expect(p.pct).toBeCloseTo(-0.1, 6);
    expect(p.extraKhach).toBe(-7);
  });

  it('1.0★ → mất ~14 khách/ngày (−20%)', () => {
    const p = repPayoff(makeRep(1, REP_MIN_SAMPLES), 30);
    expect(p.pct).toBeCloseTo(-0.2, 6);
    expect(p.extraKhach).toBe(-14);
  });

  it('có chậu cây làm mẫu số lớn hơn → % tương đối giảm đúng (0.5+0.25)', () => {
    const rep = makeRep(5, REP_MIN_SAMPLES);
    const p = repPayoff(rep, 30, 6); // plantBonus = min(6*0.05, 0.25) = 0.25
    expect(p.pct).toBeCloseTo(0.1 / (VISIT_BASE + 0.25), 6); // 0.1/0.75 ≈ +13.3%
    expect(p.nextStarPct).toBeCloseTo(0.025 / 0.75, 6);
    expect(p.extraKhach).toBe(14); // ảnh hưởng tuyệt đối không đổi
  });

  it('cấp cao: 5.0★ cấp 80 (340 khách/ngày) → ~34 khách thêm/ngày', () => {
    const rep = makeRep(5, REP_MIN_SAMPLES);
    expect(customersPerDay(80)).toBe(340);
    expect(repPayoff(rep, 80).extraKhach).toBe(34);
  });

  it('repPayoffFocus: nhấc mặt yếu nhất lên 4.0★ cho thêm ~khách/ngày (đã tính từ overall)', () => {
    // factors: price 3, others 5 → overall 4.6, weak = price
    const factors = {} as Record<RepFactor, number>;
    for (const k of REP_FACTORS) factors[k] = 5;
    factors.price = 3;
    const rep: Reputation = { factors, overall: 4.6, samples: REP_MIN_SAMPLES, weakest: 'price' };
    const f = repPayoffFocus(rep, 30);
    expect(f.factor).toBe('price');
    // overall 4.6→4.8; repVisitBonus +0.01 → +0.01*140 = 1.4 → round 1
    expect(f.gainKhach).toBe(1);
  });

  it('repPayoffFocus: đã ≥4.0 mọi mặt → gain 0; chưa đủ mẫu → factor null', () => {
    expect(repPayoffFocus(makeRep(4.5, REP_MIN_SAMPLES), 30).gainKhach).toBe(0);
    expect(repPayoffFocus(makeRep(4.4, 5, 'price'), 30).factor).toBeNull();
  });

  it('mặc định plantCount=0 không NaN khi level bất kỳ', () => {
    const p = repPayoff(makeRep(4, REP_MIN_SAMPLES), 0);
    expect(Number.isFinite(p.pct)).toBe(true);
    expect(Number.isFinite(p.extraKhach)).toBe(true);
  });
});
