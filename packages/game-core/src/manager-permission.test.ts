import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  managerDecision,
  canSelfAssignManager,
  DEFAULT_NON_MANAGER_ACTIONS,
  type NonManagerActionSetting,
} from './manager-permission';

/**
 * Quyền người phụ trách tòa — phần THUẦN (OpenSpec `open-world-coop-contracts` 6c, D2).
 * KHÔNG socket/gateway/UI; gán `managerAccountId` lên BuildingPlacement là CHỜ MÁY THẬT.
 * Chạy độc lập bằng `tsx src/manager-permission.test.ts`; `runManagerPermissionTests()`
 * có thể nối vào test-runner.ts sau (LEAD làm).
 */

/** Gói họp tham số phổ biến cho managerDecision. */
function decide(opts: {
  accountId: string;
  buildingManagerAccountId?: string;
  nonManagerActions?: NonManagerActionSetting;
  isOwnerHẻm?: boolean;
  inVote?: boolean;
}) {
  return managerDecision({
    accountId: opts.accountId,
    buildingManagerAccountId: opts.buildingManagerAccountId,
    nonManagerActions: opts.nonManagerActions ?? DEFAULT_NON_MANAGER_ACTIONS,
    isOwnerHẻm: opts.isOwnerHẻm,
    inVote: opts.inVote,
  });
}

export function runManagerPermissionTests(): void {
  describe('D2 managerDecision — không có người phụ trách (chơi một mình / chưa gán)', () => {
    it('default "allow": mọi account được như cũ', () => {
      assert.deepEqual(decide({ accountId: 'a' }), { allowed: true, reason: 'sole' });
      assert.deepEqual(decide({ accountId: 'b' }), { allowed: true, reason: 'sole' });
    });
    it('nonManagerActions "vote": chưa gán người phụ trách → vẫn được như cũ', () => {
      assert.deepEqual(decide({ accountId: 'a', nonManagerActions: 'vote' }), { allowed: true, reason: 'sole' });
    });
    it('nonManagerActions "deny": account không phải chủ hẻm bị từ chối', () => {
      const r = decide({ accountId: 'b', nonManagerActions: 'deny' });
      assert.equal(r.allowed, false);
      assert.equal(r.reason, 'deny');
    });
    it('nonManagerActions "deny": chủ hẻm vẫn được (reason owner)', () => {
      assert.deepEqual(decide({ accountId: 'alley', nonManagerActions: 'deny', isOwnerHẻm: true }), {
        allowed: true,
        reason: 'owner',
      });
    });
  });

  describe('D2 managerDecision — người phụ trách / chủ hẻm luôn được', () => {
    it('accountId === buildingManagerAccountId → allowed reason manager', () => {
      assert.deepEqual(decide({ accountId: 'a', buildingManagerAccountId: 'a', nonManagerActions: 'deny' }), {
        allowed: true,
        reason: 'manager',
      });
      assert.deepEqual(decide({ accountId: 'a', buildingManagerAccountId: 'a', nonManagerActions: 'vote' }), {
        allowed: true,
        reason: 'manager',
      });
      assert.deepEqual(decide({ accountId: 'a', buildingManagerAccountId: 'a', nonManagerActions: 'allow' }), {
        allowed: true,
        reason: 'manager',
      });
    });
    it('chủ hẻm luôn được bất kể nonManagerActions và người phụ trách', () => {
      assert.deepEqual(decide({ accountId: 'alley', buildingManagerAccountId: 'a', nonManagerActions: 'deny', isOwnerHẻm: true }), {
        allowed: true,
        reason: 'owner',
      });
      assert.deepEqual(decide({ accountId: 'alley', nonManagerActions: 'deny', isOwnerHẻm: true }), {
        allowed: true,
        reason: 'owner',
      });
    });
  });

  describe('D2 managerDecision — account khác người phụ trách theo nonManagerActions', () => {
    const base = { accountId: 'b', buildingManagerAccountId: 'a' };
    it('"allow": được', () => {
      assert.deepEqual(decide({ ...base, nonManagerActions: 'allow' }), { allowed: true, reason: 'setting' });
    });
    it('"vote" không inVote: chưa có phiếu → từ chối (needs_vote)', () => {
      const r = decide({ ...base, nonManagerActions: 'vote' });
      assert.equal(r.allowed, false);
      assert.equal(r.reason, 'needs_vote');
    });
    it('"vote" với inVote=true: được (reason vote)', () => {
      assert.deepEqual(decide({ ...base, nonManagerActions: 'vote', inVote: true }), {
        allowed: true,
        reason: 'vote',
      });
    });
    it('"deny": bị từ chối kể cả inVote=true', () => {
      const r = decide({ ...base, nonManagerActions: 'deny', inVote: true });
      assert.equal(r.allowed, false);
      assert.equal(r.reason, 'deny');
    });
  });

  describe('D2 canSelfAssignManager — người mở tòa tự thành người phụ trách', () => {
    it('người mở tòa và chưa ai gán → true', () => {
      assert.equal(canSelfAssignManager({ accountId: 'builder', builderAccountId: 'builder' }), true);
    });
    it('đã có người phụ trách → false kể cả người mở tòa', () => {
      assert.equal(canSelfAssignManager({ accountId: 'builder', builderAccountId: 'builder', alreadyAssigned: true }), false);
    });
    it('accountId khác người mở tòa → false', () => {
      assert.equal(canSelfAssignManager({ accountId: 'b', builderAccountId: 'builder' }), false);
      assert.equal(canSelfAssignManager({ accountId: 'b', builderAccountId: 'builder', alreadyAssigned: false }), false);
    });
    it('thiếu builderAccountId → false', () => {
      assert.equal(canSelfAssignManager({ accountId: 'b' }), false);
    });
  });

  console.log('  ✓ manager-permission: managerDecision (sole/manager/owner/setting/vote/deny) + canSelfAssignManager');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('manager-permission');
if (isDirect) {
  runManagerPermissionTests();
}
