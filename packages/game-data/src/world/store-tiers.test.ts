/**
 * Test thuần hạng cửa hàng theo diện tích sàn (OpenSpec `open-world-building-types`, task 2.2b / D9 — THUẦN + PROVISIONAL).
 * Phạm vi: game-data. Chạy được độc lập (`tsx src/world/store-tiers.test.ts`) hoặc qua `run*` đăng ký trong test-runner (Lead nối sau).
 *
 * Phạm vi kiểm (ghi rõ):
 *   - Ranh giới ô sàn đúng bảng D9: 59→tiệm, 60→tiện lợi, 99→tiện lợi, 100→mini, 159→mini, 160→siêu thị,
 *     239→siêu thị, 240→đại siêu thị.
 *   - Tính đơn điệu: tăng ô sàn không bao giờ làm hạng giảm.
 *   - `maxTier` clamp: khóa hạng không vượt `maxTier`; hạng thấp hơn không bị nâng; không cho `maxTier` = hạng tự do.
 *   - Hệ số nhịp khách đúng bảng D9 và khớp `storeTierFromFloorTiles(...).trafficMultiplier`.
 *   - Dữ liệu `STORE_TIERS` sắp tăng dần `minFloor`, mút không chồng/không hở, `maxFloor: null` chỉ ở hạng cuối.
 *
 * GHÉP CHÚ: phần THUẦN — không đụng simulation/renderer/FIXTURE_SHOP.minTier (chờ refactor 1.2 + máy thật).
 */
import assert from 'node:assert/strict';
import { STORE_TIERS, storeTierFromFloorTiles, storeTierTrafficMultiplier } from './store-tiers';

