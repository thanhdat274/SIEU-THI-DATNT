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

import { DIRT_PER_MOP, MOP_DONE_NOTE, mopPlan } from '../core/interactHints';

describe('GĐ968 — mopPlan', () => {
  it('không làm gì khi không được phép hành động', () => {
    expect(mopPlan(50, true, false)).toEqual({ mop: false });
  });
  it('ngoài tiệm thì báo vào tiệm', () => {
    expect(mopPlan(50, false, true)).toEqual({ mop: false, notify: '🧹 Vào trong tiệm mới lau nhà được' });
  });
  it('sàn sạch thì báo sạch bong, không lau', () => {
    expect(mopPlan(0.5, true, true)).toEqual({ mop: false, notify: '✨ Sàn tiệm đã sạch bong' });
  });
  it('còn bẩn thì lau', () => {
    expect(mopPlan(1, true, true)).toEqual({ mop: true });
    expect(DIRT_PER_MOP).toBe(5);
    expect(MOP_DONE_NOTE.length).toBeLessThanOrEqual(90);
  });
});

import { locationLabel } from '../core/interactHints';

describe('GĐ969 — locationLabel', () => {
  it('trong nhà → tên nhà; gần trại → trại; còn lại ngoài đường', () => {
    expect(locationLabel('Tạp hóa', false)).toBe('Tạp hóa');
    expect(locationLabel('Tạp hóa', true)).toBe('Tạp hóa');
    expect(locationLabel(undefined, true)).toBe('Trang trại đầu ngõ');
    expect(locationLabel(null, false)).toBe('Ngoài đường');
  });
});
