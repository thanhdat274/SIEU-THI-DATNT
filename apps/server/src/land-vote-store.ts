import { agreeLandVote, createLandVote, isLandVoteExpired, refuseLandVote, resolveLandVoteOnPartnerLeave, type LandCommand, type LandVote } from '@game/core';

/**
 * Phiếu khoản chi đất đang chờ của từng hẻm (OpenSpec `open-world-coop-land` 2.2, D3): mỗi hẻm tối đa MỘT phiếu.
 * Giữ cả thân yêu cầu HTTP gốc của người đề xuất để chạy lại đúng lệnh (cùng `commandId`) khi người kia đồng ý.
 * Chỉ trong bộ nhớ: phiếu chỉ sống 45 giây, mất khi server khởi động lại thì lệnh coi như bị hủy (chưa trừ tiền).
 */
export interface PendingLandVote {
  vote: LandVote;
  /** Thân yêu cầu `commitCommand` của người đề xuất (receipt + payload), chạy lại khi được duyệt. */
  body: unknown;
}

export interface LandVoteSummary {
  id: string;
  initiatorId: string;
  command: LandCommand;
  expiresInMs: number;
}

export type LandVoteResponse =
  | { kind: 'none' }
  | { kind: 'approved'; pending: PendingLandVote }
  | { kind: 'rejected'; pending: PendingLandVote };

export class LandVoteStore {
  private readonly votes = new Map<string, PendingLandVote>();

  /** Phiếu còn hiệu lực của hẻm (phiếu hết hạn bị bỏ ở lần gọi `expire`, không tự xóa ở đây). */
  get(worldId: string): PendingLandVote | undefined {
    return this.votes.get(worldId);
  }

  /** Mở phiếu mới; false nếu hẻm đã có phiếu đang chờ. */
  start(worldId: string, initiatorId: string, command: LandCommand, payload: unknown, body: unknown, now = Date.now()): PendingLandVote | null {
    if (this.votes.has(worldId)) return null;
    const pending: PendingLandVote = { vote: createLandVote(initiatorId, command, payload, now), body };
    this.votes.set(worldId, pending);
    return pending;
  }

  /** Người KHÁC người đề xuất trả lời; đồng ý/từ chối đều đóng phiếu. */
  respond(worldId: string, responderId: string, agree: boolean, now = Date.now()): LandVoteResponse {
    const pending = this.votes.get(worldId);
    if (!pending || pending.vote.initiatorId === responderId || isLandVoteExpired(pending.vote, now)) return { kind: 'none' };
    this.votes.delete(worldId);
    return agree
      ? { kind: 'approved', pending: { ...pending, vote: agreeLandVote(pending.vote) } }
      : { kind: 'rejected', pending: { ...pending, vote: refuseLandVote(pending.vote) } };
  }

  /** Người đề xuất tự hủy phiếu của mình. */
  cancel(worldId: string, accountId: string): PendingLandVote | undefined {
    const pending = this.votes.get(worldId);
    if (!pending || pending.vote.initiatorId !== accountId) return undefined;
    this.votes.delete(worldId);
    return pending;
  }

  /** Gỡ mọi phiếu đã hết hạn; trả danh sách để báo cho hẻm. */
  expire(now = Date.now()): Array<{ worldId: string; pending: PendingLandVote }> {
    const expired: Array<{ worldId: string; pending: PendingLandVote }> = [];
    for (const [worldId, pending] of this.votes) {
      if (!isLandVoteExpired(pending.vote, now)) continue;
      this.votes.delete(worldId);
      expired.push({ worldId, pending });
    }
    return expired;
  }

  /** Người kia rời hẻm: nếu chỉ còn người đề xuất online thì phiếu chạy ngay (D3); ngược lại giữ nguyên. */
  resolveOnLeave(worldId: string, onlineIds: string[]): PendingLandVote | undefined {
    const pending = this.votes.get(worldId);
    if (!pending) return undefined;
    const resolved = resolveLandVoteOnPartnerLeave(pending.vote, onlineIds);
    if (!resolved.shouldExecute) {
      // Chính người đề xuất rời thì phiếu vô nghĩa: hủy.
      if (!onlineIds.includes(pending.vote.initiatorId)) { this.votes.delete(worldId); }
      return undefined;
    }
    this.votes.delete(worldId);
    return { ...pending, vote: resolved.vote };
  }

  summary(worldId: string, now = Date.now()): LandVoteSummary | null {
    const pending = this.votes.get(worldId);
    if (!pending) return null;
    return { id: pending.vote.id, initiatorId: pending.vote.initiatorId, command: pending.vote.targetCommand, expiresInMs: Math.max(0, pending.vote.expiresAt - now) };
  }
}

export const landVotes = new LandVoteStore();
