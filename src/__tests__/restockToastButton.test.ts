import { describe, expect, it } from 'vitest';
import { LOW_STOCK_TAG, wantsRestockButton } from '../core/bizAchieve';

/** GĐ1512 (K1) — toast cảnh báo sắp hết hàng gắn nút 1 chạm "Nhập đủ"; toast khác thì không. */
describe('restockToastButton (GĐ1512)', () => {
  it('chỉ hiện nút khi toast có nhãn sắp hết hàng (kể cả toast gộp)', () => {
    expect(wantsRestockButton(`${LOW_STOCK_TAG}: Gạo, Mì — nhập thêm`)).toBe(true);
    expect(wantsRestockButton(`⏳ Sắp hỏng: Sữa · ${LOW_STOCK_TAG}: Gạo — nhập thêm`)).toBe(true);
    expect(wantsRestockButton('⏳ Sắp hỏng (còn dưới 1 ngày): Sữa — giảm giá bán bớt')).toBe(false);
    expect(wantsRestockButton(null)).toBe(false);
    expect(wantsRestockButton('')).toBe(false);
  });
});
