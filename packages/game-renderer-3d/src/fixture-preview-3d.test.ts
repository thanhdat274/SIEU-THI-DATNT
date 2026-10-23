import assert from 'node:assert/strict';
import { FIXTURE_SHOP } from '@game/data';
import { fixtureBoxes } from './fixture-shapes';
import { fixturePreviewKey, previewFixtureFor, renderFixturePreview } from './fixture-preview-3d';

// Khóa cache tách theo loại, chân diện và góc chụp.
assert.equal(fixturePreviewKey('shelf_wooden', 2, 1), 'shelf_wooden|2x1|iso');
assert.notEqual(fixturePreviewKey('shelf_wooden', 2, 1), fixturePreviewKey('shelf_wooden', 1, 1));
assert.notEqual(fixturePreviewKey('shelf_wooden', 2, 1, 'iso'), fixturePreviewKey('shelf_wooden', 2, 1, 'top'));

// Mọi món trong danh mục đều dựng được ít nhất một khối khi chụp (nếu không sẽ ra ảnh trống).
for (const item of FIXTURE_SHOP) {
  const boxes = fixtureBoxes(previewFixtureFor(item.type, item.widthTiles, item.heightTiles));
  assert.ok(boxes.length > 0, `${item.id} (${item.type}) phải có khối dựng`);
}

// Không có DOM (môi trường test/SSR) thì trả null thay vì ném lỗi.
void renderFixturePreview('shelf_wooden', 2, 1).then((url) => {
  assert.equal(url, null);
  console.log('PASS fixture-preview-3d: khóa cache, mọi món danh mục dựng được, không DOM trả null');
});
