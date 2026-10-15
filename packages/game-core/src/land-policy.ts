/**
 * land-policy.ts — quyết định quyền / phiếu cho một lệnh đất (OpenSpec `open-world-coop-land` 2.1 + 2.2, D2 + D3).
 * THUẦN: ghép `land-permissions` + `land-vote` với payload lệnh thật; server gọi trước khi chạy lệnh.
 */
import { LAND_PLOTS, LAND_LEASE_CONSTANTS, BUILDING_TYPE_DEFS, RECLAMATION_WAVES, resolveParcel, parcelPrice } from '@game/data';
import { landCommandPermission, type LandCommand, type MemberLandPermission } from './land-permissions';
import { shouldLandVote } from './land-vote';

export interface WorldLandSettings {
  /** Quyền của thành viên (không phải chủ); thiếu = 'vote' (mặc định theo D2). */
  memberLandPermissions?: MemberLandPermission;
  /** Chủ bỏ phiếu cho lệnh của chính mình (D3); thiếu = false. */
  ownerSkipsVote?: boolean;
}

export type LandDecision =
  | { action: 'allow' }
  | { action: 'forbid'; command: LandCommand }
  | { action: 'vote'; command: LandCommand };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lệnh đất (theo bảng D2) và giá ước tính của một thao tác; null nếu không phải lệnh đất. */
function classify(action: unknown): { command: LandCommand; price: number } | null {
  if (!isRecord(action)) return null;
  switch (action.type) {
    case 'reclaim_wave': {
      const wave = RECLAMATION_WAVES.find(item => item.id === action.waveId);
      return { command: 'reclaim_wave', price: wave?.cost ?? 0 };
    }
    case 'buy_parcel': {
      const parcel = typeof action.parcelId === 'string' ? resolveParcel(action.parcelId) : undefined;
      return { command: 'buy_parcel', price: parcel ? parcelPrice(parcel) : 0 };
    }
    case 'lease_parcel': {
      const parcel = typeof action.parcelId === 'string' ? resolveParcel(action.parcelId) : undefined;
      return { command: 'buy_parcel', price: parcel ? Math.floor(parcelPrice(parcel) * LAND_LEASE_CONSTANTS.leaseDailyRate * 30) : 0 };
    }
    case 'open_building': {
      const def = typeof action.buildingTypeId === 'string' ? (BUILDING_TYPE_DEFS as Record<string, { openCost: number }>)[action.buildingTypeId] : undefined;
      return { command: 'buy_plot', price: def?.openCost ?? 0 };
    }
    case 'buy_plot': {
      const plot = LAND_PLOTS.find(item => item.id === action.plotId);
      return { command: 'buy_plot', price: plot?.cost ?? 0 };
    }
    case 'expand_footprint': return { command: 'expand_footprint', price: 0 };
    case 'relocate_building': return { command: 'relocate_building', price: 0 };
    default: return null;
  }
}

/**
 * Quyết định cho lệnh (hoặc cả `layout_batch`): cấm > phiếu > cho phép (lấy mức chặt nhất của mọi thao tác đất).
 * Phiếu chỉ áp khi người kia đang online (D3); không ai để bỏ phiếu thì chạy luôn, không chặn người chơi.
 */
export function decideLandCommand(
  payload: unknown,
  role: 'owner' | 'member',
  settings: WorldLandSettings | undefined,
  funds: number,
  partnerOnline: boolean,
): LandDecision {
  const actions = isRecord(payload) && payload.type === 'layout_batch' && Array.isArray(payload.actions) ? payload.actions : [payload];
  const setting = settings?.memberLandPermissions ?? 'vote';
  const ownerSkipsVote = settings?.ownerSkipsVote ?? false;
  let decision: LandDecision = { action: 'allow' };
  let batchPrice = 0;
  for (const action of actions) {
    const info = classify(action);
    if (!info) continue;
    batchPrice += info.price;
    const permission = landCommandPermission(role, setting, info.command, { ownerSkipsVote });
    if (!permission.allowed) return { action: 'forbid', command: info.command };
    const votes = (permission.requiresVote ?? false) || shouldLandVote(info.command, info.price, funds, partnerOnline, { ownerSkipsVote, isOwner: role === 'owner' });
    if (votes && partnerOnline && decision.action === 'allow') decision = { action: 'vote', command: info.command };
  }
  // Tổng giá cả lô lớn hơn ngưỡng cũng cần phiếu, dù từng thao tác nhỏ (chỉ khi không phải chủ đã bỏ qua phiếu).
  if (decision.action === 'allow' && partnerOnline && batchPrice > 0 && !(ownerSkipsVote && role === 'owner') && shouldLandVote('buy_parcel', batchPrice, funds, true, { ownerSkipsVote, isOwner: role === 'owner' })) {
    const first = actions.map(classify).find(Boolean);
    decision = { action: 'vote', command: first?.command ?? 'buy_parcel' };
  }
  return decision;
}
