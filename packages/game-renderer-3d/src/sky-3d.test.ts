import assert from 'node:assert/strict';
import { lightingAt } from './sky-3d';

const lum = (c: number) => 0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255);
const at = (h: number, m = 0, rain = 0) => lightingAt(h, m, 1, rain);
const [dawn, noon, dusk, night] = [at(6), at(12), at(18), at(22)];

// Nắng: trưa mạnh nhất, bình minh yếu, đêm tắt; hướng nắng luôn chếch xuống, là vector đơn vị.
assert.ok(noon.sunIntensity > dawn.sunIntensity && dawn.sunIntensity > night.sunIntensity);
assert.ok(noon.sunIntensity > dusk.sunIntensity);
assert.equal(night.sunIntensity, 0);
for (const l of [dawn, noon, dusk, night]) {
  assert.ok(l.sunDir.y < 0, 'nắng chiếu xuống');
  assert.ok(Math.abs(Math.hypot(l.sunDir.x, l.sunDir.y, l.sunDir.z) - 1) < 1e-9, 'vector đơn vị');
}
// Sáng nắng từ đông (đi về phía tây, x < 0), chiều từ tây (x > 0): hướng xoay theo giờ.
assert.ok(at(7).sunDir.x < 0 && at(17).sunDir.x > 0);

// Đèn: ban ngày tắt, đêm bật hết, hoàng hôn đang bật.
assert.equal(noon.lampsOn, 0);
assert.equal(night.lampsOn, 1);
assert.ok(dusk.lampsOn > 0.5 && dawn.lampsOn > 0.5 && at(9).lampsOn < 0.2);

// Màu: ban ngày sáng hơn ban đêm (cả đèn hemi lẫn nền trời), trời trưa và đêm khác nhau.
assert.ok(lum(noon.hemiColor) * noon.hemiIntensity > lum(night.hemiColor) * night.hemiIntensity);
assert.ok(lum(noon.skyColor) > lum(night.skyColor));
assert.ok(night.skyColor <= 0x1e2850 && night.skyColor >= 0x111a33 - 1);

// Mưa: tối và xám hơn lúc trưa, không đổi lúc đêm tắt nắng; mưa 0 thì y hệt không truyền.
const rainy = at(12, 0, 1);
assert.ok(rainy.sunIntensity < noon.sunIntensity && lum(rainy.skyColor) < lum(noon.skyColor));
assert.ok(rainy.hemiIntensity < noon.hemiIntensity);
assert.deepEqual(lightingAt(12, 0, 1, 0), lightingAt(12, 0, 1));
console.log('PASS sky-3d: nắng/đèn/màu theo giờ, mưa tối cảnh');
