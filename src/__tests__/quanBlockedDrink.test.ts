import { describe, expect, it } from 'vitest';
import { quanBlockedDrinkAction } from '../data/quanNuocInsights';

describe('GĐ1102 — việc sáng "món menu quán ngừng bán vì hết nguyên liệu"', () => {
  it('menu có Trà vải, kho hết vải → trả việc sáng danger nêu đúng món + nguyên liệu thiếu', () => {
    const act = quanBlockedDrinkAction(['tra_vai'], 45, { tra: 5, x_duong: 9, x_nuoc_da: 4 });
    expect(act).not.toBeNull();
    expect(act!.danger).toBe(true);
    expect(act!.priority).toBe(1);
    expect(act!.panel).toBe('quannuoc');
    expect(act!.text).toContain('Trà vải');
    expect(act!.text).toContain('thiếu Vải');
    expect(act!.text.length).toBeLessThanOrEqual(90); // Luật 9
  });

  it('đủ nguyên liệu → null; món chưa mở cấp (tra_vai mở 34, cấp 33) → bỏ qua', () => {
    const ok = quanBlockedDrinkAction(['tra_vai'], 45, { tra: 5, x_vai: 2, x_duong: 9, x_nuoc_da: 4 });
    expect(ok).toBeNull();
    expect(quanBlockedDrinkAction(['tra_vai'], 33, {})).toBeNull();
  });

  it('nhiều món thiếu → trả món đầu theo thứ tự thực đơn; menu rỗng/không truyền → null', () => {
    // sinh_to_oi (mở 34) đứng trước tra_vai: kho thiếu cả hai → trả ổi trước
    const act = quanBlockedDrinkAction(['sinh_to_oi', 'tra_vai'], 45, {});
    expect(act!.text).toContain('Sinh tố ổi');
    expect(quanBlockedDrinkAction(undefined, 45, {})).toBeNull();
    expect(quanBlockedDrinkAction([], 45, {})).toBeNull();
  });

  it('thiếu nhiều nguyên liệu của cùng món → liệt kê đủ, dài nhất vẫn ≤90', () => {
    const act = quanBlockedDrinkAction(['bac_xiu'], 45, {});
    expect(act).not.toBeNull();
    expect(act!.text).toContain('thiếu');
    expect(act!.text.length).toBeLessThanOrEqual(90);
  });
});
