import { describe, expect, it } from 'vitest';
import { stocktakeMessage } from '../core/routine';

const f = (tiers: { productId: string | null; count: number }[]) => ({ tiers }) as never;

describe('GĐ963 — stocktakeMessage', () => {
  it('đếm món trên kệ, trong kho và ô trống', () => {
    const m = stocktakeMessage({
      furniture: [f([{ productId: 'a', count: 3 }, { productId: null, count: 0 }]), f([{ productId: 'b', count: 0 }])],
      storage: { a: 4, b: 2 },
    });
    expect(m).toContain('3 món trên kệ');
    expect(m).toContain('6 món trong kho');
    expect(m).toContain('2 ô kệ trống');
  });
  it('không nhắc ô trống khi kệ đầy', () => {
    const m = stocktakeMessage({ furniture: [f([{ productId: 'a', count: 5 }])], storage: {} });
    expect(m).not.toContain('ô kệ trống');
    expect(m.length).toBeLessThanOrEqual(90);
  });
});
