import assert from 'node:assert/strict';
import {
  MAX_CONCURRENT_SPECIAL_REQUESTS,
  MAX_SPECIAL_REQUESTS_PER_DAY,
  SPECIAL_REQUEST_MAP,
  SPECIAL_REQUEST_UNLOCK_LEVEL,
  SPECIAL_REQUESTS,
  validateSpecialRequests,
} from './special-requests';

/**
 * Yêu cầu đặc biệt khách VIP — kiểm chứng dữ liệu catalog (PHẦN THUẦN). Export `runSpecialRequestDataTests`
 * để LEAD nối vào test-runner. Chạy độc lập: `tsx src/world/special-requests.test.ts`.
 */
export function runSpecialRequestDataTests(): void {
  assert.deepEqual(validateSpecialRequests(), [], 'catalog yêu cầu hợp lệ (không lỗi)');
  assert.ok(SPECIAL_REQUESTS.length >= 3, 'có ít nhất vài template');
  assert.ok(MAX_CONCURRENT_SPECIAL_REQUESTS >= 1, 'trần đồng thời hợp lệ');
  assert.ok(MAX_SPECIAL_REQUESTS_PER_DAY >= MAX_CONCURRENT_SPECIAL_REQUESTS, 'trần/ngày ≥ trần đồng thời');
  assert.ok(SPECIAL_REQUEST_UNLOCK_LEVEL >= 1, 'ngưỡng mở khóa hợp lệ');

  // Mọi template: có it nhất 1 món với id có chữ thường latin (không rỗng), thời hạn ≥1 phút, thưởng tối thiểu dương.
  for (const def of SPECIAL_REQUESTS) {
    assert.equal(SPECIAL_REQUEST_MAP[def.id].id, def.id, `map chứa '${def.id}'`);
    assert.ok(def.requiredItems.length >= 1, `'${def.id}' có món`);
    assert.ok(def.timeWindowMinutes >= 1, `'${def.id}' thời hạn ≥1 phút`);
    assert.ok(def.rewardMoney > 0, `'${def.id}' thưởng tiền dương`);
    assert.ok(def.rewardReputation >= 0, `'${def.id}' thưởng uy tín không âm`);
    for (const item of def.requiredItems) {
      assert.ok(item.productId.length > 0 && item.quantity >= 1, `'${def.id}' món hợp lệ`);
    }
  }
}
