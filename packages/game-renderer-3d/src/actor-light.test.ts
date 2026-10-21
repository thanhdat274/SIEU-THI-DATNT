import assert from 'node:assert/strict';
import { lightingAt } from './sky-3d';
import { actorLightTint, sameTint } from './actor-light';

const tint = (h: number, rain = 0) => actorLightTint(lightingAt(h, 0, 1, rain));
const lum = (t: { r: number; g: number; b: number }) => 0.3 * t.r + 0.59 * t.g + 0.11 * t.b;

// Trưa quang = màu gốc; ban ngày 9–15h gần màu gốc (không tối đi).
assert.ok(sameTint(tint(12), { r: 1, g: 1, b: 1 }));
for (const h of [9, 10, 12, 15]) assert.ok(lum(tint(h)) >= 0.88, `${h}h gần màu gốc`);
// Mọi kênh nằm trong [0.22, 1].
for (let h = 0; h < 24; h++) for (const r of [0, 1]) {
  const t = tint(h, r);
  for (const v of [t.r, t.g, t.b]) assert.ok(v >= 0.22 - 1e-9 && v <= 1 + 1e-9, `${h}h mưa ${r}`);
}
// Đêm: tối hơn nhiều và ngả xanh (b > r, b > g).
const night = tint(22);
assert.ok(lum(night) < 0.45 * lum(tint(12)));
assert.ok(night.b > night.r && night.b > night.g, 'đêm ngả xanh');
// Mưa: tối hơn và xám hơn (các kênh gần nhau) so với trời quang cùng giờ.
const rainy = tint(10, 1);
const clear = tint(10);
assert.ok(lum(rainy) < lum(clear));
assert.ok(Math.abs(rainy.r - rainy.b) < Math.abs(clear.r - clear.b), 'mưa xám hơn');
// Hoàng hôn ấm (r > b), sáng dần từ bình minh đến trưa.
assert.ok(tint(17).r > tint(17).b);
assert.ok(lum(tint(6)) < lum(tint(8)) && lum(tint(8)) < lum(tint(12)));
console.log('PASS actor-light: màu nhân sprite theo giờ/mưa (ngày giữ màu gốc, đêm xanh tối, mưa xám)');
