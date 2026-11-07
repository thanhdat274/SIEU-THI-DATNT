import { describe, it, expect } from 'vitest';
import { visibleSuppliers } from '../data/visibleSuppliers';
import { SUPPLIERS } from '../data/suppliers';

/** Playtest P2 T7: ngày đầu chỉ hiện mối đã mở + 1 mối khóa gần nhất. */
describe('visibleSuppliers', () => {
  it('cấp 1: mối mở + đúng 1 mối khóa, phần còn lại gộp', () => {
    const v = visibleSuppliers(SUPPLIERS, 1);
    const open = SUPPLIERS.filter((s) => s.unlock <= 1).length;
    expect(v.visible.length).toBe(Math.min(SUPPLIERS.length, open + 1));
    expect(v.visible.length + v.hiddenCount).toBe(SUPPLIERS.length);
  });
  it('mở hết thì không gộp', () => {
    const v = visibleSuppliers(SUPPLIERS, 999);
    expect(v.hiddenCount).toBe(0);
    expect(v.visible.length).toBe(SUPPLIERS.length);
  });
});
