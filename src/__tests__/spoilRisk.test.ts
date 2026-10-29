/**
 * GĐ212 "Cận hạn đáng bao nhiêu" — giá trị tiền đang rủi ro hỏng, thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { spoilRiskValue } from '../data/spoilRisk';

// nuoc: sell 6000 / hạn 1 ngày (markdown life 1 → 0.5). vo: sell 25000 / hạn 36 (life 2 → 0.2).
const priceOf = (id: string) => (id === 'nuoc' ? 6000 : 25000);

const lots = (rec: Record<string, { life: number; qty: number }[]>) => rec;

describe('GĐ212 spoilRiskValue — tiền đang cận hạn', () => {
  it('không có hàng cận hạn → null', () => {
    expect(spoilRiskValue({ noichao: 2 }, lots({ noichao: [{ life: 20, qty: 2 }] }), [], priceOf)).toBeNull();
  });

  it('gộp giá trị cận hạn từ kho, tính ở giá lẻ sau giảm cận hạn', () => {
    const r = spoilRiskValue(
      { nuoc: 4, vo: 6 },
      lots({ nuoc: [{ life: 1, qty: 4 }], vo: [{ life: 2, qty: 6 }] }),
      [],
      priceOf,
    )!;
    expect(r).not.toBeNull();
    expect(r.count).toBe(2);
    // nuoc life1 → markdown 0.5 → 3000/món; vo life2 → 0.2 → 20000/món
    const nuoc = r.lines.find((l) => l.id === 'nuoc')!;
    const vo = r.lines.find((l) => l.id === 'vo')!;
    expect(nuoc.unitReduced).toBe(3000);
    expect(nuoc.value).toBe(12000);
    expect(vo.unitReduced).toBe(20000);
    expect(vo.value).toBe(120000);
    expect(r.totalValue).toBe(132000);
    expect(r.tonightValue).toBe(12000); // chỉ nuoc hỏng đêm nay
  });

  it('ngưỡng threshold=1 chỉ tính phần hỏng đêm nay', () => {
    const r = spoilRiskValue(
      { nuoc: 4, vo: 6 },
      lots({ nuoc: [{ life: 1, qty: 4 }], vo: [{ life: 2, qty: 6 }] }),
      [],
      priceOf,
      1,
    )!;
    expect(r.count).toBe(1);
    expect(r.lines[0].id).toBe('nuoc');
    expect(r.tonightValue).toBe(12000);
  });

  it('hàng trên kệ cũng tính vào giá trị rủi ro', () => {
    const r = spoilRiskValue(
      {},
      undefined,
      [{ productId: 'vo', count: 3, lots: [{ life: 1, qty: 3 }] }],
      priceOf,
    )!;
    expect(r.count).toBe(1);
    expect(r.lines[0].qty).toBe(3);
    expect(r.lines[0].value).toBe(3 * 12500); // vo life1 → 0.5 → 12500
    expect(r.tonightValue).toBe(3 * 12500);
  });

  it('hàng tươi hạn dài bị lọc khỏi ngưỡng', () => {
    const r = spoilRiskValue({ nuoc: 2, noichao: 5 }, lots({ nuoc: [{ life: 1, qty: 2 }], noichao: [{ life: 20, qty: 5 }] }), [], priceOf)!;
    expect(r.count).toBe(1);
    expect(r.lines[0].id).toBe('nuoc');
  });
});
