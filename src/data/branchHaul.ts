import { CONVENIENCE, shelfTotal } from './branches';
import { productById } from './products';

/**
 * GĐ206 — "Auto chuyển kho": trục multi-shop supply chain (backlog 6) thành CƠ CHẾ HÀNH ĐỘNG thật.
 * GĐ199–205 mới SOI mạng lưới + cho người chơi nạp/nhảy/điền giỏ; vế còn thiếu là "chở hàng tự động":
 * hiện việc chở sang chi nhánh chỉ xảy ra khi có người giao/xếp hàng TRỰC (`mover`) hoặc quản lý gọi xe
 * (`managerCall`) — GĐ206 cho chủ bật quyền TỰ CHỞ (không cần nhân viên), mỗi chuyến trả phí xăng
 * `CONVENIENCE.tripFee` (15k) như cơ chế có sẵn. THUẦN — chỉ đọc branch/storage để quyết định chuyến
 * + xem chuyến sẽ chở gì, KHÔNG tự đổi state (slice gọi rồi mới trừ tiền/chở thật).
 */

/** Tự chở khi tổng kệ < 50% sức chứa (khớp ngưỡng quản lý gọi xe MANAGER_REFILL_BELOW để dễ hiểu). */
export const HAUL_REFILL_BELOW = 0.5;
/** Tối thiểu bao nhiêu phút giữa 2 chuyến auto khi chủ bật (chủ trả phí nên dãn hơn staff 120'). */
export const HAUL_TRIP_EVERY = 240;

// GĐ207: ngưỡng kệ vơi và khoảng cách giữa các chuyến auto do CHỦ chỉnh được, nhưng clamp trong
// khoảng an toàn — kệ vơi quá thì vừa tốn phí vừa hết hàng, kệ đầy quá thì chuyến nhỏ; chuyến sát quá
// thì phí xăng đội lên. Xem `autoHaulCfg` để đọc hiệu lực (branch thiếu → mặc định, nhiều → clamp).
export const HAUL_BELOW_MIN = 0.3;
export const HAUL_BELOW_MAX = 0.8;
export const HAUL_EVERY_MIN = 120;
export const HAUL_EVERY_MAX = 720;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Cấu hình auto chuyển kho đang áp dụng (GĐ207): đọc từ branch, thiếu thì về mặc định, luôn clamp an toàn. */
export function autoHaulCfg(branch: { autoHaulBelow?: number; autoHaulEvery?: number } | undefined): { below: number; every: number } {
  return {
    below: clamp(branch?.autoHaulBelow ?? HAUL_REFILL_BELOW, HAUL_BELOW_MIN, HAUL_BELOW_MAX),
    every: clamp(branch?.autoHaulEvery ?? HAUL_TRIP_EVERY, HAUL_EVERY_MIN, HAUL_EVERY_MAX),
  };
}

export interface HaulMove { id: string; qty: number }
export interface HaulPlan {
  moves: HaulMove[];
  /** Tổng đơn vị chở chuyến này. */
  units: number;
  /** Phí xăng chuyến này (0 nếu không chở được gì). */
  cost: number;
}

/**
 * Một chuyến xe chở được gì (thuần): lấp kệ chi nhánh — mỗi món ≤ perItem, tổng ≤ chỗ trống, bỏ thịt
 * cá tươi (cần quầy riêng). CÙNG CÔNG THỨC với vòng chở trong slice branch.ts để preview/UI khớp số.
 */
export function haulTripPlan(branch: { shelf: Record<string, number> } | undefined, storage: Record<string, number>): HaulPlan {
  if (!branch) return { moves: [], units: 0, cost: 0 };
  let room = CONVENIENCE.shelfCap - shelfTotal(branch.shelf ?? {});
  const moves: HaulMove[] = [];
  let units = 0;
  for (const id of Object.keys(storage)) {
    if (room <= 0) break;
    if (productById(id).category === 'meat') continue;
    const want = Math.min(room, CONVENIENCE.perItem - (branch.shelf[id] ?? 0), storage[id] ?? 0);
    if (want <= 0) continue;
    moves.push({ id, qty: want });
    room -= want;
    units += want;
  }
  return { moves, units, cost: units > 0 ? CONVENIENCE.tripFee : 0 };
}

/**
 * Có nên nổ chuyến auto chuyển kho lúc `m` này không (thuần): đã bật `autoHaul`, kệ vơi dưới ngưỡng,
 * và đã đủ khoảng cách với chuyến gần nhất. Trả false khi kệ còn đủ — để không tốn phí xăng vô ích.
 */
export function autoHaulDue(branch: { autoHaul?: boolean; lastTrip: number; shelf: Record<string, number>; autoHaulBelow?: number; autoHaulEvery?: number } | undefined, m: number): boolean {
  if (!branch?.autoHaul) return false;
  const { below, every } = autoHaulCfg(branch);
  if (shelfTotal(branch.shelf) >= CONVENIENCE.shelfCap * below) return false;
  if (m - branch.lastTrip < every) return false;
  return true;
}
