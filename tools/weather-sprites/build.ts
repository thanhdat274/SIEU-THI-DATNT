import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTER_FRAME, RAINCOAT_COLOR_NAMES, UMBRELLA_COLOR_NAMES, UMBRELLA_FRAME } from '../../packages/game-data/src/weather-sprite-layout';
import { Img, encodePng } from './image';
import { raincoatSheetFrames } from './raincoat';
import { umbrellaSheetFrames, type SheetFrame } from './umbrella';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(root, 'apps', 'web', 'public', 'assets', 'weather');

export interface Built {
  kind: 'umbrella' | 'raincoat';
  color: string;
  sheet: Img;
  frames: Record<string, { x: number; y: number }>;
  frameW: number;
  frameH: number;
  list: SheetFrame[];
}

function pack(rows: SheetFrame[][], fw: number, fh: number): { sheet: Img; frames: Record<string, { x: number; y: number }>; list: SheetFrame[] } {
  const cols = Math.max(...rows.map((r) => r.length));
  const sheet = new Img(cols * fw, rows.length * fh);
  const frames: Record<string, { x: number; y: number }> = {};
  const list: SheetFrame[] = [];
  rows.forEach((row, ry) => row.forEach((f, cx) => {
    sheet.blit(f.img, cx * fw, ry * fh);
    frames[f.name] = { x: cx * fw, y: ry * fh };
    list.push(f);
  }));
  return { sheet, frames, list };
}

export function buildAll(): Built[] {
  const out: Built[] = [];
  for (const color of UMBRELLA_COLOR_NAMES) out.push({ kind: 'umbrella', color, frameW: UMBRELLA_FRAME.w, frameH: UMBRELLA_FRAME.h, ...pack(umbrellaSheetFrames(color).rows, UMBRELLA_FRAME.w, UMBRELLA_FRAME.h) });
  for (const color of RAINCOAT_COLOR_NAMES) out.push({ kind: 'raincoat', color, frameW: CHARACTER_FRAME.w, frameH: CHARACTER_FRAME.h, ...pack(raincoatSheetFrames(color).rows, CHARACTER_FRAME.w, CHARACTER_FRAME.h) });
  return out;
}

export function writeAll(built: Built[]): void {
  for (const kind of ['umbrella', 'raincoat'] as const) {
    const dir = join(OUT_DIR, kind);
    mkdirSync(dir, { recursive: true });
    const group = built.filter((b) => b.kind === kind);
    for (const b of group) writeFileSync(join(dir, `${kind}_${b.color}.png`), encodePng(b.sheet));
    // Khung giống nhau ở mọi màu nên manifest chỉ cần một bản.
    const first = group[0];
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ temporary: true, note: 'TEMPORARY ASSET: do code sinh (tools/weather-sprites), chưa có artist duyệt; thay PNG cùng bố cục là đủ, không phải sửa logic thời tiết', kind, frameW: first.frameW, frameH: first.frameH, colors: group.map((b) => b.color), frames: first.frames }));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const built = buildAll();
  writeAll(built);
  const readme = ['# Weather sprites — TEMPORARY ASSET', '', 'Sinh bởi `yarn weather:sprites` (tools/weather-sprites). Chưa phải sản phẩm của artist.', 'Để thay bằng sprite thật: giữ nguyên lưới khung/tên khung trong manifest.json và `packages/game-data/src/weather-sprite-layout.ts`; logic thời tiết không đổi.', ''].join('\n');
  writeFileSync(join(OUT_DIR, 'README.md'), readme);
  console.log(`weather sprites: ${built.length} sheets -> ${OUT_DIR}`);
}
