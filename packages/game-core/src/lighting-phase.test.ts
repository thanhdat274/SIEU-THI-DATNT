import assert from 'node:assert/strict';
import { getLightingState } from './lighting-phase';

export function runLightingPhaseTests(): void {
  const noon = getLightingState(12);
  const midnight = getLightingState(0);
  assert.equal(noon.sun, 1);
  assert.equal(noon.artificial, 0, 'Trưa không cần đèn nhân tạo');
  assert.equal(midnight.sun, 0);
  assert.equal(midnight.artificial, 1, 'Đêm đèn nhân tạo là nguồn sáng chính');
  const brightness = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  assert.ok(brightness(midnight.outdoor) < brightness(midnight.indoor), 'Đêm trong nhà sáng hơn ngoài trời');
  // Chuyển pha liên tục: mỗi 15 phút không nhảy quá nhiều.
  let prev = getLightingState(0);
  for (let m = 15; m <= 24 * 60; m += 15) {
    const cur = getLightingState(Math.floor(m / 60) % 24, m % 60);
    assert.ok(Math.abs(cur.sun - prev.sun) < 0.25 && Math.abs(cur.artificial - prev.artificial) < 0.3, `Không nhảy đột ngột lúc ${m / 60}h`);
    assert.ok(Math.abs(brightness(cur.outdoor) - brightness(prev.outdoor)) < 110, `Màu ngoài trời mượt lúc ${m / 60}h`);
    prev = cur;
  }
  const dusk = getLightingState(18, 30);
  assert.ok(dusk.artificial > getLightingState(16).artificial && dusk.sun < getLightingState(16).sun, 'Chiều tối: đèn tăng, nắng giảm');
  assert.ok(getLightingState(17, 30).shadowLength > noon.shadowLength, 'Bóng chiều dài hơn trưa');
  assert.ok(getLightingState(8).shadowLean < 0 && getLightingState(17).shadowLean > 0, 'Bóng đổi hướng sáng/chiều');
  assert.deepEqual(getLightingState(24), getLightingState(0), 'Giờ 24 nối liền giờ 0');
  console.log('  ✓ Passed: Ánh sáng theo giờ chuyển pha mượt (sáng, trưa, chiều, hoàng hôn, đêm)');
}