export function runStoreTiersTests(): void {
  console.log('\n--- Hạng cửa hàng theo diện tích sàn (D9, task 2.2b: storeTierFromFloorTiles + trafficMultiplier) ---');

  // --- Đúng 5 hạng, thứ tự tăng dần minFloor, mút không chồng/không hở, maxFloor null chỉ ở hạng cuối ---
  assert.equal(STORE_TIERS.length, 5, 'bảng D9 có đúng 5 hạng');
  const knownIds = ['mart', 'convenience', 'mini_market', 'supermarket', 'hypermarket'];
  assert.deepEqual(STORE_TIERS.map((t) => t.id), knownIds, 'id 5 hạng theo thứ tự D9');
  assert.equal(STORE_TIERS[0].minFloor, 0, 'hạng đầu mở từ 0 ô');
  assert.equal(STORE_TIERS[STORE_TIERS.length - 1].maxFloor, null, 'hạng cuối (đại siêu thị) maxFloor=null');

  // Mút trên của mỗi hạng (trừ hạng cuối) = minFloor hạng kế - 1 → không chồng, không hở.
  for (let i = 0; i < STORE_TIERS.length - 1; i++) {
    assert.equal(STORE_TIERS[i].maxFloor, STORE_TIERS[i + 1].minFloor - 1,
      `${STORE_TIERS[i].id}.maxFloor = minFloor(${STORE_TIERS[i + 1].id}) - 1 (mút liền, không chồng/hở)`);
    assert.ok(STORE_TIERS[i + 1].minFloor > STORE_TIERS[i].minFloor, 'minFloor tăng dần');
  }
  // Traffic tăng dần theo hạng (tiện lợi hơn / diện tích lớn → khách đông hơn).
  for (let i = 1; i < STORE_TIERS.length; i++) {
    assert.ok(STORE_TIERS[i].trafficMultiplier > STORE_TIERS[i - 1].trafficMultiplier,
      `trafficMultiplier tăng dần theo hạng (${STORE_TIERS[i].id} > ${STORE_TIERS[i - 1].id})`);
  }
  // minTierShop là số provisional khác nhau, tăng dần cùng hạng (nội thất mở nhiều hơn khi hạng cao hơn).
  for (let i = 1; i < STORE_TIERS.length; i++) {
    assert.ok(Number.isInteger(STORE_TIERS[i].minTierShop) && STORE_TIERS[i].minTierShop > 0, 'minTierShop là số nguyên dương (provisional)');
    assert.ok(STORE_TIERS[i].minTierShop > STORE_TIERS[i - 1].minTierShop, 'minTierShop tăng dần theo hạng (provisional)');
  }

  // --- Ranh giới ô sàn đúng D9 ---
  const cases: Array<[number, string]> = [
    [0, 'mart'],
    [30, 'mart'],
    [59, 'mart'],   // <60 → tiệm tạp hóa
    [60, 'convenience'], // 60 → tiện lợi
    [80, 'convenience'],
    [99, 'convenience'], // 99 → tiện lợi (mút trên đóng)
    [100, 'mini_market'], // 100 → siêu thị mini
    [130, 'mini_market'],
    [159, 'mini_market'], // 159 → mini (mút trên đóng)
    [160, 'supermarket'], // 160 → siêu thị
    [200, 'supermarket'],
    [239, 'supermarket'], // 239 → siêu thị (mút trên đóng)
    [240, 'hypermarket'], // 240 → đại siêu thị
    [500, 'hypermarket'],
  ];
  for (const [tiles, id] of cases) {
    assert.equal(storeTierFromFloorTiles(tiles).id, id, `${tiles} ô sàn → hạng ${id}`);
  }
  // Ô sàn âm / không nguyên được xử lý an toàn như 0 (>=0, không lỗi).
  assert.equal(storeTierFromFloorTiles(-5).id, 'mart', 'ô sàn âm → coi như 0 → hạng tiệm tạp hóa');

  // --- Đơn điệu: tăng ô sàn không bao giờ làm hạng giảm ---
  let prevIdx = -1;
  for (let tiles = 0; tiles <= 400; tiles++) {
    const idx = STORE_TIERS.indexOf(storeTierFromFloorTiles(tiles));
    assert.ok(idx >= prevIdx, `hạng không giảm khi tăng ô sàn (${tiles} ô → index ${idx} >= ${prevIdx})`);
    prevIdx = idx;
  }

  // --- maxTier clamp ---
  // Cho maxTier là hạng thấp hơn hạng tính được → clamp xuống maxTier.
  assert.equal(storeTierFromFloorTiles(300, { maxTier: 'supermarket' }).id, 'supermarket',
    '240+ ô nhưng maxTier=siêu thị → clamp về siêu thị (không được đại siêu thị)');
  assert.equal(storeTierFromFloorTiles(5000, { maxTier: 'mart' }).id, 'mart',
    'maxTier=tiệm → luôn clamp về tiệm (khóa cứng hạng thấp nhất)');
  // Hạng tính được thấp hơn maxTier → không bị nâng lên maxTier.
  assert.equal(storeTierFromFloorTiles(80, { maxTier: 'supermarket' }).id, 'convenience',
    '80 ô, maxTier=siêu thị → vẫn là tiện lợi (không nâng)');
  assert.equal(storeTierFromFloorTiles(30, { maxTier: 'hypermarket' }).id, 'mart',
    '30 ô, maxTier=đại siêu thị → vẫn là tiệm (không nâng)');
  // maxTier ngay bằng hạng tính được → giữ nguyên.
  assert.equal(storeTierFromFloorTiles(160, { maxTier: 'supermarket' }).id, 'supermarket',
    '160 ô, maxTier=siêu thị → giữ siêu thị');
  // maxTier 'hypermarket' (hạng cao nhất) → không đổi hành vi (không có trần trên).
  assert.equal(storeTierFromFloorTiles(300, { maxTier: 'hypermarket' }).id, 'hypermarket',
    'maxTier=đại siêu thị (không trần) → giữ nguyên hạng tính được');

  // --- Hệ số nhịp khách đúng bảng D9 và khớp trafficMultiplier của hạng ---
  const multCases: Array<[number, number]> = [
    [0, 1.0],
    [59, 1.0],
    [60, 1.15],
    [99, 1.15],
    [100, 1.3],
    [159, 1.3],
    [160, 1.5],
    [239, 1.5],
    [240, 1.7],
    [1000, 1.7],
  ];
  for (const [tiles, mult] of multCases) {
    assert.equal(storeTierTrafficMultiplier(tiles), mult, `storeTierTrafficMultiplier(${tiles}) = ${mult}`);
    assert.equal(storeTierTrafficMultiplier(tiles), storeTierFromFloorTiles(tiles).trafficMultiplier,
      `storeTierTrafficMultiplier khớp trafficMultiplier của hạng (${tiles} ô)`);
  }

  console.log('  ✓ ranh giới D9 đúng (59/60/99/100/159/160/239/240); đơn điệu; maxTier clamp; hệ số nhịp khách khớp bảng');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/store-tiers.test.ts`.
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('store-tiers.test')) {
  runStoreTiersTests();
  console.log('\n🎉 HẠNG CỬA HÀNG THEO DIỆN TÍCH ĐẠT!\n');
}
