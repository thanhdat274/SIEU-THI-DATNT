/**
 * Sổ tay Tiệm — Album thu thập hàng hóa (GĐ36): "đã khám phá / đã bán được bao nhiêu món".
 *
 * Game có ~476 món hàng (PRODUCTS = hàng cơ bản + catalog + món nhà làm) nhưng trước đây KHÔNG có
 * màn hình "đã bán được món nào" — Storage chỉ là hàng đang giữ, OrderPanel là nhập, Analytics là
 * sức khoẻ, LevelsPanel là mở khóa. File này là trụ "collection completion": gom toàn bộ món hàng
 * theo trạng thái (khóa theo cấp / chưa bán / đã bán) + mốc thưởng nhỏ khi đủ ngưỡng món đã bán.
 *
 * File CHỈ có dữ liệu và hàm thuần (không đụng three/React, không đổi kinh tế). Nguồn "đã bán" là
 * một counter nhẹ `soldEver: Record<productId, count>` đặt ở GameState (xem core/slices/discovery.ts),
 * ghi mỗi lần một món được bán ở quầy (checkout) hoặc giao đơn (điện thoại/tiệc/hợp đồng/app online).
 * Bản lưu cũ thiếu `soldEver` thì tự bù mặc định {} (qua MERGE_DEEP) — không cần SAVE_VERSION.
 */
import { PRODUCTS, type Category } from './products';

/** Trạng thái một món hàng trong album. */
export type DiscoveryStatus = 'sold' | 'unbought' | 'locked';
/** One dòng trong album. */
export interface DiscoveryRow {
  id: string;
  name: string;
  category: Category;
  /** Cấp mở khóa. */
  unlock: number;
  /** Giá bán gợi ý (đ) — để người chơi biết món sắp mở. */
  sell: number;
  /** Màu hộp hàng (vẽ chấm màu). */
  color: number;
  status: DiscoveryStatus;
  /** Đang có hàng trong kho hoặc trên kệ (sở hữu, chưa chắc đã bán). */
  owned: boolean;
  /** Số món đã bán cả ván. */
  soldQty: number;
}

/** Tập id sản phẩm hợp lệ (lọc nhanh khi ghi món đã bán). */
const KNOWN = new Set(PRODUCTS.map((p) => p.id));

/** Tổng số món trong ngành hàng (mẫu hàng của tiệm). */
export const totalProducts = () => PRODUCTS.length;

/** Cộng dồn "đã bán" cho từng món. Trả về object MỚI; nếu không có món nào hợp lệ thì trả về `soldEver` nguyên (để gọi bên ngoài phát hiện no-op qua so sánh tham chiếu). */
export function recordSold(soldEver: Record<string, number>, ids: Iterable<string>): Record<string, number> {
  let changed = false;
  const out: Record<string, number> = { ...soldEver };
  for (const id of ids) {
    if (!KNOWN.has(id)) continue;
    out[id] = (out[id] ?? 0) + 1;
    changed = true;
  }
  return changed ? out : soldEver;
}

/** Số MÓN ĐÃ BÁN được (khác nhau), không phải tổng số đơn vị. */
export const soldCount = (soldEver: Record<string, number>) =>
  Object.values(soldEver).reduce((n, q) => n + (q > 0 ? 1 : 0), 0);

/** Phân loại trạng thái theo món: đã bán thắng, khóa nếu quá cấp, ngược lại chưa bán. */
export function discoverStatusOf(soldQty: number, unlock: number, level: number): DiscoveryStatus {
  if (soldQty > 0) return 'sold';
  if (unlock > level) return 'locked';
  return 'unbought';
}

/** Món đang có trong kho (>0) hoặc trên kệ — dấu hiệu "sở hữu". */
export function ownedBy(
  storage: Record<string, number>,
  furniture: { tiers: { productId: string | null; count: number }[] }[],
): Set<string> {
  const out = new Set<string>();
  for (const [id, q] of Object.entries(storage)) if (q > 0 && KNOWN.has(id)) out.add(id);
  for (const f of furniture) for (const t of f.tiers) if (t.productId && t.count > 0) out.add(t.productId);
  return out;
}

/** Toàn bộ album: mọi món hàng kèm trạng thái (xếp theo ngành rồi cấp mở khóa — dễ duyệt). */
export function discoveryRows(
  level: number,
  storage: Record<string, number>,
  furniture: { tiers: { productId: string | null; count: number }[] }[],
  soldEver: Record<string, number>,
): DiscoveryRow[] {
  const owned = ownedBy(storage, furniture);
  return PRODUCTS
    .map((p) => {
      const soldQty = soldEver[p.id] ?? 0;
      return {
        id: p.id, name: p.name, category: p.category, unlock: p.unlock, sell: p.sell, color: p.color,
        status: discoverStatusOf(soldQty, p.unlock, level),
        owned: owned.has(p.id),
        soldQty,
      };
    })
    .sort((a, b) => a.category === b.category ? a.unlock - b.unlock : a.category.localeCompare(b.category));
}

/** Ngưỡng mốc "Đã bán đủ N món" — thưởng nhỏ khen người chơi, không phải thưởng lớn. */
export const DISCOVERY_MILESTONES: number[] = [10, 25, 50, 100];

/** Thưởng mốc: nhỏ gọn, chỉ khích lệ chứ không lấn át kinh tế. */
export const DISCOVERY_REWARDS: Record<number, { money: number; xp: number }> = {
  10: { money: 50_000, xp: 50 },
  25: { money: 120_000, xp: 120 },
  50: { money: 250_000, xp: 250 },
  100: { money: 500_000, xp: 500 },
};

/** Thưởng của một mốc (0/0 nếu không biết). */
export const discoveryReward = (m: number): { money: number; xp: number } => DISCOVERY_REWARDS[m] ?? { money: 0, xp: 0 };

/** Những mốc vừa đạt (count ≥ mốc) mà chưa nằm trong `claimed` — trả về danh sách cần thưởng. */
export function milestonesClaimed(count: number, claimed: number[]): number[] {
  return DISCOVERY_MILESTONES.filter((m) => count >= m && !(claimed as number[]).includes(m)).slice();
}

/** Mốc kế tiếp chưa nhận thưởng (null nếu đã nhận hết). Dùng để mồi "còn X món nữa". */
export function nextMilestone(count: number, claimed: number[]): number | null {
  return DISCOVERY_MILESTONES.find((m) => count < m && !(claimed as number[]).includes(m)) ?? null;
}
