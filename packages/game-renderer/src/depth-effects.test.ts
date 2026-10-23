import assert from 'node:assert/strict';
import { buildingShadowPolygon, buildingShadowShape, BUILDING_SHADOW_MAX } from './depth-effects';
import { setWeatherFxSettings, depthFxActive, getWeatherFxSettings } from './weather-settings';
import { puddleWaveRings, PUDDLE_WAVE } from './road-surface';

console.log('--- Testing depth-effects ---');
const r = { x0: 0, y0: 0, x1: 100, y1: 50 };

// Không dịch thì không có bóng
assert.deepEqual(buildingShadowPolygon(r, 0, 0), []);

// Bóng ngả đông-nam: 6 đỉnh, mọi đỉnh nằm ngoài hoặc trên mép hình chữ nhật (không tối sàn trong nhà)
const p = buildingShadowPolygon(r, 10, 20);
assert.equal(p.length, 12);
for (let i = 0; i < p.length; i += 2) {
  const inside = p[i] > r.x0 && p[i] < r.x1 && p[i + 1] > r.y0 && p[i + 1] < r.y1;
  assert.ok(!inside, `đỉnh (${p[i]},${p[i + 1]}) không nằm trong nhà`);
}
// Bốn hướng đều sinh đa giác 6 đỉnh và góc đuôi đúng phía
for (const [dx, dy, cx, cy] of [[10, 20, 100, 50], [-10, 20, 0, 50], [10, -20, 100, 0], [-10, -20, 0, 0]]) {
  const q = buildingShadowPolygon(r, dx, dy);
  assert.deepEqual([q[10], q[11]], [cx, cy], `góc đuôi hướng (${dx},${dy})`);
}

// Ban đêm / mặt trời dưới chân trời: không bóng
assert.equal(buildingShadowShape({ sun: 0, sunElevation: -0.3, shadowDir: { x: 0, y: -1 } }).alpha, 0);
// Mặt trời thấp: bóng bị kẹp độ dài tối đa; mưa làm nhạt bóng
const low = buildingShadowShape({ sun: 1, sunElevation: 0.05, shadowDir: { x: 1, y: 0 } });
assert.ok(Math.abs(low.dx - BUILDING_SHADOW_MAX) < 1e-6 && low.dy === 0);
const wet = buildingShadowShape({ sun: 1, sunElevation: 0.8, shadowDir: { x: 0, y: -1 } }, 1);
assert.ok(wet.alpha < low.alpha * 0.2, 'mưa làm nhạt bóng');

// Cài đặt: mặc định bật, tắt được, chất lượng thấp luôn tắt
setWeatherFxSettings({ quality: 'high', depthFx: true });
assert.equal(depthFxActive(), true);
setWeatherFxSettings({ depthFx: false });
assert.equal(depthFxActive(), false);
setWeatherFxSettings({ depthFx: true, quality: 'low' });
assert.equal(depthFxActive(), false, 'chất lượng thấp tắt chiều sâu');
assert.equal(setWeatherFxSettings({ depthFx: 'x' as never, quality: null }).depthFx, true, 'giá trị lạ về mặc định bật');
console.log('depth-effects OK');

// ---- Sóng gợn vũng (road-cross-section-drainage 4.4): chỉ khi đang mưa và bật chiều sâu; Thấp / tắt chiều sâu thì không ----
{
  const base = getWeatherFxSettings();
  setWeatherFxSettings({ ...base, depthFx: true, quality: 'high' });
  const on = puddleWaveRings(1.3, 0.8, 0.7, depthFxActive());
  assert.equal(on.length, PUDDLE_WAVE.count, 'mưa + chiều sâu bật: có sóng gợn');
  assert.ok(on.every(r => r.scale > 0 && r.scale <= 0.9 && r.alpha >= 0 && r.alpha <= PUDDLE_WAVE.maxAlpha), 'sóng nằm trong vũng, mờ nhẹ');
  setWeatherFxSettings({ ...base, depthFx: true, quality: 'low' });
  assert.equal(puddleWaveRings(1.3, 0.8, 0.7, depthFxActive()).length, 0, 'chất lượng Thấp: tắt sóng gợn');
  setWeatherFxSettings({ ...base, depthFx: false, quality: 'high' });
  assert.equal(puddleWaveRings(1.3, 0.8, 0.7, depthFxActive()).length, 0, 'tắt Bóng & chiều sâu: tắt sóng gợn');
  assert.equal(puddleWaveRings(1.3, 0.8, 0, true).length, 0, 'tạnh mưa: không gợn (vũng còn nhưng mặt nước lặng)');
  assert.equal(puddleWaveRings(1.3, 0, 0.7, true).length, 0, 'không có vũng: không gợn');
  setWeatherFxSettings(base);
  console.log('✓ sóng gợn vũng bật/tắt đúng theo mưa + chiều sâu + chất lượng');
}
