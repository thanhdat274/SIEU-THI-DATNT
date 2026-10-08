/**
 * Quyền lệnh đất theo vai trò (OpenSpec `open-world-coop-land`, D2).
 * THUẦN: không socket, không gateway, không giữ trạng thái.
 *
 * Bảng D2:
 * | Lệnh                          | owner | member (mặc định) |
 * |-------------------------------|-------|-------------------|
 * | expand_footprint, buy_parcel  | ✔     | ✔                 |
 * | mua tòa (buy_plot building)   | ✔     | ✔                 |
 * | relocate_building             | ✔     | cần phiếu (D3)    |
 * | reclaim_wave                  | ✔     | cần phiếu (D3)    |
 *
 * `world.settings.memberLandPermissions`: 'full' | 'vote' (mặc định) | 'none'.
 * D3: dời tòa / khai hoang luôn cần phiếu (với member, bất kể full/vote);
 * với owner cũng cần phiếu trừ khi đặt ownerSkipsVote=true.
 */

export type MemberLandPermission = 'full' | 'vote' | 'none';

export type LandCommand =
  | 'expand_footprint'
  | 'buy_parcel'
  | 'buy_plot'
  | 'relocate_building'
  | 'reclaim_wave';

export type LandCommandRole = 'owner' | 'member';

export interface LandPermissionResult {
  allowed: boolean;
  /** Phiếu D3 có áp dụng cho lệnh không (chỉ có khi allowed). */
  requiresVote?: boolean;
}

export interface LandPermissionOptions {
  /** Chủ đặt true để bỏ phiếu cho lệnh của chính mình (D3). */
  ownerSkipsVote?: boolean;
}

const RELOCATE_OR_RECLAIM: ReadonlySet<LandCommand> = new Set<LandCommand>([
  'relocate_building',
  'reclaim_wave',
]);

/** D3: dời tòa / khai hoang cần phiếu, trừ khi chủ bỏ phiếu cho mình. */
function requiresVoteForOwner(cmd: LandCommand, ownerSkipsVote: boolean): boolean {
  return RELOCATE_OR_RECLAIM.has(cmd) && !ownerSkipsVote;
}

/**
 * Quyết định quyền cho một lệnh đất theo vai trò + thiết lập member.
 * Return bản sao immutable (luôn object mới).
 */
export function landCommandPermission(
  role: LandCommandRole,
  setting: MemberLandPermission,
  cmd: LandCommand,
  opts: LandPermissionOptions = {},
): LandPermissionResult {
  const { ownerSkipsVote = false } = opts;

  if (role === 'owner') {
    const result: LandPermissionResult = { allowed: true };
    if (requiresVoteForOwner(cmd, ownerSkipsVote)) result.requiresVote = true;
    return result;
  }

  // member
  if (setting === 'none') return { allowed: false };

  const result: LandPermissionResult = { allowed: true };
  if (RELOCATE_OR_RECLAIM.has(cmd)) result.requiresVote = true;
  return result;
}
