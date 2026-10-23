import assert from 'node:assert/strict';
import { decideLandCommand } from './land-policy';

/** open-world-coop-land 2.1/2.2: bảng quyền D2 + phiếu D3 áp lên lệnh thật. */
export function runLandPolicyTests(): void {
  console.log('\n--- Quyền và phiếu lệnh đất (open-world-coop-land 2.1/2.2) ---');
  const rich = 100_000_000;
  const relocate = { type: 'relocate_building', buildingId: 'xoi', placement: { parcelId: 'lot-west', originX: 1 } };
  const reclaim = { type: 'reclaim_wave', waveId: 'w1' };
  const buyParcel = { type: 'buy_parcel', parcelId: 'w1-corner' };

  // Lệnh không phải đất luôn được phép
  assert.deepEqual(decideLandCommand({ type: 'restock', fixtureId: 'x' }, 'member', { memberLandPermissions: 'none' }, rich, true), { action: 'allow' });

  // Thành viên mặc định ('vote'): mua lô ổn, dời tòa/khai hoang cần phiếu khi người kia online
  assert.equal(decideLandCommand(buyParcel, 'member', undefined, rich, true).action, 'allow', 'Mua lô nhỏ so với quỹ: không cần phiếu');
  assert.equal(decideLandCommand(relocate, 'member', undefined, rich, true).action, 'vote', 'Dời tòa cần phiếu');
  assert.equal(decideLandCommand(reclaim, 'member', undefined, rich, true).action, 'vote', 'Khai hoang cần phiếu');
  assert.equal(decideLandCommand(relocate, 'member', undefined, rich, false).action, 'allow', 'Không ai để bỏ phiếu thì chạy luôn');

  // 'none' cấm hẳn thành viên; chủ không bị ảnh hưởng bởi setting của thành viên
  assert.deepEqual(decideLandCommand(buyParcel, 'member', { memberLandPermissions: 'none' }, rich, true), { action: 'forbid', command: 'buy_parcel' });
  assert.equal(decideLandCommand(buyParcel, 'owner', { memberLandPermissions: 'none' }, rich, true).action, 'allow');

  // 'full' vẫn cần phiếu cho dời tòa/khai hoang (D3 áp cho thành viên bất kể full/vote)
  assert.equal(decideLandCommand(reclaim, 'member', { memberLandPermissions: 'full' }, rich, true).action, 'vote');

  // Chủ: dời tòa/khai hoang cũng cần phiếu khi bạn online, trừ khi bật ownerSkipsVote
  assert.equal(decideLandCommand(reclaim, 'owner', undefined, rich, true).action, 'vote');
  assert.equal(decideLandCommand(reclaim, 'owner', { ownerSkipsVote: true }, rich, true).action, 'allow');
  assert.equal(decideLandCommand(reclaim, 'member', { ownerSkipsVote: true }, rich, true).action, 'vote', 'ownerSkipsVote không áp cho thành viên');

  // Khoản chi lớn (> 30% quỹ) cần phiếu dù là lệnh mua thường
  assert.equal(decideLandCommand(buyParcel, 'member', undefined, 1_000_000, true).action, 'vote', 'Giá lô > 30% quỹ cần phiếu');
  assert.equal(decideLandCommand(buyParcel, 'owner', { ownerSkipsVote: true }, 1_000_000, true).action, 'allow', 'Chủ bỏ qua phiếu cho chính mình');

  // layout_batch lấy mức chặt nhất
  const batch = { type: 'layout_batch', actions: [{ type: 'move', fixtureId: 'a', tileX: 1, tileY: 1, rotation: 0 }, { type: 'expand_footprint', buildingId: 'main', tiles: [{ x: 1, y: 1 }] }, relocate] };
  assert.equal(decideLandCommand(batch, 'member', undefined, rich, true).action, 'vote');
  assert.deepEqual(decideLandCommand(batch, 'member', { memberLandPermissions: 'none' }, rich, true), { action: 'forbid', command: 'expand_footprint' });
  assert.equal(decideLandCommand({ type: 'layout_batch', actions: [{ type: 'move', fixtureId: 'a', tileX: 1, tileY: 1, rotation: 0 }] }, 'member', { memberLandPermissions: 'none' }, rich, true).action, 'allow', 'Chỉ dời đồ trong tiệm: không phải lệnh đất');
  console.log('  ✓ Passed: quyền + phiếu theo D2/D3');
}
