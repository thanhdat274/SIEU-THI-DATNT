/**
 * Quyết định "bày món nào lên kệ" — thuần, không đụng store/DOM, test chạy được trong node.
 * GĐ1236: tách khỏi PlanogramPanel (trước chỉ là hàm trong component, không kiểm được) để:
 *  - "Bày đầy cả tiệm" dùng chung một bộ não với "Bày đầy kệ này", không lệch.
 *  - test khóa đúng ưu tiên (món chưa bày ở kệ này > món kho còn nhiều) và tính thuần.
 */
import type { FurnitureType } from './furniture';
import { furnitureDef } from './furniture';

export interface ShelfLike { tiers: { productId: string | null }[]; type: FurnitureType }

/** Tự chọn món cho ô trống của một kệ: ưu tiên (1) món ĐANG BÁN CHẠY hôm nay mà chưa bày ở kệ này
 *  (châm đúng đồ khách muốn — GĐ1237), rồi (2) món chưa bày ở kệ này (tránh lặp 1 món đầy các tầng),
 *  rồi (3) món kho còn nhiều nhất. `hot` là tập id món đang hot hôm nay (mặc định rỗng → giữ hành vi GĐ1236).
 *  THUẦN — test chạy được trong node. */
export function pickForShelf(
  f: ShelfLike,
  storage: Record<string, number>,
  allowed: ReadonlyArray<{ id: string }>,
  hot: ReadonlySet<string> = new Set(),
): string | null {
  const shown = new Set(f.tiers.map((t) => t.productId));
  // Điểm ưu tiên 3>2>1>0: (3) hot chưa bày ở kệ này — châm món khách đang cần vào chỗ mới,
  // (2) món nào chưa bày ở kệ này — giữ đa dạng không lặp 1 món đầy kệ, (1) hot đang bày — châm thêm
  // cho món đang chạy, (0) món nguội đang bày. Cân bằng: đa dạng (2) thắng "châm thêm món hot" (1).
  const score = (p: { id: string }) =>
    hot.has(p.id) && !shown.has(p.id) ? 3
      : !shown.has(p.id) ? 2
        : hot.has(p.id) ? 1
          : 0;
  const options = allowed
    .filter((p) => (storage[p.id] ?? 0) > 0)
    .sort((a, b) => score(b) - score(a) || (storage[b.id] ?? 0) - (storage[a.id] ?? 0));
  return options[0]?.id ?? null;
}

/** Danh sách món (đã lọc theo ngành của kệ) hợp lệ để bày cho một loại kệ — nguồn cho pickForShelf. */
export function allowedForType<T extends { id: string; category: unknown }>(type: FurnitureType, unlocked: ReadonlyArray<T>): T[] {
  const def = furnitureDef(type);
  return unlocked.filter((p) => def.categories.includes(p.category as never));
}

/** GĐ1837 (review đợt 2 R6 + đợt 3 R5) — kế hoạch bày MỘT kệ: trả về id nên bày cho TỪNG tầng
 *  (null = không bày được). Mô phỏng tuần tự từng ô: món vừa gán được coi là "đã bày ở kệ này"
 *  và trừ vào KHO ẢO nên ô kế tiếp tự đa dạng — hết cảnh "10/12 ô một món Mì" dù kho còn bánh
 *  kẹo (hàng hot lễ) nằm dưới. Ô đã có món vẫn châm thêm nếu kho còn. THUẦN — test chạy được. */
export function fillPlanForShelf(
  f: ShelfLike,
  storage: Record<string, number>,
  allowed: ReadonlyArray<{ id: string }>,
  hot: ReadonlySet<string> = new Set(),
): (string | null)[] {
  const cap = furnitureDef(f.type).capacity;
  const virtual = { ...storage };
  const assigned: (string | null)[] = f.tiers.map((t) => t.productId);
  // Ô đã có món: kho ảo trừ đúng lượng cần châm thêm (kho cạn thì thôi, không gán ô khác)
  assigned.forEach((id) => {
    if (id) virtual[id] = Math.max(0, (virtual[id] ?? 0) - cap);
  });
  return assigned.map((id, i) => {
    if (id) return (storage[id] ?? 0) > 0 ? id : null;
    const pick = pickForShelf(
      { tiers: assigned.map((pid) => ({ productId: pid })), type: f.type },
      virtual,
      allowed,
      hot,
    );
    if (!pick) return null;
    assigned[i] = pick;
    virtual[pick] = Math.max(0, (virtual[pick] ?? 0) - cap);
    return pick;
  });
}
