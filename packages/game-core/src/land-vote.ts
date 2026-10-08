/**
 * Phiếu cho khoản chi đất lớn (OpenSpec `open-world-coop-land`, D3) — THUẦN.
 * Không socket, không gateway, không giữ trạng thái: mọi hàm trả bản sao.
 *
 * D3: áp khi lệnh là dời tòa hoặc khai hoang, HOẶC giá > LARGE_SPEND_RATIO × quỹ
 * hiện tại, VÀ người kia đang online. Người kia đồng ý → server chạy lệnh gốc;
 * từ chối / hết 45 s → hủy; người kia rời trong lúc chờ → chạy ngay.
 * Chủ gửi lệnh khi member online cũng tạo phiếu, trừ khi ownerSkipsVote=true.
 */

import type { LandCommand } from './land-permissions';

export type LandVoteStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'executed';

export interface LandVote {
  id: string;
  initiatorId: string;
  targetCommand: LandCommand;
  /** Lệnh gốc đã được validate — server sẽ chạy chính payload này khi đồng ý. */
  payload: unknown;
  expiresAt: number;
  status: LandVoteStatus;
}

export interface LandVoteOptions {
  /** Chủ đặt true để bỏ phiếu cho chính mình. */
  ownerSkipsVote?: boolean;
  /** Người ra lệnh có phải chủ hẻm không. */
  isOwner?: boolean;
}

/** Ngưỡng khoản chi lớn: giá > 30% quỹ hiện tại thì cần phiếu (D3). */
export const LARGE_SPEND_RATIO = 0.3;

/** TTL phiếu đất, mili-giây (45 s, khớp D3). */
export const LAND_VOTE_TTL_MS = 45_000;

const RELOCATE_OR_RECLAIM = new Set<LandCommand>(['relocate_building', 'reclaim_wave']);

/**
 * Có cần phiếu cho lệnh đất này không (D3)?
 * true khi: dời tòa / khai hoang (không phải owner-skip), HOẶC
 * (giá > LARGE_SPEND_RATIO × quỹ) VÀ người kia online.
 * ownerSkipsVote && isOwner → luôn false.
 */
export function shouldLandVote(
  cmd: LandCommand,
  price: number,
  funds: number,
  onlinePartner: boolean,
  opts: LandVoteOptions = {},
): boolean {
  const { ownerSkipsVote = false, isOwner = false } = opts;
  if (ownerSkipsVote && isOwner) return false;
  if (RELOCATE_OR_RECLAIM.has(cmd)) return true;
  return price > LARGE_SPEND_RATIO * funds && onlinePartner;
}

/** Tạo phiếu đất ở trạng thái pending; expiresAt = now + TTL. */
export function createLandVote(
  initiatorId: string,
  targetCommand: LandCommand,
  payload: unknown,
  now: number,
  TTL: number = LAND_VOTE_TTL_MS,
): LandVote {
  return {
    id: `${initiatorId}:${targetCommand}:${now}`,
    initiatorId,
    targetCommand,
    payload,
    expiresAt: now + TTL,
    status: 'pending',
  };
}

/** Đồng ý → status 'approved' (chỉ khi còn pending; ngược lại giữ nguyên). */
export function agreeLandVote(vote: LandVote): LandVote {
  if (vote.status !== 'pending') return { ...vote };
  return { ...vote, status: 'approved' };
}

/** Từ chối → status 'rejected'. */
export function refuseLandVote(vote: LandVote): LandVote {
  return { ...vote, status: 'rejected' };
}

/** Phiếu đã hết hạn nếu expiresAt <= now. */
export function isLandVoteExpired(vote: LandVote, now: number): boolean {
  return vote.expiresAt <= now;
}

/**
 * Người kia (không phải initiator) rời trong lúc chờ → chạy ngay (D3): trả
 * bản sao status 'executed' + shouldExecute=true. Nếu người kia còn online
 * (hoặc chính initiator đã rời) → giữ nguyên phiếu, shouldExecute=false.
 */
export function resolveLandVoteOnPartnerLeave(
  vote: LandVote,
  onlineIds: string[],
): { vote: LandVote; shouldExecute: boolean } {
  const initiatorOnline = onlineIds.includes(vote.initiatorId);
  const otherOnline = onlineIds.some((id) => id !== vote.initiatorId);
  if (initiatorOnline && !otherOnline) {
    return { vote: { ...vote, status: 'executed' }, shouldExecute: true };
  }
  return { vote, shouldExecute: false };
}
