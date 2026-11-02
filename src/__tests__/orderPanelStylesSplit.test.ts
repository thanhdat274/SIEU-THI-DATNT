import { describe, it, expect } from 'vitest';
import { st } from '../ui/orderPanelStyles';

describe('GĐ989 — ui/orderPanelStyles tách khỏi ui/OrderPanel', () => {
  it('có các style chính và đều là object', () => {
    for (const k of ['meters', 'sub', 'tabs', 'tab']) expect(typeof st[k]).toBe('object');
    expect(st.meters.display).toBe('flex');
  });
});
