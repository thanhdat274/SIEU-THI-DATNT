import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  landCommandPermission,
  type LandCommand,
} from './land-permissions';
import {
  shouldLandVote,
  createLandVote,
  agreeLandVote,
  refuseLandVote,
  isLandVoteExpired,
  resolveLandVoteOnPartnerLeave,
  LARGE_SPEND_RATIO,
} from './land-vote';

/**
 * Co-op quy hoạch đất — phần THUẦN (OpenSpec `open-world-coop-land`, 2.1+2.2):
 * bảng quyền D2 + khuôn phiếu land-vote D3. KHÔNG socket/gateway/UI.
 * Chạy độc lập bằng `tsx src/land-core-coop.test.ts`; `run*Tests()` có thể
 * nối vào test-runner.ts sau.
 */

const CMDS: LandCommand[] = ['expand_footprint', 'buy_parcel', 'buy_plot', 'relocate_building', 'reclaim_wave'];
const RELOCATE_RECLAIM: LandCommand[] = ['relocate_building', 'reclaim_wave'];
const PLAIN: LandCommand[] = ['expand_footprint', 'buy_parcel', 'buy_plot'];

export function runLandPermissionTests(): void {
  describe('D2 landCommandPermission — member', () => {
    it('setting "none" chặn mọi lệnh đất', () => {
      for (const cmd of CMDS) {
        assert.deepEqual(landCommandPermission('member', 'none', cmd), { allowed: false });
      }
    });
    it('setting "vote": expand/buy được, relocate/reclaim requiresVote', () => {
      for (const cmd of PLAIN) {
        assert.deepEqual(landCommandPermission('member', 'vote', cmd), { allowed: true });
      }
      for (const cmd of RELOCATE_RECLAIM) {
        assert.deepEqual(landCommandPermission('member', 'vote', cmd), { allowed: true, requiresVote: true });
      }
    });
    it('setting "full": mọi lệnh được, relocate/reclaim vẫn requiresVote', () => {
      for (const cmd of PLAIN) {
        assert.deepEqual(landCommandPermission('member', 'full', cmd), { allowed: true });
      }
      for (const cmd of RELOCATE_RECLAIM) {
        assert.deepEqual(landCommandPermission('member', 'full', cmd), { allowed: true, requiresVote: true });
      }
    });
  });

  describe('D2 landCommandPermission — owner', () => {
    it('owner luôn allowed với mọi lệnh', () => {
      for (const cmd of CMDS) {
        assert.equal(landCommandPermission('owner', 'vote', cmd).allowed, true);
      }
    });
    it('owner dời/khai hoang cần phiếu trừ khi ownerSkipsVote=true', () => {
      for (const cmd of RELOCATE_RECLAIM) {
        assert.deepEqual(landCommandPermission('owner', 'vote', cmd), { allowed: true, requiresVote: true });
        assert.deepEqual(
          landCommandPermission('owner', 'vote', cmd, { ownerSkipsVote: true }),
          { allowed: true },
        );
      }
      for (const cmd of PLAIN) {
        assert.deepEqual(landCommandPermission('owner', 'vote', cmd), { allowed: true });
      }
    });
  });
}

