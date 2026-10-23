import assert from 'node:assert/strict';
import { presetPrice } from './price-presets';

const range = { min: 5_000, max: 15_000, step: 500 };
assert.equal(presetPrice(10_000, range, 1), null, 'giá gợi ý = về mặc định');
assert.equal(presetPrice(10_000, range, 0.85), 8_500, 'rẻ −15% làm tròn theo bước');
assert.equal(presetPrice(10_000, range, 1.15), 11_500, 'cao +15%');
assert.equal(presetPrice(14_000, range, 1.15), 15_000, 'kẹp trần');
assert.equal(presetPrice(10_000, null, 1.15), null, 'không có giới hạn → không đổi');
console.log('PricesModal preset tests passed');
