import assert from 'node:assert/strict';
import { RECLAMATION_WAVES, WAREHOUSE_BOUNDS } from '@game/data';
import type { GameTileMap } from '@game/shared';
import { resolveTileTarget } from './tile-target';

/** Bản đồ tối thiểu với một tòa xác định để test tra ô → tòa. */
function mapWith(buildings: NonNullable<GameTileMap['buildings']>): GameTileMap {
  return {
    originTileX: 0, originTileY: 0,
    width: 64, height: 64, tileWidth: 1, tileHeight: 1,
    layers: [], collisionLayer: [],
    buildings,
  } as GameTileMap;
}

// Tòa "snack" có sàn mở rộng về bắc (top) và sàn lấn ra ngoài (floorTiles).
const snack = {
  id: 'snack',
  open: true,
  bounds: { left: 10, right: 13, top: 20, bottom: 23 },
  top: 18,
  floorTiles: [{ x: 11, y: 17 }],
  doorTiles: [{ x: 11, y: 24 }],
  awning: { x0: 330, x1: 450 },
};

// ---- Empty/outside ---- 
assert.equal(resolveTileTarget(0, 0, { tileMap: mapWith([snack]) }), null, 'đường/vỉa hè trống → null');

// ---- Building by bounds ----
assert.deepEqual(
  resolveTileTarget(12, 21, { tileMap: mapWith([snack]) }),
  { kind: 'building', id: 'snack' },
  'ô trong bounds → tòa snack',
);

// ---- Building mở rộng bắc (`top`): ô trong dải mở rộng ngoài bounds.top gốc ---
assert.deepEqual(
  resolveTileTarget(12, 19, { tileMap: mapWith([snack]) }),
  { kind: 'building', id: 'snack' },
  'ô trong dải mở rộng bắc (top) → tòa snack',
);

// ---- Building floorTiles lấn ra ngoài bounds ----
assert.deepEqual(
  resolveTileTarget(11, 17, { tileMap: mapWith([snack]) }),
  { kind: 'building', id: 'snack' },
  'ô sàn mở rộng floorTiles ngoài bounds → tòa snack',
);

// ---- Kho gắn liền tiệm chính → 'main' (không cần tòa 'main' trong danh sách) ----
assert.deepEqual(
  resolveTileTarget(WAREHOUSE_BOUNDS.left, WAREHOUSE_BOUNDS.top, { tileMap: mapWith([snack]) }),
  { kind: 'building', id: 'main' },
  'ô kho gắn liền tiệm chính → main',
);

// ---- Ưu tiên lô đất: ô thuộc lô đợt đã mở mà chưa mua → parcel, kể cả khi không có tòa ----
{
  // Lấy một lô thật trong đợt w1 để dùng rect thật.
  const w1 = RECLAMATION_WAVES.find(w => w.id === 'w1')!;
  const parcel = w1.parcels[0];
  const { x0, x1, y0, y1 } = parcel.rect;
  const cx = Math.floor((x0 + x1) / 2);
  const cy = Math.floor((y0 + y1) / 2);
  assert.deepEqual(
    resolveTileTarget(cx, cy, { tileMap: mapWith([]), openedWaves: [w1.id], ownedParcelIds: [] }),
    { kind: 'parcel', id: parcel.id },
    'lô đợt đã mở chưa mua → parcel (đúng id thật)',
  );
  // Đợt chưa mở → không phải lô
  assert.equal(
    resolveTileTarget(cx, cy, { tileMap: mapWith([]), openedWaves: [], ownedParcelIds: [] }),
    null,
    'đợt chưa mở → không trả lô',
  );
  // Lô đã mua → không trả lô
  assert.equal(
    resolveTileTarget(cx, cy, { tileMap: mapWith([]), openedWaves: [w1.id], ownedParcelIds: [parcel.id] }),
    null,
    'lô đã mua → không trả lô',
  );
}

console.log('PASS tile-target: ô → (parcel | building | null)');
