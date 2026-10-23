/**
 * land-policy.ts — quyết định quyền / phiếu cho một lệnh đất (OpenSpec `open-world-coop-land` 2.1 + 2.2, D2 + D3).
 * THUẦN: ghép `land-permissions` + `land-vote` với payload lệnh thật; server gọi trước khi chạy lệnh.
 */
import { LAND_PLOTS, LAND_LEASE_CONSTANTS, BUILDING_TYPE_DEFS, RECLAMATION_WAVES, resolveParcel, parcelPrice, civicBundleById } from '@game/data';
import { OFFLINE_DAILY_CASH_CAP_RATIO, civicOpenCost, countBuildingsOfType, type CivicBundleState } from './civic-bundles';
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
  | { action: 'forbid'; command: LandCommand; reason?: 'daily_cap' }
  | { action: 'vote'; command: LandCommand };

/** Bối cảnh thêm để tính giá mở tòa (civic) cho phiếu — tòa đầu sau khi xong sổ được giảm giá. */
export interface LandContext {
  /** Trạng thái sổ góp xóm (civic.bundles) để tính `civicOpenCost`. */
  bundleStates?: Record<string, CivicBundleState | undefined>;
  /** Các tòa đã đặt (buildingPlacements) để đếm số tòa cùng loại đã có. */
  buildings?: Array<{ buildingId: string }>;
  /** Tiền người gửi lệnh đã góp vào các ô quỹ trong ngày hôm nay (trần ngày khi chủ hẻm offline). */
  memberCashDonatedToday?: number;
  /** Tiền chung đầu ngày để trần cố định cả ngày (thiếu = tính theo tiền hiện tại + đã góp). */
  dayStartFunds?: number;
}

/**
 * Tiền chung đầu ngày dùng làm cố định cho trần góp ngày: chỉ lấy `openingMoney` của bản ghi ngày HIỆN TẠI
 * (`currentDayRecord.day === worldTime.day`); save cũ không có `openingMoney` hoặc bản ghi ngày cũ → undefined
 * (trần tính theo tiền hiện tại + đã góp).
 */
export function dayStartFundsOf(save: { currentDayRecord?: { day: number; openingMoney?: number }; worldTime: { day: number } }): number | undefined {
  const rec = save.currentDayRecord;
  return rec && rec.day === save.worldTime.day ? rec.openingMoney : undefined;
}

/** Số tiền thật sự được nhận khi góp: không quá phần thiếu của ô (góp vượt chỉ nhận phần thiếu). */
function effectiveCashDonation(action: Record<string, unknown>, ctx?: LandContext): number {
  const amount = typeof action.amount === 'number' ? Math.max(0, action.amount) : 0;
  const bundle = typeof action.bundleId === 'string' ? civicBundleById(action.bundleId) : undefined;
  const slot = bundle?.slots.find(s => s.id === action.slotId && s.kind === 'cash');
  if (!bundle || !slot) return amount;
  const current = ctx?.bundleStates?.[bundle.id]?.slots[slot.id] ?? 0;
  return Math.min(amount, Math.max(0, (slot.amount ?? 0) - current));
}

/** Mô tả phiếu cho UI: "Góp X₫ vào Quỹ xây dựng — <công trình>"; undefined nếu không phải phiếu góp tiền. */
export function landVoteDescription(payload: unknown, ctx?: LandContext): string | undefined {
  if (!isRecord(payload) || payload.type !== 'donate_to_bundle' || typeof payload.amount !== 'number') return undefined;
  const bundle = typeof payload.bundleId === 'string' ? civicBundleById(payload.bundleId) : undefined;
  const typeName = bundle ? (BUILDING_TYPE_DEFS as Record<string, { name: string }>)[bundle.buildingTypeId]?.name ?? bundle.buildingTypeId : 'sổ góp xóm';
  return `Góp ${effectiveCashDonation(payload, ctx).toLocaleString('vi-VN')}₫ vào Quỹ xây dựng — ${typeName}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lệnh đất (theo bảng D2) và giá ước tính của một thao tác; null nếu không phải lệnh đất. */
function classify(action: unknown, ctx?: LandContext): { command: LandCommand; price: number } | null {
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
      const typeId = typeof action.buildingTypeId === 'string' ? action.buildingTypeId : '';
      const def = (BUILDING_TYPE_DEFS as Record<string, { openCost: number; buildCost?: number }>)[typeId];
      // Civic: buildCost là nguồn duy nhất (CIVIC_DEFS); dùng ĐÚNG `civicOpenCost` như lúc trừ tiền —
      // ngưỡng phiếu tính theo giá CÒN PHẢI TRẢ (tòa đầu sau khi xong sổ được giảm phần đã góp).
      const existingCount = countBuildingsOfType(ctx?.buildings, typeId);
      const price = civicOpenCost(typeId, def?.buildCost ?? def?.openCost ?? 0, ctx?.bundleStates, existingCount);
      return { command: 'buy_plot', price };
    }
    case 'buy_plot': {
      const plot = LAND_PLOTS.find(item => item.id === action.plotId);
      return { command: 'buy_plot', price: plot?.cost ?? 0 };
    }
    case 'donate_to_bundle': {
      // Chỉ góp TIỀN là khoản chi đất (hàng: mọi thành viên, không phiếu). Giá = phần thực sự nhận (≤ phần thiếu của ô).
      if (typeof action.amount !== 'number' || action.productId !== undefined) return null;
      return { command: 'donate_bundle_cash', price: effectiveCashDonation(action, ctx) };
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
  ctx?: LandContext,
): LandDecision {
  const actions = isRecord(payload) && payload.type === 'layout_batch' && Array.isArray(payload.actions) ? payload.actions : [payload];
  const setting = settings?.memberLandPermissions ?? 'vote';
  const ownerSkipsVote = settings?.ownerSkipsVote ?? false;
  let decision: LandDecision = { action: 'allow' };
  let batchPrice = 0;
  for (const action of actions) {
    const info = classify(action, ctx);
    if (!info) continue;
    batchPrice += info.price;
    const permission = landCommandPermission(role, setting, info.command, { ownerSkipsVote });
    if (!permission.allowed) return { action: 'forbid', command: info.command };
    // Chủ hẻm offline: góp tiền chạy thẳng không phiếu, nên mỗi thành viên bị trần theo ngày (30% tiền chung đầu ngày).
    if (info.command === 'donate_bundle_cash' && role === 'member' && !partnerOnline) {
      const donated = ctx?.memberCashDonatedToday ?? 0;
      if (donated + info.price > Math.floor((ctx?.dayStartFunds ?? funds + donated) * OFFLINE_DAILY_CASH_CAP_RATIO)) return { action: 'forbid', command: info.command, reason: 'daily_cap' };
    }
    const votes = (permission.requiresVote ?? false) || shouldLandVote(info.command, info.price, funds, partnerOnline, { ownerSkipsVote, isOwner: role === 'owner' });
    if (votes && partnerOnline && decision.action === 'allow') decision = { action: 'vote', command: info.command };
  }
  // Tổng giá cả lô lớn hơn ngưỡng cũng cần phiếu, dù từng thao tác nhỏ (chỉ khi không phải chủ đã bỏ qua phiếu).
  if (decision.action === 'allow' && partnerOnline && batchPrice > 0 && !(ownerSkipsVote && role === 'owner') && shouldLandVote('buy_parcel', batchPrice, funds, true, { ownerSkipsVote, isOwner: role === 'owner' })) {
    const first = actions.map(a => classify(a, ctx)).find(Boolean);
    decision = { action: 'vote', command: first?.command ?? 'buy_parcel' };
  }
  return decision;
}
