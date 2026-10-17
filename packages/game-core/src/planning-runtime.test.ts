import assert from 'node:assert/strict';
import { createInitialOnlineWorld } from '@game/data';
import { WorldRuntime } from './world-runtime';
import { landCommandTargets, parsePlanningTargets, MAX_RESERVED_TILES } from './land-command-targets';

/** open-world-coop-land 1.1/1.2: giữ chỗ quy hoạch trong runtime, từ chối lệnh đụng giữ chỗ của người khác, snapshot mang giữ chỗ. */
export function runPlanningRuntimeTests(): void {
  console.log('\n--- Giữ chỗ quy hoạch đất trong runtime co-op (open-world-coop-land 1.1/1.2) ---');

  // Ánh xạ lệnh đất -> vùng
  assert.deepEqual(landCommandTargets({ type: 'reclaim_wave', waveId: 'w2' }), [{ kind: 'wave', waveId: 'w2' }]);
  assert.deepEqual(landCommandTargets({ type: 'buy_parcel', parcelId: 'w1-corner' }), [{ kind: 'parcels', parcelIds: ['w1-corner'] }]);
  assert.deepEqual(landCommandTargets({ type: 'open_building', buildingTypeId: 'cafe', parcelId: 'w1-east', originX: 52, originY: 3 }), [{ kind: 'parcels', parcelIds: ['w1-east'] }]);
  assert.equal(landCommandTargets({ type: 'restock', fixtureId: 'x' }).length, 0, 'Lệnh không phải đất không có vùng');
  assert.equal(landCommandTargets(null).length, 0);
  const batch = landCommandTargets({ type: 'layout_batch', actions: [
    { type: 'move', fixtureId: 'a', tileX: 1, tileY: 1, rotation: 0 },
    { type: 'expand_footprint', buildingId: 'main', tiles: [{ x: 5, y: 6 }] },
    { type: 'relocate_building', buildingId: 'xoi', placement: { parcelId: 'lot-west', originX: 2 } },
    { type: 'expand_footprint', buildingId: 'main', tiles: [{ x: 'bad', y: 1 }] },
  ] });
  assert.equal(batch.length, 2, 'layout_batch chỉ lấy thao tác đất hợp lệ');
  assert.equal(batch[0].kind, 'tiles');
  assert.equal(batch[1].kind, 'placement');

  // Dữ liệu giữ chỗ từ client không đáng tin
  assert.equal(parsePlanningTargets({ kind: 'tiles', tiles: [] }), null, 'Danh sách ô rỗng bị bỏ');
  assert.equal(parsePlanningTargets({ kind: 'tiles', tiles: Array.from({ length: MAX_RESERVED_TILES + 1 }, (_, i) => ({ x: i, y: 0 })) }), null, 'Quá nhiều ô bị bỏ');
  assert.equal(parsePlanningTargets({ kind: 'parcels', parcelIds: [1] }), null);
  assert.equal(parsePlanningTargets({ kind: 'nope' }), null);
  assert.equal(parsePlanningTargets('x'), null);
  assert.deepEqual(parsePlanningTargets({ kind: 'wave', waveId: 'w3', evil: true }), { kind: 'wave', waveId: 'w3' }, 'Chỉ giữ trường hợp lệ');

  // Runtime hai người
  const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'Chủ', photoUrl: null }, 'planning-world');
  seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString(), displayName: 'Bạn' });
  seeded.world.avatars[0].displayName = 'Chủ';
  const runtime = new WorldRuntime(seeded.world, seeded.business, { checkpointIntervalSeconds: 30 });
  const t0 = Date.now();
  assert.equal(runtime.reservePlanning('o1', { kind: 'parcels', parcelIds: ['w1-corner'] }, t0), false, 'Chưa có phiên thì không giữ chỗ được');
  runtime.registerSession('o1', t0);
  runtime.registerSession('m2', t0);

  assert.equal(runtime.reservePlanning('o1', { kind: 'parcels', parcelIds: ['w1-corner'] }, t0), true);
  assert.equal(runtime.getSnapshot().planning?.length, 1, 'Snapshot mang giữ chỗ');
  assert.equal(runtime.getSnapshot().planning?.[0].name, 'Chủ');

  const buyCorner = { type: 'buy_parcel', parcelId: 'w1-corner' };
  const conflict = runtime.checkPlanningConflict('m2', buyCorner, t0 + 1000);
  assert.equal(conflict.conflict, true, 'Người kia mua đúng lô đang được giữ bị từ chối');
  assert.equal(conflict.by?.name, 'Chủ', 'Kèm tên người giữ');
  assert.equal(runtime.checkPlanningConflict('o1', buyCorner, t0 + 1000).conflict, false, 'Chính người giữ không bị chặn');
  assert.equal(runtime.checkPlanningConflict('m2', { type: 'buy_parcel', parcelId: 'w1-east' }, t0 + 1000).conflict, false, 'Lô khác không bị chặn');
  assert.equal(runtime.checkPlanningConflict('m2', { type: 'restock', fixtureId: 'x' }, t0 + 1000).conflict, false, 'Lệnh không phải đất không bị chặn');

  // Giữ chỗ mới thay giữ chỗ cũ của cùng người
  runtime.reservePlanning('o1', { kind: 'wave', waveId: 'w2' }, t0 + 2000);
  assert.equal(runtime.checkPlanningConflict('m2', buyCorner, t0 + 2500).conflict, false, 'Giữ chỗ mới thay giữ chỗ cũ');
  assert.equal(runtime.checkPlanningConflict('m2', { type: 'reclaim_wave', waveId: 'w2' }, t0 + 2500).conflict, true);

  // Hết hạn sau 60 s, gia hạn kéo dài
  assert.equal(runtime.extendPlanning('o1', t0 + 50_000), true);
  assert.equal(runtime.checkPlanningConflict('m2', { type: 'reclaim_wave', waveId: 'w2' }, t0 + 100_000).conflict, true, 'Đã gia hạn nên còn hiệu lực');
  assert.equal(runtime.checkPlanningConflict('m2', { type: 'reclaim_wave', waveId: 'w2' }, t0 + 115_000).conflict, false, 'Quá 60 s không gia hạn thì hết hiệu lực');
  assert.equal(runtime.extendPlanning('o1', t0 + 115_000), false, 'Giữ chỗ đã hết hạn không gia hạn được');

  // Ngắt phiên thì xóa giữ chỗ
  runtime.reservePlanning('m2', { kind: 'parcels', parcelIds: ['w1-east'] }, Date.now());
  assert.equal(runtime.checkPlanningConflict('o1', { type: 'lease_parcel', parcelId: 'w1-east' }).conflict, true);
  runtime.unregisterSession('m2');
  assert.equal(runtime.checkPlanningConflict('o1', { type: 'lease_parcel', parcelId: 'w1-east' }).conflict, false, 'Ngắt kết nối thì giữ chỗ biến mất');
  assert.equal(runtime.getSnapshot().planning, undefined, 'Không còn giữ chỗ thì snapshot không mang trường planning');

  console.log('  ✓ Passed: giữ chỗ quy hoạch (ánh xạ lệnh, TTL, thay thế, xung đột có tên, ngắt phiên, snapshot)');
}
