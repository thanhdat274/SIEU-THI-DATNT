import assert from 'node:assert/strict';
import { planningColorFor, planningOverlays, planningOverlaySignature } from './planning-overlay';

console.log('--- Testing planning-overlay ---');
const now = 1_000_000;
const base = { accountId: 'm2', name: 'Bạn', expiresAt: now + 60_000 };

// Lô tồn tại -> một hộp đúng tọa độ px; nhãn có tên
{
  const [overlay] = planningOverlays([{ ...base, kind: 'parcels', targets: { kind: 'parcels', parcelIds: ['lot-center'] } }], 'o1', now);
  assert.ok(overlay, 'Giữ chỗ của người khác được vẽ');
  assert.equal(overlay.boxes.length, 1);
  assert.equal(overlay.boxes[0].x % 32, 0);
  assert.equal(overlay.label, 'Bạn đang quy hoạch');
  assert.ok(overlay.labelAt.y >= 0);
}

// Của chính mình, đã hết hạn, lô/đợt không tồn tại: không vẽ
assert.equal(planningOverlays([{ ...base, kind: 'parcels', targets: { kind: 'parcels', parcelIds: ['lot-center'] } }], 'm2', now).length, 0, 'Không vẽ giữ chỗ của chính mình');
assert.equal(planningOverlays([{ ...base, expiresAt: now - 1, kind: 'parcels', targets: { kind: 'parcels', parcelIds: ['lot-center'] } }], 'o1', now).length, 0, 'Hết hạn thì không vẽ');
assert.equal(planningOverlays([{ ...base, kind: 'parcels', targets: { kind: 'parcels', parcelIds: ['khong-co'] } }], 'o1', now).length, 0, 'Lô lạ bị bỏ');
assert.equal(planningOverlays([{ ...base, kind: 'wave', targets: { kind: 'wave', waveId: 'w99' } }], 'o1', now).length, 0, 'Đợt lạ bị bỏ');
assert.equal(planningOverlays(undefined, 'o1', now).length, 0);

// Đợt, ô, placement
{
  const wave = planningOverlays([{ ...base, kind: 'wave', targets: { kind: 'wave', waveId: 'w1' } }], 'o1', now)[0];
  assert.equal(wave.boxes[0].x, 36 * 32, 'Đợt W1 bắt đầu ở cột 36');
  const tiles = planningOverlays([{ ...base, kind: 'tiles', targets: { kind: 'tiles', tiles: [{ x: 5, y: 6 }, { x: 6, y: 6 }] } }], 'o1', now)[0];
  assert.equal(tiles.boxes.length, 2);
  assert.deepEqual(tiles.labelAt, { x: 5 * 32 + 2, y: 6 * 32 - 16 });
  const placed = planningOverlays([{ ...base, kind: 'placement', targets: { kind: 'placement', placement: { buildingId: 'xoi', parcelId: 'lot-west', originX: 0 } } }], 'o1', now)[0];
  assert.equal(placed.boxes.length, 1);
}

// Tên thiếu rơi về accountId; màu ổn định theo tài khoản; chữ ký bỏ qua gia hạn
{
  const noName = planningOverlays([{ accountId: 'zz', expiresAt: now + 1, kind: 'wave', targets: { kind: 'wave', waveId: 'w1' } }], 'o1', now)[0];
  assert.equal(noName.label, 'zz đang quy hoạch');
  assert.equal(planningColorFor('m2'), planningColorFor('m2'));
  const a = planningOverlays([{ ...base, kind: 'wave', targets: { kind: 'wave', waveId: 'w1' } }], 'o1', now);
  const b = planningOverlays([{ ...base, expiresAt: now + 99_000, kind: 'wave', targets: { kind: 'wave', waveId: 'w1' } }], 'o1', now);
  assert.equal(planningOverlaySignature(a), planningOverlaySignature(b), 'Gia hạn không làm đổi chữ ký (không vẽ lại)');
}
console.log('PASS planning-overlay');
