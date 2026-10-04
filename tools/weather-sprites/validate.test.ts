import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, buildAll } from './build';

/**
 * Kiểm tra chất lượng pixel của bộ sprite ô/áo mưa: nền trong suốt thật (alpha 0 hoặc 255, không khử răng cưa),
 * không điểm lẻ, không chạm mép khung (bị cắt), khung nào cũng có hình, và file PNG đã xuất khớp bản sinh hiện tại.
 */
const built = buildAll();
let frames = 0;
for (const b of built) {
  for (const f of b.list) {
    frames++;
    const { img } = f;
    let opaque = 0;
    const seen = new Uint8Array(img.w * img.h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const a = img.get(x, y)[3];
      assert.ok(a === 0 || a === 255, `${b.kind}/${b.color}/${f.name}: alpha ${a} (cần 0 hoặc 255)`);
      if (a) opaque++;
    }
    assert.ok(opaque > 20, `${f.name}: khung gần như trống`);
    // Không chạm mép khung.
    for (let i = 0; i < img.w; i++) assert.equal(img.get(i, 0)[3] + img.get(i, img.h - 1)[3], 0, `${f.name}: chạm mép trên/dưới`);
    for (let i = 0; i < img.h; i++) assert.equal(img.get(0, i)[3] + img.get(img.w - 1, i)[3], 0, `${f.name}: chạm mép trái/phải`);
    // Thành phần liên thông (8 hướng): không mảnh dưới 3 điểm, ô tối đa 3 mảnh (vòm, cán trên, cán dưới sau đầu).
    let comps = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (!img.get(x, y)[3] || seen[y * img.w + x]) continue;
      comps++;
      let size = 0;
      const stack = [[x, y]];
      seen[y * img.w + x] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        size++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx; const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h || seen[ny * img.w + nx] || !img.get(nx, ny)[3]) continue;
          seen[ny * img.w + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      assert.ok(size >= 3, `${f.name}: điểm lẻ ${size}px tại ${cx0(x)},${y}`);
    }
    assert.ok(comps <= (b.kind === 'umbrella' ? 3 : 4), `${f.name}: ${comps} mảnh rời`);
  }
}
function cx0(x: number): number { return x; }

// Mỗi bộ có đủ số khung và mọi màu cùng một lưới khung.
const um = built.filter((b) => b.kind === 'umbrella');
const rc = built.filter((b) => b.kind === 'raincoat');
assert.equal(um.length, 5);
assert.equal(rc.length, 5);
for (const group of [um, rc]) for (const b of group) assert.deepEqual(Object.keys(b.frames), Object.keys(group[0].frames), 'mọi màu cùng danh sách khung');

// Sprite đã xuất ra đĩa trùng bản sinh hiện tại (không để quên chạy `yarn weather:sprites`).
for (const kind of ['umbrella', 'raincoat'] as const) {
  const manifest = JSON.parse(readFileSync(join(OUT_DIR, kind, 'manifest.json'), 'utf8'));
  const first = built.find((b) => b.kind === kind)!;
  assert.deepEqual(manifest.frames, first.frames, `${kind}/manifest.json lỗi thời: chạy yarn weather:sprites`);
}

console.log(`weather sprites validate PASS (${frames} khung, ${built.length} sheet)`);
