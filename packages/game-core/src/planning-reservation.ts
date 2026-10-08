/**
 * planning-reservation.ts — Cơ chế GIỮ CHỖ QUY HOẠCH đất (OpenSpec `open-world-coop-land`, design D1).
 *
 * ⚠️ PHẦN THUẦN — KHÔNG socket / KHÔNG gateway / KHÔNG renderer / KHÔNG save.
 * Module này CHỈ chứa type + hàm thuần (immutable, trả bản sao) để quản lý giữ chỗ theo
 * người chơi trong BỘ NHỚ runtime. Nó KHÔNG lưu save, KHÔNG biết socket, KHÔNG vẽ bóng mờ.
 *
 * Việc SAU (chờ máy thật, NGOÀI phạm vi file này) — nối vào world runtime / gateway:
 *   - socket `planning:reserve` (thay giữ chỗ cũ cùng accountId) / `planning:release`;
 *   - ngắt kết nối → gọi `releaseReservation` (hoặc chậm nhất sau TTL `pruneExpired`);
 *   - client đang mở quy hoạch gia hạn mỗi 20s → `extendReservation`;
 *   - snapshot mang danh sách giữ chỗ của NGƯỜI KHÁC → renderer vẽ bóng mờ + tên;
 *   - server từ chối lệnh đất đụng giữ chỗ của người khác với mã `reserved_by_other` kèm tên
 *     (kiểm bằng `reservationConflictsWith`).
 *
 * Thiết kế (D1):
 *   - TTL mặc định 60 giây; toàn bộ hàm nhận `now: number` (debug clock) để test TTL.
 *   - Tối đa 1 giữ chỗ mỗi người: `setReservation` thay thế giữ chỗ cũ cùng `accountId`.
 *   - Giữ chỗ KHÔNG cấp quyền: lệnh thật vẫn kiểm đủ luật gốc.
 *   - Chơi một mình: danh sách rỗng, không bao giờ conflict.
 */

export const DEFAULT_PLANNING_TTL = 60_000;

/** Ô đất theo toạ độ lưới (thuộc `kind: 'tiles'`). */
export interface PlanningTile {
  x: number;
  y: number;
}

/**
 * Target mà một giữ chỗ quy hoạch chiếm giữ. Union theo kind:
 *  - `tiles`: danh sách ô {x,y};
 *  - `parcels`: danh sách id lô đất;
 *  - `placement`: toà đang định đặt/shifted (id toà, lô chứa, cột mốc originX);
 *  - `wave`: một đợt khai hoang (theo waveId).
 */
export type PlanningTargets =
  | { kind: 'tiles'; tiles: Array<{ x: number; y: number }> }
  | { kind: 'parcels'; parcelIds: string[] }
  | { kind: 'placement'; placement: { buildingId: string; parcelId: string; originX: number } }
  | { kind: 'wave'; waveId: string };

/**
 * Giữ chỗ quy hoạch của một người chơi — trạng thái TẠM của runtime (KHÔNG lưu save).
 * `name?` là tên hiển thị (để renderer vẽ bóng mờ + thông báo xung đột có tên người giữ).
 */
export interface PlanningReservation {
  accountId: string;
  kind: PlanningTargets['kind'];
  targets: PlanningTargets;
  expiresAt: number;
  name?: string;
}

/** Kết quả kiểm tra xung đột với giữ chỗ của người khác. */
export interface ReservationConflictResult {
  conflict: boolean;
  by?: { accountId: string; name?: string };
}

/** Xoá mọi giữ chỗ đã hết hạn (expiresAt <= now). Immutable, trả bản sao. */
export function pruneExpired(list: readonly PlanningReservation[], now: number): PlanningReservation[] {
  return list.filter((r) => r.expiresAt > now);
}

/** Tìm giữ chỗ còn hiệu lực của một người chơi (đã hết hạn coi như không có). */
export function activeReservationFor(
  list: readonly PlanningReservation[],
  accountId: string,
  now: number = Number.MAX_SAFE_INTEGER,
): PlanningReservation | null {
  const live = pruneExpired(list, now);
  return live.find((r) => r.accountId === accountId) ?? null;
}

