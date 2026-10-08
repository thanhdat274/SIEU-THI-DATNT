/**
 * Test thuần dữ liệu vùng chơi mở rộng (OpenSpec `open-world-land-reclamation`, task 2.1).
 * Phạm vi: game-data. Chạy độc lập (`tsx src/world/play-area.test.ts`) hoặc qua run của Lead trong test-runner.
 *
 * Đây CHỈ kiểm phần DỮ LIỆU MAP (kích thước hộp hợp, origin giữ 0/−6, mảng layers đúng size, boundary collision).
 * KHÔNG nối simulation/renderer/pathfinding ở vòng này (chờ máy thật) — xem ghi chú trong map.ts / tasks.md 2.1.
 */
import assert from 'node:assert/strict';
import { generateStarterTileMap, generateTileMapForWaves, MAP_WIDTH, MAP_HEIGHT, MAP_ORIGIN_Y } from '../map';
import { PLAY_REGION, playRegionForWaves, rectWidth, rectHeight } from './world-grid';

export function runPlayAreaTests(): void {
  console.log('\n--- Vùng chơi mở rộng (D2, task 2.1: generateTileMapForWaves + playRegionForWaves) ---');

  // --- playRegionForWaves: hộp hợp nhỏ nhất của các đợt đã mở ---
  assert.deepEqual(playRegionForWaves(['w0']), PLAY_REGION, "playRegionForWaves(['w0']) bằng PLAY_REGION (giữ golden)");
  assert.deepEqual(playRegionForWaves([]), PLAY_REGION, 'danh sách rỗng → PLAY_REGION mặc định an toàn');

  const p01 = playRegionForWaves(['w0', 'w1']);
  // hộp hợp: x0 = min(w0.x0=0, w1.x0=36) = 0; x1 = max(w0.x1=35, w1.x1=60) = 60 → width 61
  // y0 = min(-6, 3) = -6; y1 = max(15, 15) = 15 → height 22
  assert.equal(p01.x0, 0, 'hộp hợp x0 = 0 (giữ cạnh trái W0)');
  assert.equal(p01.x1, 60, 'hộp hợp x1 = 60 (cạnh phải W1)');
  assert.equal(rectWidth(p01), 61, "hộp hợp ['w0','w1'] width = 61 (x0=0 → x1=60)");
  assert.equal(rectHeight(p01), 22, 'hộp hợp height = 22 (y0=-6 → y1=15)');

  const p01234 = playRegionForWaves(['w0', 'w1', 'w2', 'w3', 'w4']);
  // x0 = 0, x1 = max(35, 60, 35, 76, 76) = 76; y0 = -6, y1 = max(15,15,24,15,24) = 24
  assert.equal(rectWidth(p01234), 77, 'tất cả đợt → width 77 (x0=0..x1=76)');
  assert.equal(rectHeight(p01234), 31, 'tất cả đợt → height 31 (y0=-6..y1=24)');

  // --- generateTileMapForWaves(['w0']): cùng kích thước/origin như bản đồ khởi tạo (không đổi golden) ---
  const g0 = generateTileMapForWaves(['w0']);
  assert.equal(g0.width, MAP_WIDTH, "['w0'] width = MAP_WIDTH (36)");
  assert.equal(g0.height, MAP_HEIGHT, "['w0'] height = MAP_HEIGHT (22)");
  assert.equal(g0.originTileX, PLAY_REGION.x0, "['w0'] originTileX = 0");
  assert.equal(g0.originTileY, MAP_ORIGIN_Y, "['w0'] originTileY = -6");

  const starter = generateStarterTileMap();
  assert.equal(g0.width, starter.width, "['w0'] width bằng generateStarterTileMap");
  assert.equal(g0.height, starter.height, "['w0'] height bằng generateStarterTileMap");
  assert.equal(g0.originTileX, starter.originTileX, "['w0'] originTileX bằng generateStarterTileMap");
  assert.equal(g0.originTileY, starter.originTileY, "['w0'] originTileY bằng generateStarterTileMap");

  // --- Kích thước mảng khớp width*height ---
  assert.equal(g0.layers.length, 2, 'bản đồ có đủ 2 layer (ground, walls)');
  for (const layer of g0.layers) {
    assert.equal(layer.data.length, g0.width * g0.height, `layer ${layer.name} có ${g0.width * g0.height} ô`);
  }
  assert.equal(g0.collisionLayer.length, g0.width * g0.height, 'collisionLayer khớp width*height');

  // --- Boundary collision ở mép ngoài (['w0']) ---
  const ox = g0.originTileX ?? 0;
  const oy = g0.originTileY ?? 0;
  const idxOf = (x: number, y: number) => (y - oy) * g0.width + (x - ox);
  const topLeft = idxOf(ox, oy);
  const topRight = idxOf(ox + g0.width - 1, oy);
  const bottomLeft = idxOf(ox, oy + g0.height - 1);
  const bottomRight = idxOf(ox + g0.width - 1, oy + g0.height - 1);
  assert.equal(g0.collisionLayer[topLeft], true, 'góc trái-trên chặn');
  assert.equal(g0.collisionLayer[topRight], true, 'góc phải-trên chặn');
  assert.equal(g0.collisionLayer[bottomLeft], true, 'góc trái-dưới chặn');
  assert.equal(g0.collisionLayer[bottomRight], true, 'góc phải-dưới chặn');
  // Một ô trong (không ở mép) của bản đồ w0: vùng đã mở → không phải boundary (walkable, chưa nối chi tiết tòa).
  const innerIdx = idxOf(ox + 10, oy + 10);
  assert.equal(g0.collisionLayer[innerIdx], false, 'ô trong (không mép) của w0 không bị chặn bởi boundary');

  // --- generateTileMapForWaves(['w0','w1']): mở rộng đúng + origin giữ 0/−6 + mảng khớp ---
  const g01 = generateTileMapForWaves(['w0', 'w1']);
  assert.equal(g01.width, 61, "['w0','w1'] width = 61");
  assert.equal(g01.height, 22, "['w0','w1'] height = 22");
  assert.equal(g01.originTileX, 0, "['w0','w1'] originTileX = 0");
  assert.equal(g01.originTileY, -6, "['w0','w1'] originTileY = -6");
  assert.equal(g01.layers[0].data.length, 61 * 22, "['w0','w1'] layer ground có 61*22 ô");
  assert.equal(g01.layers[1].data.length, 61 * 22, "['w0','w1'] layer walls có 61*22 ô");
  assert.equal(g01.collisionLayer.length, 61 * 22, "['w0','w1'] collisionLayer có 61*22 ô");
  // Boundary mép phải của hộp mở rộng (x=60) chặn.
  const idxRightEdge = (61 * 22 - 1); // ô x=60, y=15 (bottom-right của ['w0','w1'] hộp)
  assert.equal(g01.collisionLayer[idxRightEdge], true, 'mép phải hộp mở rộng (x=60) chặn');
  // Ô thuộc vùng W1 đã mở (không phải mép) → không bị chặn boundary; ví dụ x=45,y=10 (giữa lô w1-corner / vùng W1); origin giữ 0/−6.
  const idxW1Inner = (10 - (-6)) * g01.width + (45 - 0);
  assert.equal(g01.collisionLayer[idxW1Inner], false, 'ô trong vùng W1 đã mở (x=45,y=10) không bị boundary chặn');

  // --- generateStarterTileMap(…, openedWaves) (2.1): ['w0'] không đổi, đợt mới mở rộng bản đồ thật ---
  const sameAsDefault = generateStarterTileMap(undefined, [], undefined, ['w0']);
  assert.deepEqual(sameAsDefault.layers, starter.layers, "['w0'] giữ nguyên layer như mặc định");
  assert.deepEqual(sameAsDefault.collisionLayer, starter.collisionLayer, "['w0'] giữ nguyên va chạm như mặc định");
  const s01 = generateStarterTileMap(undefined, [], undefined, ['w0', 'w1']);
  assert.equal(s01.width, 61, "starter ['w0','w1'] width 61");
  const sIdx = (m: typeof s01, x: number, y: number) => (y - (m.originTileY ?? 0)) * m.width + (x - (m.originTileX ?? 0));
  for (let y = -6; y <= 15; y++) for (let x = 0; x <= 35; x++) {
    const a1 = starter.layers[1].data[sIdx(starter, x, y)], b1 = s01.layers[1].data[sIdx(s01, x, y)];
    assert.equal(b1, a1, `tường W0 giữ nguyên tại (${x},${y})`);
  }
  assert.equal(s01.collisionLayer[sIdx(s01, 45, 10)], false, 'đất W1 (45,10) đi được');
  assert.equal(s01.layers[0].data[sIdx(s01, 45, 10)], 3, 'đất W1 trong lô w1-corner là nền lô (3)');
  assert.equal(s01.collisionLayer[sIdx(s01, 45, 0)], true, 'ô trong hộp nhưng ngoài đợt đã mở (45,0) chặn');
  assert.equal(s01.collisionLayer[sIdx(s01, 35, 12)], false, 'lối W0→W1 (35,12) thông (không còn viền chặn giữa)');
  const s02 = generateStarterTileMap(undefined, [], undefined, ['w0', 'w2']);
  assert.equal(s02.height, 31, "starter ['w0','w2'] height 31");
  assert.equal(s02.collisionLayer[sIdx(s02, 10, 20)], false, 'đất W2 (10,20) đi được');
  console.log("  ✓ playRegionForWaves hộp hợp đúng; ['w0'] giữ 36×22 & origin 0/−6; mảng khớp size; boundary mép đúng");
}

declare const process: any;
// Chạy độc lập: `tsx src/world/play-area.test.ts`
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('play-area.test')) {
  runPlayAreaTests();
  console.log('\n🎉 VÙNG CHƠI MỞ RỘNG ĐẠT!\n');
}
