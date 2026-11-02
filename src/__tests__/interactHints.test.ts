import { describe, expect, it } from 'vitest';
import { deliveryHint, sapLotHint } from '../core/interactHints';

const g = (biz: Record<string, unknown>, day = 5) => ({ biz, day }) as never;
const open = { zones: ['ngo2'] };

describe('GĐ967 — interactHints', () => {
  it('sapLotHint: chưa mở ngõ 2 thì không gợi ý', () => {
    expect(sapLotHint(g({ zones: [] }), 0)).toBe('');
  });
  it('sapLotHint: lô kế tiếp gợi ý thuê, lô xa hơn thì ẩn', () => {
    expect(sapLotHint(g({ ...open, sapRong: 1 }), 1)).toMatch(/^\[L\] Thuê lô sạp hàng rong/);
    expect(sapLotHint(g({ ...open, sapRong: 1 }), 2)).toBe('');
  });
  it('sapLotHint: lô đã thuê gợi ý đứng sạp, đứng rồi thì ẩn trong ngày', () => {
    expect(sapLotHint(g({ ...open, sapRong: 2, sapHandDay: 4 }), 0)).toBe('[L] Đứng sạp hôm nay (+25%)');
    expect(sapLotHint(g({ ...open, sapRong: 2, sapHandDay: 5 }), 0)).toBe('');
  });
  it('deliveryHint: đúng hẹn ghi giờ hẹn, trễ thì báo trễ', () => {
    expect(deliveryHint({ caller: 'Cô Lan', dueAt: 600 }, 500)).toContain('Cô Lan · hẹn 10:00');
    expect(deliveryHint({ caller: 'Cô Lan', dueAt: 600 }, 700)).toContain('(đã trễ hẹn)');
  });
});
