/**
 * GĐ1320 — test THUẦN cho `counterStreakInfo` (đòn phản công mạnh thêm nhờ chạy liền nhiều ngày).
 * Tái dựng ĐÚNG cơ chế streak/hit trong core/biz.ts (hit = def.hit + min(streak−1, COUNTER_STREAK_MAX)).
 * Không đổi state/kinh tế/save; co-op an toàn (không import store).
 */
import { describe, expect, it } from 'vitest';
import { COUNTER_STREAK_MAX, PRICE_WAR_MIN_SALES, counterById, type Counter } from '../data/bizFinance';
import { counterStreakInfo } from '../data/counterStreak';

const counter = (tactic: Counter['tactic'], day = 40): Counter => ({ tactic, day });

describe('counterStreakInfo (GĐ1320) — đòn phản công theo chuỗi ngày liền', () => {
  it('không đang chạy hôm nay → line null', () => {
    const r = counterStreakInfo(undefined, 40, undefined, 0);
    expect(r.line).toBeNull();
    expect(r.streak).toBe(1);
    expect(r.bonus).toBe(0);
  });

  it('ngày đầu chuỗi (không phản công hôm qua) → streak 1, bonus 0, hit = def.hit', () => {
    const r = counterStreakInfo(counter('ad'), 40, 38, 0);
    expect(r.streak).toBe(1);
    expect(r.bonus).toBe(0);
    expect(r.hit).toBe(counterById('ad').hit);
    expect(r.line).toBeNull(); // không ồn ngày đầu
  });

  it('hôm qua có phản công → ngày thứ 2 liền, đòn ad mạnh hơn +1', () => {
    const r = counterStreakInfo(counter('ad'), 40, 39, 1);
    expect(r.streak).toBe(2);
    expect(r.bonus).toBe(1);
    expect(r.hit).toBe(counterById('ad').hit + 1);
    expect(r.line).toContain('đêm nay mất');
    expect(r.line).toContain('chuỗi +1');
  });

  it('chuỗi kéo dài → bonus chặn ở COUNTER_STREAK_MAX', () => {
    const r = counterStreakInfo(counter('ad'), 40, 39, 8);
    expect(r.bonus).toBe(COUNTER_STREAK_MAX);
    expect(r.hit).toBe(counterById('ad').hit + COUNTER_STREAK_MAX);
  });

  it('đòn giá: dòng kèm điều kiện bán đủ 30 món (không bịa đòn chắc chắn)', () => {
    const r = counterStreakInfo(counter('price'), 40, 39, 1);
    expect(r.hit).toBe(counterById('price').hit + 1);
    expect(r.line).toContain(`${PRICE_WAR_MIN_SALES} món`);
  });

  it('đòn tri ân (gift) cũng được cộng chuỗi', () => {
    const r = counterStreakInfo(counter('gift'), 40, 39, 1);
    expect(r.streak).toBe(2);
    expect(r.hit).toBe(counterById('gift').hit + 1);
  });

  it('KHÔNG bịa — hit khớp def.hit + min(streak−1, max)', () => {
    const last = 39, str = 4;
    const r = counterStreakInfo(counter('ad'), 40, last, str);
    const streak = last === 40 - 1 ? str + 1 : 1;
    const bonus = Math.min(streak - 1, COUNTER_STREAK_MAX);
    expect(r.hit).toBe(counterById('ad').hit + bonus);
  });

  it('dòng ≤90 code point (ad, gift, price)', () => {
    for (const t of ['ad', 'gift', 'price'] as const) {
      const r = counterStreakInfo(counter(t), 40, 39, 5);
      expect(r.line).not.toBeNull();
      expect([...r.line!].length).toBeLessThanOrEqual(90);
    }
  });

  it('THUẦN deterministic — cùng input cho cùng kết quả', () => {
    const a = counterStreakInfo(counter('ad'), 40, 39, 2);
    const b = counterStreakInfo(counter('ad'), 40, 39, 2);
    expect(a).toEqual(b);
  });
});
