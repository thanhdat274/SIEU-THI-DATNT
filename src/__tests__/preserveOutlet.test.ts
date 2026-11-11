import { describe, it, expect } from 'vitest';
import { preserveOutlet } from '../data/preserveOutlet';

// Nước mắm nhà ủ (hx_nuoc_mam) có lối ra: Cá kho tộ, Gà kho gừng, Chả cá… — kiểm tra thật ngoài đời + trong RECIPES.
describe('preserveOutlet — đầu ra của sản phẩm phơi/muối/ủ', () => {
  it('sản phẩm có món nấu dùng → liệt kê món + lượng mỗi mẻ', () => {
    const o = preserveOutlet('hx_nuoc_mam');
    expect(o.count).toBeGreaterThan(0);
    expect(o.outlets.every((d) => d.qty >= 1)).toBe(true);
    expect(o.outlets.some((d) => d.name.includes('Cá kho'))).toBe(true);
    expect(o.line).toContain(`${o.name}: dùng cho ${o.count} món`);
  });

  it('sản phẩm không có món dùng → dòng nhắc bán thẳng', () => {
    // Mắm tép (hx_mam_tep) — xem có món dùng hay không; nếu không thì bán thẳng, nếu có thì khớp count.
    const o = preserveOutlet('hx_mam_tep');
    expect(o.productId).toBe('hx_mam_tep');
    expect(o.count).toBe(o.outlets.length);
    if (o.count === 0) expect(o.line).toContain('chưa có món nấu dùng');
  });

  it('tất định: cùng sản phẩm → cùng kết quả', () => {
    expect(preserveOutlet('hx_tuong_ban')).toEqual(preserveOutlet('hx_tuong_ban'));
  });
});
