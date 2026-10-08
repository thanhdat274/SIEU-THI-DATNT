/**
 * Quyền người phụ trách tòa (OpenSpec `open-world-coop-contracts` 6c, D2).
 * THUẦN: không socket, không gateway, không giữ trạng thái.
 *
 * Bối cảnh D2:
 * - `BuildingPlacement.managerAccountId?`: gán bởi chủ hẻm, hoặc người mở tòa
 *   tự thành người phụ trách (xem `canSelfAssignManager`).
 * - Lệnh bố cục/giá/nhân viên của tòa: người phụ trách LUÔN được; người kia
 *   theo `world.settings.nonManagerActions` = 'allow' (mặc định) | 'vote' | 'deny'.
 * - Chơi một mình: không có người phụ trách, mọi thứ như cũ.
 *
 * BẠN KHÔNG sửa shared/schema ở đây: gán `managerAccountId` lên
 * `BuildingPlacement` (đụng shared/schema + validatePlacement) là CHỜ MÁY THẬT.
 * Hàm này nhận interface truyền vào để logic THUẦN vẫn đúng (provisional).
 */

export type NonManagerActionSetting = 'allow' | 'vote' | 'deny';

/** Cài đặt mặc định cho `world.settings.nonManagerActions` theo D2. */
export const DEFAULT_NON_MANAGER_ACTIONS: NonManagerActionSetting = 'allow';

export type ManagerDecisionReason =
  /** accountId chính là người phụ trách tòa. */
  | 'manager'
  /** accountId là chủ hẻm → luôn được (người phụ trách tòa vẫn tùy chọn). */
  | 'owner'
  /** Không có người phụ trách → chơi một mình / chưa gán, cho phép như cũ. */
  | 'sole'
  /** Được theo cài đặt nonManagerActions='allow'. */
  | 'setting'
  /** Được theo nonManagerActions='vote' vì đã có phiếu đồng ý (inVote=true). */
  | 'vote'
  /** Chưa có phiếu đồng ý nên cần chờ phiếu ở server (máy thật). */
  | 'needs_vote'
  /** Bị từ chối theo nonManagerActions='deny'. */
  | 'deny';

export interface ManagerDecisionResult {
  allowed: boolean;
  reason: ManagerDecisionReason;
}

export interface ManagerDecisionInput {
  accountId: string;
  /** `BuildingPlacement.managerAccountId?` — undefined = chơi một mình / chưa gán. */
  buildingManagerAccountId?: string;
  /** `world.settings.nonManagerActions` ('allow' mặc định theo D2). */
  nonManagerActions: NonManagerActionSetting;
  /** accountId có phải chủ hẻm không. */
  isOwnerHẻm?: boolean;
  /** Đã có phiếu đồng ý cho hành động này chưa (chỉ dùng cho nhánh 'vote'). */
  inVote?: boolean;
}

/**
 * Quyết định quyền hành động lên tòa theo người phụ trách (D2).
 * Return bản sao immutable (luôn object mới).
 *
 * Bảng D2:
 * | accountId                        | Kết quả                                        |
 * |----------------------------------|------------------------------------------------|
 * | = buildingManagerAccountId       | allowed, reason 'manager'                      |
 * | là chủ hẻm                       | allowed, reason 'owner'                        |
 * | không có người phụ trách         | allowed như cũ (reason 'sole'), trừ deny+không chủ |
 * | khác (không phụ trách)           | theo nonManagerActions: allow / vote (inVote) / deny |
 */
export function managerDecision(input: ManagerDecisionInput): ManagerDecisionResult {
  const { accountId, buildingManagerAccountId, nonManagerActions, isOwnerHẻm = false, inVote = false } = input;

  // Người phụ trách tòa luôn được.
  if (buildingManagerAccountId !== undefined && accountId === buildingManagerAccountId) {
    return { allowed: true, reason: 'manager' };
  }

  // Chủ hẻm luôn được (bất kể có người phụ trách hay chưa gán).
  if (isOwnerHẻm) {
    return { allowed: true, reason: 'owner' };
  }

  // Không có người phụ trách → chơi một mình / chưa gán: cho phép như cũ,
  // trừ khi cài đặt 'deny' và accountId không phải chủ hẻm.
  if (buildingManagerAccountId === undefined) {
    if (nonManagerActions === 'deny') {
      return { allowed: false, reason: 'deny' };
    }
    return { allowed: true, reason: 'sole' };
  }

  // accountId khác người phụ trách (và không phải chủ hẻm): theo cài đặt.
  switch (nonManagerActions) {
    case 'allow':
      return { allowed: true, reason: 'setting' };
    case 'vote':
      if (inVote) return { allowed: true, reason: 'vote' };
      // Chưa có phiếu: vẫn cần phiếu đồng ý ở server (báo note là máy thật).
      return { allowed: false, reason: 'needs_vote' };
    case 'deny':
    default:
      return { allowed: false, reason: 'deny' };
  }
}

export interface ManagerSelfAssignInput {
  accountId: string;
  /** Người mở tòa (builder) — người duy nhất có thể tự thành người phụ trách. */
  builderAccountId?: string;
  /** Tòa đã có người phụ trách chưa (đã gán thì false). */
  alreadyAssigned?: boolean;
}

/**
 * Người mở tòa tự thành người phụ trách nếu chưa ai (D2).
 * Chỉ đúng khi accountId khớp builderAccountId và tòa chưa gán người phụ trách.
 */
export function canSelfAssignManager(input: ManagerSelfAssignInput): boolean {
  const { accountId, builderAccountId, alreadyAssigned = false } = input;
  return !alreadyAssigned && builderAccountId !== undefined && accountId === builderAccountId;
}
