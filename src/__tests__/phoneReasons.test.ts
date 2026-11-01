import { describe, expect, it } from 'vitest';
import { reasonsFor, phoneCallFor, VIP_REASONS, COOK_REASONS } from '../data/phoneOrders';
import { REGULARS } from '../data/regulars';
import { RECIPES } from '../data/recipes';

// GĐ271 — lý do gọi khớp thời tiết: "trời mưa..." không bao giờ xuất hiện trong ngày nắng.
// phoneCallFor tất định theo seed → sweep được trọn bộ.

const friendly = () => {
  const m: Record<string, { friendship: number; visits: number; lastVisitDay: number; perks: string[]; discovered: string[] }> = {};
  for (const r of REGULARS) m[r.id] = { friendship: 80, visits: 5, lastVisitDay: 0, perks: [], discovered: [] };
  return m;
};

describe('reasonsFor — pool theo ngữ cảnh (GĐ271)', () => {
  it('mưa/giông có lý do mưa; nắng có lý do nóng; mây/sương chỉ pool chung', () => {
    const rain = reasonsFor('rain');
    expect(rain.some((r) => r.includes('mưa'))).toBe(true);
    expect(rain.some((r) => r.includes('nóng'))).toBe(false);
    const sunny = reasonsFor('sunny');
    expect(sunny.some((r) => r.includes('nóng'))).toBe(true);
    expect(sunny.some((r) => r.includes('mưa'))).toBe(false);
    for (const w of ['cloudy', 'fog'] as const) {
      expect(reasonsFor(w).some((r) => r.includes('mưa') || r.includes('nóng'))).toBe(false);
    }
  });

  it('quét 20 seed × 30 ngày × 9 slot × 4 thời tiết: lý do luôn hợp ngữ cảnh, 0 lệch', () => {
    const stations: never[] = [];
    let checked = 0;
    for (let seed = 0; seed < 20; seed++) {
      for (let day = 2; day <= 30; day++) {
        for (let slot = 0; slot < 9; slot++) {
          for (const weather of ['sunny', 'rain', 'cloudy', 'storm'] as const) {
            const o = phoneCallFor(seed, day, slot, 40, friendly(), seed * 1000 + day * 10 + slot, weather, { mi: 10 }, stations, 30, false);
            if (!o) continue;
            // đơn VIP/nấu có pool lý do riêng (không gắn thời tiết — công ty/hackathon ngày nào cũng hợp)
            const allowed = [...reasonsFor(weather), ...VIP_REASONS, ...COOK_REASONS];
            expect(allowed).toContain(o.reason);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
});
