import { writeFileSync } from 'node:fs';
import { Img, encodePng } from './image';
import { buildAll } from './build';

// Ảnh xem nhanh: phóng nguyên số nguyên (nearest) một số khung chọn lọc lên nền xám để soi pixel.
const scale = Number(process.argv[3] ?? 6);
const kind = process.argv[2] ?? 'umbrella';
const built = buildAll().find((b) => b.kind === kind && b.color === (process.argv[4] ?? (kind === 'umbrella' ? 'blue' : 'yellow')))!;
const names = Object.keys(built.frames).filter((n) => new RegExp(process.argv[5] ?? '.').test(n));
const cols = 8;
const W = built.frameW; const H = built.frameH;
const rows = Math.ceil(names.length / cols);
const out = new Img(cols * (W * scale + 4), rows * (H * scale + 4));
out.rect(0, 0, out.w, out.h, [150, 160, 150, 255]);
names.forEach((n, i) => {
  const ox = (i % cols) * (W * scale + 4); const oy = Math.floor(i / cols) * (H * scale + 4);
  const f = built.frames[n];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = built.sheet.get(f.x + x, f.y + y);
    if (c[3]) out.rect(ox + x * scale, oy + y * scale, scale, scale, c);
  }
});
writeFileSync(process.argv[6] ?? 'review.png', encodePng(out));
console.log(names.length, 'frames');
