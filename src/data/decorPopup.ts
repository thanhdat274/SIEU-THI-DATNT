import { furnitureDef, type FurnitureType } from './furniture';
import { VIET_SET } from './decorSets';

/** GĐ1532 — Xóm #12 "popup decor": dòng thông tin khi đang cầm/dời một món trong chế độ xây dựng —
 *  tên, điểm 🩷 decor, và có thuộc bộ "Đồ Việt" không. Món không có decor trả null. */
export function decorPopupLine(type: FurnitureType): string | null {
  const d = furnitureDef(type);
  if (!d.decor) return null;
  return `${d.name} · +${d.decor} 🩷${VIET_SET.includes(type) ? ' · 🏺 thuộc bộ Đồ Việt' : ''}`;
}
