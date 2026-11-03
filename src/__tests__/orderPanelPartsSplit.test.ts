import { describe, expect, it } from 'vitest';
import * as parts from '../ui/orderPanelParts';

describe('GĐ998 — ui/orderPanelParts tách khỏi ui/OrderPanel', () => {
  it('xuất nhãn mua khi rẻ, kiểu dự phóng và Meter', () => {
    expect(Object.keys(parts.BUY_TONE_LABEL)).toEqual(['cheap', 'normal', 'pricey']);
    expect(Object.keys(parts.ASSESS_STYLE)).toEqual(['ok', 'near', 'over']);
    expect(typeof parts.Meter).toBe('function');
  });
});