const joinTiles = (a: ReadonlyArray<{ x: number; y: number }>, b: ReadonlyArray<{ x: number; y: number }>): boolean => {
  const bSet = new Set(b.map((t) => `${t.x},${t.y}`));
  return a.some((t) => bSet.has(`${t.x},${t.y}`));
};

/** Kiểm hai target có "đụng" nhau không (theo loại: ô / lô / đợt / placement). */
export function planningTargetsOverlap(a: PlanningTargets, b: PlanningTargets): boolean {
  if (a.kind === 'tiles' && b.kind === 'tiles') {
    return joinTiles(a.tiles, b.tiles);
  }
  if (a.kind === 'parcels' && b.kind === 'parcels') {
    return a.parcelIds.some((id) => b.parcelIds.includes(id));
  }
  if (a.kind === 'wave' && b.kind === 'wave') {
    return a.waveId === b.waveId;
  }
  // placement chiếm một lô — đụng với lô đang giữ (parcels) hoặc placement cùng lô.
  if (a.kind === 'placement' && b.kind === 'placement') {
    return a.placement.parcelId === b.placement.parcelId;
  }
  if (a.kind === 'placement' && b.kind === 'parcels') {
    return b.parcelIds.includes(a.placement.parcelId);
  }
  if (a.kind === 'parcels' && b.kind === 'placement') {
    return a.parcelIds.includes(b.placement.parcelId);
  }
  return false;
}

/**
 * Thay thế / đặt giữ chỗ cho `accountId` (1 người tối đa 1 giữ chỗ — giữ chỗ mới thay cũ).
 * Nếu `kind === 'tiles'` và `maxTiles` là số dương, CLAMP danh sách ô về tối đa `maxTiles`
 * (theo ngân sách còn lại — D1). Immutable, trả bản sao của mảng.
 */
export function setReservation(
  list: readonly PlanningReservation[],
  reservation: PlanningReservation,
  TTL: number = DEFAULT_PLANNING_TTL,
  now: number,
  maxTiles?: number,
): PlanningReservation[] {
  let next: PlanningReservation = {
    ...reservation,
    expiresAt: now + TTL,
  };

  if (next.kind === 'tiles' && next.targets.kind === 'tiles' && typeof maxTiles === 'number' && maxTiles >= 0) {
    next = {
      ...next,
      targets: { kind: 'tiles', tiles: next.targets.tiles.slice(0, maxTiles) },
    };
  }

  return [
    ...list.filter((r) => r.accountId !== reservation.accountId),
    next,
  ];
}

/** Đặt lại `expiresAt = now + TTL` cho giữ chỗ của `accountId`; không có thì trả list nguyên. */
export function extendReservation(
  list: readonly PlanningReservation[],
  accountId: string,
  now: number,
  TTL: number = DEFAULT_PLANNING_TTL,
): PlanningReservation[] {
  let found = false;
  const out = list.map((r) => {
    if (!found && r.accountId === accountId) {
      found = true;
      return { ...r, expiresAt: now + TTL };
    }
    return r;
  });
  return found ? out : [...list];
}

/** Xoá giữ chỗ của `accountId` (nếu có). Trả bản sao không chứa giữ chỗ đó. */
export function releaseReservation(list: readonly PlanningReservation[], accountId: string): PlanningReservation[] {
  return list.filter((r) => r.accountId !== accountId);
}

/**
 * Kiểm `targets` có đụng giữ chỗ của NGƯỜI KHÁC không (accountId !== excludeAccountId, chưa hết hạn).
 * Trả `{ conflict, by? }` với accountId/name của người giữ để server trả `reserved_by_other` kèm tên.
 */
export function reservationConflictsWith(
  list: readonly PlanningReservation[],
  excludeAccountId: string,
  targets: PlanningTargets,
  now: number = Number.MAX_SAFE_INTEGER,
): ReservationConflictResult {
  const live = pruneExpired(list, now);
  for (const r of live) {
    if (r.accountId === excludeAccountId) continue;
    if (planningTargetsOverlap(targets, r.targets)) {
      return { conflict: true, by: r.name != null ? { accountId: r.accountId, name: r.name } : { accountId: r.accountId } };
    }
  }
  return { conflict: false };
}