export function runLandVoteTests(): void {
  describe('D3 shouldLandVote', () => {
    it('dời tòa → true bất kể giá/online (và không phải owner-skip)', () => {
      assert.equal(shouldLandVote('relocate_building', 0, 1_000_000, false), true);
      assert.equal(shouldLandVote('reclaim_wave', 0, 1_000_000, false), true);
    });
    it('mua lô/đất lớn > 30% quỹ và người kia online → true', () => {
      const funds = 1_000_000;
      const big = Math.floor(funds * LARGE_SPEND_RATIO) + 1;
      assert.equal(shouldLandVote('buy_plot', big, funds, true), true);
      assert.equal(shouldLandVote('buy_parcel', big, funds, true), true);
      assert.equal(shouldLandVote('expand_footprint', big, funds, true), true);
    });
    it('người kia offline: đắt cũng không cần phiếu trừ lệnh dời/khai hoang', () => {
      const funds = 1_000_000;
      const big = Math.floor(funds * LARGE_SPEND_RATIO) + 1;
      assert.equal(shouldLandVote('buy_plot', big, funds, false), false);
      assert.equal(shouldLandVote('buy_parcel', big, funds, false), false);
      assert.equal(shouldLandVote('relocate_building', big, funds, false), true, 'dời vẫn cần phiếu');
    });
    it('giá không vượt ngưỡng → không cần phiếu', () => {
      const funds = 1_000_000;
      const small = Math.floor(funds * LARGE_SPEND_RATIO);
      assert.equal(shouldLandVote('buy_plot', small, funds, true), false);
    });
    it('ownerSkipsVote + isOwner → false kể cả dời/khai hoang', () => {
      assert.equal(shouldLandVote('relocate_building', 0, 100, true, { ownerSkipsVote: true, isOwner: true }), false);
      assert.equal(shouldLandVote('reclaim_wave', 0, 100, true, { ownerSkipsVote: true, isOwner: true }), false);
      assert.equal(shouldLandVote('buy_plot', 999_999, 100, true, { ownerSkipsVote: true, isOwner: true }), false);
    });
    it('owner chưa bật skip: dời/khai hoang vẫn cần phiếu', () => {
      assert.equal(shouldLandVote('relocate_building', 0, 100, true, { isOwner: true }), true);
    });
  });

  describe('D3 luồng phiếu', () => {
    const now = 1_000_000;
    const payload = { type: 'relocate_building', buildingId: 'b1' };

    it('createLandVote: pending, expiresAt = now + TTL (45 s)', () => {
      const v = createLandVote('alice', 'relocate_building', payload, now);
      assert.equal(v.status, 'pending');
      assert.equal(v.id, `alice:relocate_building:${now}`);
      assert.equal(v.initiatorId, 'alice');
      assert.equal(v.targetCommand, 'relocate_building');
      assert.equal(v.payload, payload);
      assert.equal(v.expiresAt, now + 45_000);
    });
    it('agreeLandVote → approved chỉ khi pending', () => {
      const v = createLandVote('alice', 'relocate_building', payload, now);
      const a = agreeLandVote(v);
      assert.equal(a.status, 'approved');
      assert.equal(v.status, 'pending', 'trả bản sao, không đổi gốc');
      const re = agreeLandVote(a);
      assert.equal(re.status, 'approved', 'phiếu đã quyết không đổi ngược');
    });
    it('refuseLandVote → rejected', () => {
      const v = createLandVote('alice', 'relocate_building', payload, now);
      assert.equal(refuseLandVote(v).status, 'rejected');
      assert.equal(v.status, 'pending', 'trả bản sao, không đổi gốc');
    });
    it('isLandVoteExpired: chỉ hết hạn khi expiresAt <= now', () => {
      const v = createLandVote('alice', 'relocate_building', payload, now);
      assert.equal(isLandVoteExpired(v, now + 44_999), false);
      assert.equal(isLandVoteExpired(v, now + 45_000), true);
      assert.equal(isLandVoteExpired(v, now + 100_000), true);
    });
    it('resolveLandVoteOnPartnerLeave: người kia rời → executed, chạy ngay', () => {
      const v = createLandVote('alice', 'relocate_building', payload, now);
      // Cả hai online → giữ nguyên.
      const both = resolveLandVoteOnPartnerLeave(v, ['alice', 'bob']);
      assert.equal(both.shouldExecute, false);
      assert.equal(both.vote.status, 'pending');
      // Người kia (bob) rời, alice còn online → chạy ngay.
      const left = resolveLandVoteOnPartnerLeave(v, ['alice']);
      assert.equal(left.shouldExecute, true);
      assert.equal(left.vote.status, 'executed');
      // Initiator rời (phiếu mồ côi) → không thực thi, giữ nguyên.
      const orphan = resolveLandVoteOnPartnerLeave(v, ['bob']);
      assert.equal(orphan.shouldExecute, false);
      assert.equal(orphan.vote.status, 'pending');
    });
  });

  console.log('  ✓ land-vote: shouldLandVote + tạo/đồng ý/từ chối/hết hạn/rời người kia');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('land-core-coop');
if (isDirect) {
  runLandPermissionTests();
  runLandVoteTests();
}
