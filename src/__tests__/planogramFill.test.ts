import { describe, expect, it } from 'vitest';
import { fillPlanForShelf, pickForShelf } from '../data/planogram';
import { allowedForType } from '../data/planogram';

/**
 * GĐ1837 — kế hoạch bày kệ (review đợt 2 R6 + đợt 3 R5): "Bày đầy cả tiệm" trước đây tính MỘT
 * món cho cả kệ nên dồn 10/12 ô Mì gói, hàng hot lễ (bánh kẹo) chỉ 1 ô, kệ sau bỏ trống —
 * mất doanh đúng ngày đông khách. Giờ từng ô một quyết định qua kho ảo + hot set gồm hàng hút lễ.
 */

const shelf = (tiers: (string | null)[]) => ({ tiers: tiers.map((productId) => ({ productId })), type: 'shelf' as const });
const P = {
  nuoc: { id: 'nuoc', category: 'drink' },
  mi: { id: 'mi', category: 'dry' },
  banh: { id: 'banh', category: 'dry' },
};
const allowed = allowedForType('shelf', [P.nuoc, P.mi, P.banh]);

describe('fillPlanForShelf — chia ô theo kho ảo, không dồn một món (GĐ1837)', () => {
  it('kệ 12 ô trống, kho mì 10 bánh 6: mì không dồn hết mọi ô — kho ảo cạn thì bánh/kho khác lên, kho cạn hẳn thì ô để trống', () => {
    const plan = fillPlanForShelf(shelf(Array(12).fill(null)), { mi: 10, banh: 6, nuoc: 2 }, allowed, new Set(['mi']));
    const distinct = new Set(plan.filter(Boolean));
    expect(plan.filter((id) => id === 'mi').length).toBeLessThanOrEqual(3); // cap kệ ~6/ô → 10 mì chiếm ≤2 ô
    expect(distinct.size).toBeGreaterThanOrEqual(2); // bánh kẹo lên kệ thay vì nằm im trong kho
    expect(plan.filter((id) => id === null).length).toBeGreaterThanOrEqual(12 - 4); // kho không đủ bày 12 ô
  });

  it('món hot lễ chưa bán được gì hôm nay vẫn được ưu tiên ô đầu', () => {
    const plan = fillPlanForShelf(shelf([null, null, null]), { mi: 12, banh: 6 }, allowed, new Set(['banh']));
    expect(plan[0]).toBe('banh');
  });

  it('ô đã có món vẫn châm thêm (giữ hành vi GĐ1236); ô không có kho thì null', () => {
    const plan = fillPlanForShelf(shelf(['mi', null]), { mi: 5, banh: 4 }, allowed, new Set());
    expect(plan[0]).toBe('mi'); // châm thêm
    expect(plan[1]).toBe('banh'); // đa dạng
    const plan2 = fillPlanForShelf(shelf(['nuoc', null]), { mi: 5, banh: 4 }, allowed, new Set());
    expect(plan2[0]).toBeNull(); // nuoc hết kho → không châm
    expect(plan2[1]).toBe('mi');
  });

  it('pickForShelf thuần giữ nguyên hành vi (không đổi bộ não chọn 1 ô)', () => {
    expect(pickForShelf(shelf(['mi', 'mi', null]), { mi: 9, banh: 3 }, allowed)).toBe('banh');
  });
});
