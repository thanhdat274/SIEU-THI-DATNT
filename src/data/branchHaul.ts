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
export function autoHaulDue(branch: { autoHaul?: boolean; lastTrip: number; shelf: Record<string, number> } | undefined, m: number): boolean {
  if (!branch?.autoHaul) return false;
  if (shelfTotal(branch.shelf) >= CONVENIENCE.shelfCap * HAUL_REFILL_BELOW) return false;
  if (m - branch.lastTrip < HAUL_TRIP_EVERY) return false;
  return true;
}
