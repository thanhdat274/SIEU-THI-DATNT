import { slotGroup, type StoreFixture } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

/** Các ô của cùng một kệ/tủ chỉ được bày hàng cùng nhóm (category). Trả true nếu đặt `productId` vào `fixture` vi phạm. */
export function slotCategoryConflict(fixtures: readonly StoreFixture[], fixture: StoreFixture, productId: string): boolean {
  const category = PRODUCT_MAP[productId]?.category;
  return slotGroup(fixtures, fixture).some(other => other.id !== fixture.id && other.currentStock > 0 && !!other.assignedProductId
    && PRODUCT_MAP[other.assignedProductId]?.category !== category);
}
