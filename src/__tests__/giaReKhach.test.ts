import { describe, expect, it } from 'vitest';
import { bulkBuyChance, isCheapPraise, referenceSell } from '../data/pricing';

// Review 13/11-2 R1/R3 — khách khen giá rẻ và mua gom khi xả sâu (cơ chế chỉ từ cấp > 30).
describe('giá rẻ → phản ứng khách', () => {
  const id = 'mi';
  it('khen rẻ khi ≤95% gợi ý, không khen khi bằng giá', () => {
    const ref = referenceSell(id);
    expect(isCheapPraise(id, Math.floor(ref * 0.9))).toBe(true);
    expect(isCheapPraise(id, ref)).toBe(false);
  });
  it('mua gom chỉ khi ≤75% gợi ý và cấp > 30', () => {
    const ref = referenceSell(id);
    expect(bulkBuyChance(id, Math.floor(ref * 0.7), 40)).toBeGreaterThan(0);
    expect(bulkBuyChance(id, Math.floor(ref * 0.7), 30)).toBe(0);
    expect(bulkBuyChance(id, Math.floor(ref * 0.9), 40)).toBe(0);
  });
});
