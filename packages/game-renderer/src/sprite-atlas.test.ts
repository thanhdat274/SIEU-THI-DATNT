import assert from 'node:assert/strict';
import { logicalFrame, parseAtlas, parseAtlasIndex, resolveAssetPath } from './sprite-atlas-parse';

const compact = parseAtlas({ image: 'p.png', resolution: 2, frames: { a: { x: 0, y: 0, w: 64, h: 72 }, bad: { x: -1, y: 0, w: 4, h: 4 }, bad2: { x: 0, y: 0, w: 0, h: 4 } } });
assert.ok(compact);
assert.equal(compact.resolution, 2);
assert.deepEqual([...compact.frames.keys()], ['a'], 'khung hỏng bị bỏ, khung tốt giữ lại');
assert.deepEqual(logicalFrame(compact.frames.get('a')!, 2), { x: 0, y: 0, w: 32, h: 36 }, 'ảnh 64×72 ở resolution 2 hiển thị 32×36 logic');

const hash = parseAtlas({ meta: { image: 'q.png' }, frames: { b: { frame: { x: 8, y: 8, w: 16, h: 16 } } } });
assert.equal(hash?.image, 'q.png');
assert.equal(hash?.resolution, 1);
assert.deepEqual(hash?.frames.get('b'), { x: 8, y: 8, w: 16, h: 16 });

assert.equal(parseAtlas({ frames: {} }), null, 'thiếu image');
assert.equal(parseAtlas({ image: 'x.png' }), null, 'thiếu frames');
assert.equal(parseAtlas('x'), null);
assert.equal(parseAtlas({ image: 'x.png', resolution: 0.5, frames: {} })?.resolution, 1, 'resolution < 1 coi như 1');

assert.deepEqual(parseAtlasIndex({ atlases: ['a.json', 3, ''] }), { atlases: ['a.json'] });
assert.equal(parseAtlasIndex({}), null);

assert.equal(resolveAssetPath('/assets/sprites/', 'characters/p.json'), '/assets/sprites/characters/p.json');
assert.equal(resolveAssetPath('/assets/sprites', './p.png'), '/assets/sprites/p.png');
assert.equal(resolveAssetPath('/assets/sprites/', '../secret.json'), null);
assert.equal(resolveAssetPath('/assets/sprites/', 'https://evil/x.png'), null);
assert.equal(resolveAssetPath('/assets/sprites/', '//evil/x.png'), null);

import { PRODUCT_SPRITES } from './product-sprites';
import { validateSprite } from './ref-pixelart';

for (const dishId of ['ca_phe_den_da_tp', 'bac_xiu_tp', 'ca_phe_trung_tp', 'com_suon_nuong_tp', 'com_chien_trung_tp', 'canh_rau_thit_tp']) {
  assert.ok(PRODUCT_SPRITES[dishId], `Sprite tồn tại cho ${dishId}`);
  const errs = validateSprite(PRODUCT_SPRITES[dishId]);
  assert.equal(errs.length, 0, `Sprite ${dishId} hợp lệ 16x16: ${errs.join(', ')}`);
}

console.log('sprite-atlas tests PASS');
