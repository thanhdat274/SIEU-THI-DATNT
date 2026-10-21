import assert from 'node:assert/strict';
import {
  getWeatherFxSettings, setWeatherFxSettings, onWeatherFxSettings, resolveWeatherQuality,
  setRoofProximity, getRoofProximity, onThunder, emitThunder,
} from './weather-settings';

console.log('--- Testing weather-settings ---');

// Mặc định hợp lệ khi không có localStorage (Node)
const initial = getWeatherFxSettings();
assert.equal(typeof initial.enabled, 'boolean');
assert.ok(initial.intensity >= 0 && initial.intensity <= 1);

// getWeatherFxSettings trả bản sao
const copy = getWeatherFxSettings();
copy.intensity = 0.123;
assert.notEqual(getWeatherFxSettings().intensity, 0.123, 'sửa bản sao không đổi trạng thái');

// Kẹp 0..1, bỏ giá trị lạ
assert.equal(setWeatherFxSettings({ intensity: 5 }).intensity, 1);
assert.equal(setWeatherFxSettings({ intensity: -2 }).intensity, 0);
assert.equal(setWeatherFxSettings({ intensity: NaN }).intensity, 1, 'NaN về 1 (clamp01)');
assert.equal(setWeatherFxSettings({ quality: 'low' }).quality, 'low');
assert.equal(setWeatherFxSettings({ quality: 'ultra' as never }).quality, null, 'chất lượng lạ về tự chọn');

// Người nghe: nhận cập nhật, hủy đăng ký thì thôi
{
  let calls = 0;
  const off = onWeatherFxSettings(() => { calls++; });
  setWeatherFxSettings({ enabled: false });
  assert.equal(calls, 1);
  off();
  setWeatherFxSettings({ enabled: true });
  assert.equal(calls, 1, 'đã hủy thì không nhận');
}

// Chất lượng tường minh được giữ nguyên
for (const q of ['low', 'medium', 'high'] as const) {
  assert.equal(resolveWeatherQuality({ enabled: true, intensity: 1, quality: q, depthFx: true }), q);
}

// Độ gần mái được kẹp 0..1
setRoofProximity(3); assert.equal(getRoofProximity(), 1);
setRoofProximity(-3); assert.equal(getRoofProximity(), 0);

// Sấm
{
  const got: unknown[] = [];
  const off = onThunder(e => got.push(e));
  const ev = { intensity: 1 } as never;
  emitThunder(ev);
  off();
  emitThunder(ev);
  assert.equal(got.length, 1);
}

console.log('PASS weather-settings');
