/**
 * Quyết định "bày món nào lên kệ" — thuần, không đụng store/DOM, test chạy được trong node.
 * GĐ1236: tách khỏi PlanogramPanel (trước chỉ là hàm trong component, không kiểm được) để:
 *  - "Bày đầy cả tiệm" dùng chung một bộ não với "Bày đầy kệ này", không lệch.
 *  - test khóa đúng ưu tiên (món chưa bày ở kệ này > món kho còn nhiều) và tính thuần.
 */
import type { FurnitureType } from './furniture';
import { furnitureDef } from './furniture';

export interface ShelfLike { tiers: { productId: string | null }[]; type: FurnitureType }

/** Tự chọn món cho ô trống của một kệ: món kho còn nhiều nhất, ưu tiên món CHƯA bày ở kệ này
 *  (tránh lặp 1 món đầy các tầng; hành vi giữ nguyên của autoPick cũ trong PlanogramPanel). */
export function pickForShelf(
  f: ShelfLike,
  storage: Record<string, number>,
  allowed: ReadonlyArray<{ id: string }>,
): string | null {
  const shown = new Set(f.tiers.map((t) => t.productId));
  const options = allowed.filter((p) => (storage[p.id] ?? 0) > 0);
  options.sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || (storage[b.id] ?? 0) - (storage[a.id] ?? 0));
  return options[0]?.id ?? null;
}

/** Danh sách món (đã lọc theo ngành của kệ) hợp lệ để bày cho một loại kệ — nguồn cho pickForShelf. */
export function allowedForType<T extends { id: string; category: unknown }>(type: FurnitureType, unlocked: ReadonlyArray<T>): T[] {
  const def = furnitureDef(type);
  return unlocked.filter((p) => def.categories.includes(p.category as never));
}
