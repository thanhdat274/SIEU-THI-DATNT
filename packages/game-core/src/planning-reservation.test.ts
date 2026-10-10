import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_PLANNING_TTL,
  setReservation,
  extendReservation,
  releaseReservation,
  pruneExpired,
  activeReservationFor,
  reservationConflictsWith,
  type PlanningReservation,
  type PlanningTargets,
} from './planning-reservation';

/**
 * Giữ chỗ quy hoạch (OpenSpec `open-world-coop-land`, design D1) — phần THUẦN.
 * Test dùng `now` giả (debug clock) để kiểm TTL: đặt expiresAt = now + TTL rồi gọi với now lớn hơn.
 * Chạy độc lập bằng `tsx src/planning-reservation.test.ts`; `runPlanningReservationTests()`
 * có thể nối vào `test-runner.ts` (Lead nối sau).
 */

const T = 1_000_000; // mốc thời gian gốc giả

const tilesTarget = (tiles: Array<{ x: number; y: number }>): PlanningTargets => ({ kind: 'tiles', tiles });
const reservation = (accountId: string, targets: PlanningTargets, expiresAt: number, name?: string): PlanningReservation => ({
  accountId,
  kind: targets.kind,
  targets,
  expiresAt,
  ...(name != null ? { name } : {}),
});

