import assert from 'node:assert/strict';
import { getLightingState } from './lighting-phase';
import { TREE_SHADOW_MAX_LENGTH, computeTreeShadow, treeShadowNeedsRedraw } from './tree-shadow';

export function runTreeShadowTests(): void {
  const tree = { height: 2.4, crownRadius: 1.1 };
  const at = (h: number, m = 0, day = 1, rain = 0) => computeTreeShadow(tree, getLightingState(h, m, day), rain);
  const along = (s: ReturnType<typeof at>) => s.radiusAlong - tree.crownRadius;
  const noon = at(12), early = at(6, 30), morning = at(8), afternoon = at(16, 30);
  assert.ok(noon.visible && early.visible, 'Ban ngày có bóng');
  assert.ok(along(early) > along(noon), 'Bóng gần lúc mọc dài hơn lúc trưa');
  assert.ok(along(early) * 2 <= TREE_SHADOW_MAX_LENGTH + 1e-9 && along(at(6, 5)) * 2 <= TREE_SHADOW_MAX_LENGTH + 1e-9, 'Bóng không vượt độ dài tối đa');
  assert.ok(morning.offsetX < 0 && afternoon.offsetX > 0, 'Sáng ngả tây, chiều ngả đông');
  assert.ok(computeTreeShadow(tree, getLightingState(12, 0, 34)).offsetY > 0 && computeTreeShadow(tree, getLightingState(12, 0, 94)).offsetY < 0, 'Bóng trưa đổi hướng nam/bắc theo mùa');
  assert.equal(at(0).visible, false, 'Không bóng nắng ban đêm');
  assert.equal(at(22).visible, false);
  assert.ok(at(12, 0, 1, 1).alpha < at(12).alpha * 0.2, 'Mưa lớn làm bóng gần biến mất');
  const light = getLightingState(10, 0, 5);
  const snap = (l: typeof light, rain = 0) => ({ azimuth: l.sunAzimuth, elevation: l.sunElevation, sun: l.sun, rain });
  assert.equal(treeShadowNeedsRedraw(null, snap(light)), true, 'Lần đầu phải vẽ');
  assert.equal(treeShadowNeedsRedraw(snap(light), snap(light)), false, 'Giờ không đổi thì không vẽ lại');
  assert.equal(treeShadowNeedsRedraw(snap(light), snap(getLightingState(10, 1, 5))), false, 'Đổi 1 phút nhỏ hơn 1° thì không vẽ lại');
  assert.equal(treeShadowNeedsRedraw(snap(light), snap(getLightingState(11, 0, 5))), true, 'Đổi 1 giờ phải vẽ lại');
  assert.equal(treeShadowNeedsRedraw(snap(light), snap(light, 0.5)), true, 'Mưa đổi đáng kể phải vẽ lại');
  console.log('  ✓ Passed: Bóng cây theo hướng nắng, mưa và ngưỡng vẽ lại');
}
