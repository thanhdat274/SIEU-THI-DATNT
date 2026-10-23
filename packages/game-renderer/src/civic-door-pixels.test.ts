import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { parseAtlas } from './sprite-atlas-parse';
import { CIVIC_DEFS } from '@game/data';

/**
 * QA Bước D2 (lỗi D): `civic-atlas.test.ts` chỉ chứng minh KÍCH THƯỚC sprite khớp `doorTiles`; test này đọc pixel civic.png để
 * chứng minh sprite có VẼ cửa/cổng ở hai ô cửa giữa đáy.
 *
 * Cách đo: dải 32 px ngay trên dải vỉa hè (hàng ô H−2). Màu tường = màu đục phổ biến nhất của dải đó NGOÀI hai cột cửa.
 * Trong hai ô cửa, tỷ lệ pixel đục lệch màu tường > 48 (tổng |ΔR|+|ΔG|+|ΔB|) phải ≥ 0,5.
 * Số đo 17/10/2026: công viên 0,64; trạm y tế 0,94; đồn 1,00; trường tiểu học 0,11 (chỉ có tường gạch men, không có cổng).
 *
 * ⚠ CỐ Ý ĐỎ với `primary_school` / `primary_school_night` cho tới khi có sprite mới vẽ cổng trường (việc của người vẽ, chủ dự án
 * chốt KHÔNG sửa `doorTiles`). Đừng bỏ qua loại này hay nới ngưỡng để test xanh; nhập sprite mới rồi chạy lại.
 * File này đứng CUỐI lệnh `test` của game-renderer để các test khác vẫn chạy.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const civicDir = path.resolve(__dirname, '../../../apps/web/public/assets/sprites/civic');
const TILE = 32;
const WALL_DELTA = 48;
const MIN_DOOR_FRACTION = 0.5;

/** Giải mã PNG RGBA 8 bit không xen kẽ (đúng định dạng PIL ghi civic.png). */
function decodePng(buf: Buffer): { width: number; height: number; rgba: Uint8Array } {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', 'chữ ký PNG');
  let pos = 8, width = 0, height = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'bit depth 8'); assert.equal(data[9], 6, 'kiểu màu RGBA'); assert.equal(data[12], 0, 'không xen kẽ');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, rgba: out };
}

const atlas = parseAtlas(JSON.parse(fs.readFileSync(path.join(civicDir, 'civic.json'), 'utf8')));
assert.ok(atlas, 'civic.json hợp lệ');
const png = decodePng(fs.readFileSync(path.join(civicDir, 'civic.png')));
const pixel = (x: number, y: number) => { const i = (y * png.width + x) * 4; return [png.rgba[i], png.rgba[i + 1], png.rgba[i + 2], png.rgba[i + 3]]; };

const failures: string[] = [];
for (const def of CIVIC_DEFS) {
  for (const key of [`civic_${def.buildingTypeId}`, `civic_${def.buildingTypeId}_night`]) {
    const f = atlas.frames.get(key);
    assert.ok(f, `có khung ${key}`);
    const mid = Math.floor(f.w / TILE / 2);
    const y0 = f.h - 2 * TILE;
    const doorX0 = (mid - 1) * TILE, doorX1 = (mid + 1) * TILE;
    const counts = new Map<string, number>();
    for (let y = y0; y < y0 + TILE; y++) for (let x = 0; x < f.w; x++) {
      if (x >= doorX0 && x < doorX1) continue;
      const [r, g, b, a] = pixel(f.x + x, f.y + y);
      if (a >= 200) counts.set(`${r},${g},${b}`, (counts.get(`${r},${g},${b}`) ?? 0) + 1);
    }
    const wall = [...counts.entries()].sort((p, q) => q[1] - p[1])[0][0].split(',').map(Number);
    let differ = 0;
    for (let y = y0; y < y0 + TILE; y++) for (let x = doorX0; x < doorX1; x++) {
      const [r, g, b, a] = pixel(f.x + x, f.y + y);
      if (a >= 200 && Math.abs(r - wall[0]) + Math.abs(g - wall[1]) + Math.abs(b - wall[2]) > WALL_DELTA) differ++;
    }
    const fraction = differ / (2 * TILE * TILE);
    console.log(`  ${key}: ${(fraction * 100).toFixed(0)}% pixel ô cửa khác màu tường (${wall.join(',')})`);
    if (fraction < MIN_DOOR_FRACTION) failures.push(`${key}: chỉ ${(fraction * 100).toFixed(0)}% pixel ở hai ô cửa giữa đáy khác màu tường — sprite chưa vẽ cửa/cổng trùng doorTiles`);
  }
}
assert.deepEqual(failures, [], `Sprite civic thiếu cửa/cổng ở doorTiles (chờ sprite mới, KHÔNG nới ngưỡng):\n${failures.join('\n')}`);
console.log('PASS civic-door-pixels: mọi mặt tiền civic có cửa/cổng ở hai ô cửa giữa đáy');
