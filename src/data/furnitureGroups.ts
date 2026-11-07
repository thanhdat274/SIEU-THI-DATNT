import type { FurnitureDef } from './furniture';

/**
 * GĐ1516 — nhóm đồ trong bảng Xây dựng (audit GĐ1514: 44+ loại, danh sách quá dài).
 * 'decor' = có điểm 🩷 và không bày hàng; 'sell' = kệ/quầy/tủ bày hàng; 'other' = bàn ghế, trạm, tiện ích.
 */
export type FurnitureGroup = 'sell' | 'decor' | 'other';
export const FURNITURE_GROUP_TABS: readonly { id: 'all' | FurnitureGroup; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'sell', label: '🛒 Kệ & quầy bày hàng' },
  { id: 'decor', label: '🩷 Trang trí' },
  { id: 'other', label: '🪑 Tiện ích' },
];

export function furnitureGroup(def: Pick<FurnitureDef, 'decor' | 'categories' | 'tiers'>): FurnitureGroup {
  if ((def.decor ?? 0) > 0 && def.tiers === 0 && def.categories.length === 0) return 'decor';
  if (def.categories.length > 0) return 'sell';
  return 'other';
}