export function runPlanningReservationTests(): void {
  describe('setReservation — 1 giữ chỗ mỗi người (thay thế giữ chỗ cũ)', () => {
    it('đặt mới: thêm đúng accountId + expiresAt = now + TTL', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }]), T), DEFAULT_PLANNING_TTL, T);
      assert.equal(list.length, 1);
      assert.equal(list[0].accountId, 'A');
      assert.equal(list[0].expiresAt, T + DEFAULT_PLANNING_TTL);
      assert.equal(list[0].targets.kind, 'tiles');
    });
    it('cùng người đặt lại → thay thế, không nhân đôi (vẫn đúng 1)', () => {
      const one = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }]), T), DEFAULT_PLANNING_TTL, T);
      const two = setReservation(one, reservation('A', tilesTarget([{ x: 5, y: 5 }]), T), DEFAULT_PLANNING_TTL, T + 1);
      assert.equal(two.length, 1);
      assert.deepEqual(two[0].targets, { kind: 'tiles', tiles: [{ x: 5, y: 5 }] });
      assert.equal(two[0].expiresAt, T + 1 + DEFAULT_PLANNING_TTL);
    });
    it('không làm đổi danh sách gốc (immutable)', () => {
      const original: PlanningReservation[] = [];
      setReservation(original, reservation('A', tilesTarget([{ x: 1, y: 1 }]), T), DEFAULT_PLANNING_TTL, T);
      assert.equal(original.length, 0, 'hàm trả bản sao, không mutate mảng gốc');
    });
  });

  describe('clamp giới hạn số ô theo ngân sách còn lại (maxTiles)', () => {
    it('tiles quá hạn mức → cắt về đúng maxTiles ô đầu', () => {
      const targets = tilesTarget([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }]);
      const list = setReservation([], reservation('A', targets, T), DEFAULT_PLANNING_TTL, T, 3);
      const t = list[0].targets;
      assert.equal(t.kind, 'tiles');
      if (t.kind === 'tiles') {
        assert.equal(t.tiles.length, 3);
        assert.deepEqual(t.tiles, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
      }
    });
    it('đủ ngân sách → giữ nguyên toàn bộ ô', () => {
      const targets = tilesTarget([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      const list = setReservation([], reservation('A', targets, T), DEFAULT_PLANNING_TTL, T, 10);
      const t = list[0].targets;
      if (t.kind === 'tiles') assert.equal(t.tiles.length, 2);
    });
    it('không truyền maxTiles → không clamp (giữ lô/đợt/placement không bị cắt cả khi maxTiles có)', () => {
      const parcels = setReservation([], reservation('A', { kind: 'parcels', parcelIds: ['p1', 'p2', 'p3'] }, T), DEFAULT_PLANNING_TTL, T, 1);
      const p = parcels[0].targets;
      if (p.kind === 'parcels') assert.equal(p.parcelIds.length, 3, 'chỉ clamp tiles, không clamp parcels');
      const tiles = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }, { x: 1, y: 0 }]), T), DEFAULT_PLANNING_TTL, T);
      const t2 = tiles[0].targets;
      if (t2.kind === 'tiles') assert.equal(t2.tiles.length, 2, 'không clamp khi không truyền maxTiles');
    });
  });

  describe('extendReservation — gia hạn TTL', () => {
    it('đặt lại expiresAt = now + TTL', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }]), T), DEFAULT_PLANNING_TTL, T);
      const extended = extendReservation(list, 'A', T + 1000, 60_000);
      assert.equal(extended[0].expiresAt, T + 1000 + 60_000);
      assert.equal(extended.length, list.length);
    });
    it('không có giữ chỗ → trả list nguyên (không đổi)', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }]), T), DEFAULT_PLANNING_TTL, T);
      const extended = extendReservation(list, 'KHONG-CO', T + 1000);
      assert.deepEqual(extended, list);
    });
  });

  describe('pruneExpired — hết TTL bị xoá', () => {
    it('giữ chỗ có expiresAt <= now bị prune; còn hiệu lực thì giữ', () => {
      const list = [
        reservation('A', tilesTarget([{ x: 0, y: 0 }]), T + 1001), // còn hiệu lực (expiresAt > now)
        reservation('B', tilesTarget([{ x: 9, y: 9 }]), T + 1000), // hết hạn đúng mốc now (expiresAt <= now)
        reservation('C', tilesTarget([{ x: 8, y: 8 }]), T - 5000), // hết hạn hẳn
      ];
      const pruned = pruneExpired(list, T + 1000);
      assert.equal(pruned.length, 1);
      assert.equal(pruned[0].accountId, 'A');
    });
    it('hết 60s: giữ chỗ hết hạn và không giữ lại được bằng reserve/gia hạn cũ', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 0, y: 0 }]), T), 60_000, T);
      assert.equal(activeReservationFor(list, 'A', T + 59_000)?.accountId, 'A', 'chưa hết hạn còn giữ');
      assert.equal(activeReservationFor(list, 'A', T + 60_000), null, 'đúng 60s hết hạn');
      assert.equal(pruneExpired(list, T + 60_000).length, 0, 'pruned');
    });
  });

  describe('releaseReservation — xoá giữ chỗ', () => {
    it('xoá đúng accountId, giữ người khác', () => {
      const list = [
        reservation('A', tilesTarget([{ x: 0, y: 0 }]), T + 1000),
        reservation('B', tilesTarget([{ x: 1, y: 1 }]), T + 1000),
      ];
      const after = releaseReservation(list, 'A');
      assert.equal(after.length, 1);
      assert.equal(after[0].accountId, 'B');
    });
    it('release người không có → trả list nguyên', () => {
      const list = [reservation('A', tilesTarget([{ x: 0, y: 0 }]), T + 1000)];
      assert.deepEqual(releaseReservation(list, 'KHONG-CO'), list);
    });
  });

  describe('reservationConflictsWith — xung đột với NGƯỜI KHÁC', () => {
    it('A giữ ô; B gửi expand trùng ô → reserved_by_other kèm tên A', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 6, y: 6 }, { x: 7, y: 6 }]), T, 'An'), DEFAULT_PLANNING_TTL, T);
      const r = reservationConflictsWith(list, 'B', tilesTarget([{ x: 7, y: 6 }]), T);
      assert.equal(r.conflict, true);
      assert.deepEqual(r.by, { accountId: 'A', name: 'An' });
    });
    it('không đụng → no conflict', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 6, y: 6 }]), T), DEFAULT_PLANNING_TTL, T);
      const r = reservationConflictsWith(list, 'B', tilesTarget([{ x: 99, y: 99 }]), T);
      assert.deepEqual(r, { conflict: false });
    });
    it('cùng người (exclude trùng accountId) → không coi là conflict', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 6, y: 6 }]), T), DEFAULT_PLANNING_TTL, T);
      const r = reservationConflictsWith(list, 'A', tilesTarget([{ x: 6, y: 6 }]), T);
      assert.equal(r.conflict, false, 'tự giữ chỗ của mình không là xung đột');
    });
    it('lô trùng (parcels) → conflict; lô khác → không', () => {
      const list = setReservation([], reservation('A', { kind: 'parcels', parcelIds: ['w1-corner'] }, T, 'An'), DEFAULT_PLANNING_TTL, T);
      assert.equal(reservationConflictsWith(list, 'B', { kind: 'parcels', parcelIds: ['w1-corner'] }, T).conflict, true);
      assert.equal(reservationConflictsWith(list, 'B', { kind: 'parcels', parcelIds: ['w1-west'] }, T).conflict, false);
    });
    it('đợt trùng (wave) → conflict; khác đợt → không', () => {
      const list = setReservation([], reservation('A', { kind: 'wave', waveId: 'w2' }, T), DEFAULT_PLANNING_TTL, T);
      assert.equal(reservationConflictsWith(list, 'B', { kind: 'wave', waveId: 'w2' }, T).conflict, true);
      assert.equal(reservationConflictsWith(list, 'B', { kind: 'wave', waveId: 'w3' }, T).conflict, false);
    });
    it('placement trùng lô với giữ lô → conflict', () => {
      const list = setReservation([], reservation('A', { kind: 'parcels', parcelIds: ['w1-corner'] }, T, 'An'), DEFAULT_PLANNING_TTL, T);
      const r = reservationConflictsWith(list, 'B', { kind: 'placement', placement: { buildingId: 'drink', parcelId: 'w1-corner', originX: 42 } }, T);
      assert.equal(r.conflict, true);
    });
    it('giữ chỗ đã hết hạn → không conflict dù trùng ô', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 6, y: 6 }]), T), 60_000, T);
      const r = reservationConflictsWith(list, 'B', tilesTarget([{ x: 6, y: 6 }]), T + 60_000);
      assert.equal(r.conflict, false, 'hết hạn 60s → B chọn lại được ô đó');
    });
  });

  describe('danh sách rỗng / chơi một mình — không bao giờ conflict', () => {
    it('danh sách rỗng → mọi check đều no conflict', () => {
      assert.equal(reservationConflictsWith([], 'A', tilesTarget([{ x: 0, y: 0 }]), T).conflict, false);
      assert.equal(reservationConflictsWith([], 'B', { kind: 'parcels', parcelIds: ['w1-corner'] }, T).conflict, false);
      assert.equal(reservationConflictsWith([], 'C', { kind: 'wave', waveId: 'w1' }, T).conflict, false);
    });
    it('chơi một mình = tự exclude mình; giữ chỗ của mình không thể tự xung đột', () => {
      const list = setReservation([], reservation('A', tilesTarget([{ x: 3, y: 3 }]), T), DEFAULT_PLANNING_TTL, T);
      assert.equal(reservationConflictsWith(list, 'A', tilesTarget([{ x: 3, y: 3 }]), T).conflict, false);
      // A cũng không thể xung đột với chính giữ chỗ của mình theo loại khác
      assert.equal(reservationConflictsWith(list, 'A', { kind: 'parcels', parcelIds: ['a'] }, T).conflict, false);
    });
  });

  console.log('  ✓ giữ chỗ quy hoạch: reserve/replace, clamp ô, gia hạn, hết hạn, release, xung đột người khác');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('planning-reservation.test');
if (isDirect) runPlanningReservationTests();
