/**
 * Texture pixel-art thủ tục cho khu phố mở rộng (nhà dân, nhà phố, chung cư, trường, công viên, đồi núi).
 * Cùng phong cách với `premium-textures.ts`: canvas 2D vẽ bằng `fillRect`, viền tối, bảng màu hạn chế, không làm mượt.
 * Khóa texture: `nb_house_<variant>_<tầng>_<rộng ô>[_y]`, `nb_shop_<variant>_<tầng>_<rộng ô>`, `nb_apartment_<variant>`,
 * `nb_school_building`, `nb_school_gate`, `nb_bench`, `nb_pavilion`, `nb_bus_stop`, `nb_playground`, `nb_bush`, `nb_tree_round`,
 * `nb_palm`, `nb_flowerbed_<0..2>`, `nb_hedge`, `nb_bin`, `nb_pot_<0..2>`, `nb_hills_<0..2>`, `nb_bird_<0..1>`.
 */
function surface(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const r = (x: number, y: number, rw: number, rh: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh)); };
  return { canvas, ctx, r };
}
type R = (x: number, y: number, w: number, h: number, c: string) => void;

const INK = '#1f1a16';

/** Số nguyên giả ngẫu nhiên ổn định từ chuỗi/số (cho chi tiết rải trên nhà). */
const hash = (...n: number[]): number => {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619);
  return (h >>> 0);
};

interface WallPalette { main: string; light: string; dark: string; trim: string }
const WALLS: readonly WallPalette[] = [
  { main: '#e8d9a8', light: '#f4ebcf', dark: '#c9b783', trim: '#b89a5c' },
  { main: '#a9d4b8', light: '#cae9d4', dark: '#82b394', trim: '#5f8f73' },
  { main: '#e9b7b0', light: '#f5d6d1', dark: '#c78e86', trim: '#a96a62' },
  { main: '#a9c7e0', light: '#cadeef', dark: '#7fa3c4', trim: '#5b82a6' },
  { main: '#ecc766', light: '#f7dd96', dark: '#c9a040', trim: '#a07c26' },
  { main: '#d8d4cc', light: '#eceae4', dark: '#b3aea4', trim: '#8a857b' },
  { main: '#d49a78', light: '#e8bc9f', dark: '#b07654', trim: '#8a5636' },
  { main: '#c3b5d9', light: '#ddd3eb', dark: '#9d8dbb', trim: '#75669b' },
];
const SHUTTERS = ['#3f7a5a', '#8a5a2f', '#3a6ea5', '#a8453a'];
const DOORS = ['#8a5a2f', '#4a6a5a', '#6a4a3a', '#a8453a', '#46627a'];

function drawWindow(r: R, x: number, y: number, w: number, h: number, wall: WallPalette, shutter: string | null, lit = false): void {
  r(x - 2, y - 2, w + 4, h + 4, INK);
  r(x - 1, y - 1, w + 2, h + 2, wall.light);
  r(x, y, w, h, lit ? '#f3d889' : '#7fb3d6');
  r(x, y, w, 2, lit ? '#fff2b8' : '#a9d3ea');
  r(x + 1, y + 3, 2, h - 6, lit ? '#fff2b8' : '#c4e4f3'); // vệt phản chiếu
  r(x + Math.floor(w / 2), y, 1, h, wall.trim); // chấn song giữa
  r(x - 2, y + h + 1, w + 4, 2, wall.dark); // bệ cửa sổ
  if (shutter) { r(x - 6, y - 1, 4, h + 2, INK); r(x - 5, y, 2, h, shutter); r(x + w + 2, y - 1, 4, h + 2, INK); r(x + w + 3, y, 2, h, shutter); }
}

function drawAc(r: R, x: number, y: number): void {
  r(x, y, 14, 8, INK); r(x + 1, y + 1, 12, 6, '#e8ecef'); r(x + 1, y + 5, 12, 1, '#9aa3ab'); r(x + 2, y + 2, 3, 1, '#7fb3d6');
}

function drawTileRoof(r: R, w: number, roofH: number, kind: number): void {
  const cols = kind === 0 ? ['#a8483a', '#c9694e', '#7f3427'] : ['#6f8097', '#9fb0c2', '#556579'];
  for (let i = 0; i < roofH; i++) {
    const inset = Math.floor((roofH - 1 - i) * 0.9);
    const x0 = Math.max(0, inset - 2);
    r(x0, i, w - x0 * 2, 1, INK);
    r(x0 + 1, i, w - x0 * 2 - 2, 1, i % 3 === 0 ? cols[2] : (i % 2 ? cols[0] : cols[1]));
    if (kind === 0) for (let x = x0 + 3; x < w - x0 - 3; x += 6) r(x + (i % 2) * 3, i, 1, 1, cols[2]);
  }
  r(0, roofH - 3, w, 3, INK); r(1, roofH - 3, w - 2, 1, cols[1]); r(1, roofH - 2, w - 2, 1, cols[2]);
}

function drawFlatRoof(r: R, w: number, roofH: number, seed: number): void {
  r(0, roofH - 9, w, 9, INK); r(1, roofH - 8, w - 2, 6, '#c9c4b8'); r(1, roofH - 8, w - 2, 1, '#e8e4da'); r(1, roofH - 2, w - 2, 1, '#8a857b');
  // bồn nước, ăng-ten
  const tx = 8 + (seed % Math.max(1, w - 40));
  r(tx, roofH - 24, 18, 16, INK); r(tx + 1, roofH - 23, 16, 14, '#4b5560'); r(tx + 1, roofH - 23, 3, 14, '#7c8792'); r(tx + 3, roofH - 26, 12, 3, INK); r(tx + 4, roofH - 25, 10, 1, '#7c8792');
  r(tx + 2, roofH - 10, 2, 3, INK); r(tx + 14, roofH - 10, 2, 3, INK);
  if (seed % 3 === 0) { r(w - 20, roofH - 22, 1, 13, INK); r(w - 24, roofH - 22, 9, 1, INK); r(w - 23, roofH - 18, 7, 1, INK); }
}

function drawDoor(r: R, x: number, y: number, kind: number, color: string): void {
  r(x - 2, y - 2, 20, 36, INK);
  r(x - 1, y - 1, 18, 34, '#d9d2c0');
  if (kind === 0) { // cổng sắt kéo
    r(x, y, 16, 32, '#6f7a7e');
    for (let i = 0; i < 16; i += 3) r(x + i, y, 1, 32, '#3d4448');
    r(x, y + 15, 16, 1, '#3d4448');
  } else { // cửa gỗ
    r(x, y, 16, 32, color); r(x, y, 2, 32, '#ffffff22'); r(x + 3, y + 4, 10, 10, '#00000026'); r(x + 3, y + 18, 10, 11, '#00000026');
    r(x + 12, y + 17, 2, 3, '#e9c46a');
  }
  r(x - 2, y + 33, 20, 2, '#8a857b');
}

function drawFence(r: R, x: number, y: number, w: number, color: string): void {
  r(x, y + 7, w, 2, INK);
  for (let i = 0; i < w; i += 6) { r(x + i, y, 3, 12, INK); r(x + i + 1, y + 1, 1, 10, color); }
  r(x, y + 2, w, 2, INK); r(x, y + 3, w, 1, color);
}

function drawPot(r: R, x: number, y: number, v: number): void {
  const flowers = ['#e8527a', '#f4c430', '#ffffff'][v % 3];
  r(x, y + 7, 9, 7, INK); r(x + 1, y + 8, 7, 5, '#b5654a');
  r(x + 1, y + 1, 7, 7, '#2f6b3a'); r(x + 3, y, 3, 3, '#4ea05a'); r(x + 2, y + 2, 2, 2, flowers); r(x + 5, y + 3, 2, 2, flowers);
}

/** Nhà dân/nhà phố một mặt tiền. `kind`: 'house' | 'shop'. */
export function houseTexture(kind: 'house' | 'shop', variant: number, floors: number, wTiles: number, yard: boolean): HTMLCanvasElement {
  const W = wTiles * 32;
  const FH = 44;
  const roofType = Math.floor(variant / 8) % 3; // 0 ngói đỏ, 1 mái tôn, 2 sân thượng
  const roofH = roofType === 2 ? 32 : 26;
  const baseH = yard ? 14 : 6;
  const H = roofH + floors * FH + baseH;
  const { canvas, r } = surface(W, H);
  const wall = WALLS[variant % WALLS.length];
  const seed = hash(variant, floors, wTiles);
  const bodyTop = roofH;
  const bodyBottom = H - baseH;

  // Bóng đổ sân
  r(2, H - 5, W - 4, 4, '#26190e44');
  // Tường
  r(2, bodyTop, W - 4, bodyBottom - bodyTop, INK);
  r(3, bodyTop, W - 6, bodyBottom - bodyTop - 1, wall.main);
  r(3, bodyTop, 3, bodyBottom - bodyTop - 1, wall.light);
  r(W - 8, bodyTop, 5, bodyBottom - bodyTop - 1, wall.dark);
  // Vết loang/ẩm ở chân tường cho bớt sạch
  r(3, bodyBottom - 12, W - 6, 11, wall.dark + '88');
  for (let i = 0; i < 6; i++) r(6 + ((seed >>> (i * 3)) % Math.max(1, W - 24)), bodyTop + 10 + ((seed >>> (i + 5)) % 14) + i * 4, 6, 2, wall.dark + '66');
  // Gờ sàn giữa các tầng
  for (let f = 1; f < floors; f++) { const y = bodyTop + f * FH - 2; r(1, y, W - 2, 4, INK); r(2, y + 1, W - 4, 2, wall.light); r(2, y + 3, W - 4, 1, wall.trim); }

  const doorFirst = (seed & 1) === 0;
  const windowsPerFloor = Math.max(2, Math.floor((W - 24) / 52) + 1);
  const slotW = (W - 12) / windowsPerFloor;
  const shutter = (seed & 4) ? SHUTTERS[(seed >>> 3) % SHUTTERS.length] : null;
  for (let f = 0; f < floors; f++) {
    const fy = bodyTop + f * FH;
    const ground = f === floors - 1;
    for (let i = 0; i < windowsPerFloor; i++) {
      const cx = 6 + slotW * i + slotW / 2;
      const isDoorSlot = ground && (doorFirst ? i === 0 : i === windowsPerFloor - 1);
      if (isDoorSlot) {
        if (kind === 'shop') continue; // cửa hàng vẽ riêng bên dưới
        drawDoor(r, cx - 8, fy + FH - 38, (seed >>> 5) % 2, DOORS[(seed >>> 7) % DOORS.length]);
        // biển số nhà
        r(cx + 12, fy + FH - 36, 9, 7, INK); r(cx + 13, fy + FH - 35, 7, 5, '#f4f4f4'); r(cx + 15, fy + FH - 34, 3, 3, '#c0392b');
      } else if (!(ground && kind === 'shop')) {
        drawWindow(r, cx - 7, fy + 8, 14, 20, wall, shutter, ((seed >>> (f + i)) & 3) === 0);
        if (((seed >>> (i + f * 3)) & 7) === 1) drawAc(r, cx - 7, fy + 31);
      }
    }
    // Ban công các tầng trên
    if (!ground && ((seed >>> 9) + f) % 2 === 0) {
      const bx = 8 + ((seed >>> 4) % 3) * 8;
      const bw = Math.min(W - 16, 60);
      r(bx, fy + FH - 12, bw, 3, INK); r(bx + 1, fy + FH - 11, bw - 2, 1, '#9aa0a6');
      for (let x = bx + 2; x < bx + bw - 1; x += 5) r(x, fy + FH - 22, 1, 11, INK);
      r(bx, fy + FH - 24, bw, 2, INK);
      if (seed % 2 === 0) drawPot(r, bx + 6, fy + FH - 34, seed);
      else { for (let k = 0; k < 4; k++) r(bx + 6 + k * 9, fy + FH - 24, 6, 10, ['#e8e4da', '#7fb3d6', '#e8527a', '#f4c430'][(k + seed) % 4]); }
    }
  }
  // Cửa hàng ở nhà phố: mặt tiền mở với mái hiên sọc, bảng hiệu
  if (kind === 'shop') {
    const sy = bodyBottom - 36;
    const sx = 10 + (seed % 3) * 6;
    const sw = W - 20 - (seed % 3) * 6;
    r(sx - 2, sy - 2, sw + 4, 38, INK);
    r(sx, sy + 6, sw, 28, (seed & 2) ? '#6f7a7e' : '#2a3a42');
    if (seed & 2) { for (let i = 0; i < sw; i += 3) r(sx + i, sy + 6, 1, 28, '#3d4448'); r(sx, sy + 34 - 6, sw, 1, '#3d4448'); }
    else { r(sx + 3, sy + 10, sw - 6, 18, '#f3d889'); r(sx + 3, sy + 10, sw - 6, 2, '#fff2b8'); for (let i = 0; i < 4; i++) r(sx + 6 + i * Math.floor((sw - 14) / 4), sy + 14, 8, 10, ['#e8527a', '#7fb3d6', '#e9c46a', '#8bc34a'][(i + seed) % 4]); }
    const col = ['#c0392b', '#2e86c1', '#2e8b57', '#e67e22'][(seed >>> 6) % 4];
    for (let i = 0; i < sw; i += 8) { r(sx + i, sy - 6, 8, 12, i % 16 === 0 ? col : '#f4f0e6'); }
    r(sx, sy + 5, sw, 2, INK);
    // bảng hiệu
    r(sx + 4, sy - 16, sw - 8, 10, INK); r(sx + 5, sy - 15, sw - 10, 8, ['#2e8b57', '#c0392b', '#1d5a8a', '#6b4a8f'][(seed >>> 2) % 4]);
    for (let i = 0; i < Math.floor((sw - 18) / 6); i++) r(sx + 9 + i * 6, sy - 12, 4, 2, '#ffe9a8');
  }
  // Mái
  if (roofType === 2) drawFlatRoof(r, W, roofH, seed >>> 4); else drawTileRoof(r, W, roofH, roofType);
  // Sân + hàng rào
  if (yard) { drawFence(r, 4, H - 14, W - 8, ['#8a5a2f', '#d8d4cc', '#3f7a5a'][seed % 3]); drawPot(r, 8, H - 22, seed); drawPot(r, W - 20, H - 22, seed + 1); }
  return canvas;
}

/** Chung cư: khối cao, lưới cửa sổ, ban công, điều hòa, sảnh có mái. */
export function apartmentTexture(variant: number): HTMLCanvasElement {
  const W = 320;
  const floors = 6 - (variant % 2);
  const FH = 36;
  const roofH = 22;
  const baseH = 40;
  const H = roofH + floors * FH + baseH;
  const { canvas, r } = surface(W, H);
  const pals: readonly WallPalette[] = [WALLS[0], WALLS[3], WALLS[2]];
  const wall = pals[variant % 3];
  const seed = hash(variant, 77);
  r(2, H - 6, W - 4, 5, '#26190e44');
  r(4, roofH, W - 8, H - roofH - 6, INK);
  r(5, roofH, W - 10, H - roofH - 7, wall.main);
  r(5, roofH, 4, H - roofH - 7, wall.light);
  r(W - 14, roofH, 9, H - roofH - 7, wall.dark);
  // Tháp thang bộ ở giữa
  r(W / 2 - 18, roofH, 36, H - roofH - 7, wall.dark); r(W / 2 - 17, roofH, 2, H - roofH - 7, wall.main);
  for (let f = 0; f < floors; f++) {
    const fy = roofH + f * FH;
    r(5, fy + FH - 3, W - 10, 3, INK); r(5, fy + FH - 2, W - 10, 1, wall.light);
    for (let i = 0; i < 6; i++) {
      const x = i < 3 ? 16 + i * 40 : W / 2 + 28 + (i - 3) * 40;
      drawWindow(r, x, fy + 6, 16, 18, wall, null, ((seed >>> (f + i)) % 9) === 0);
      if (((seed >>> (i + f)) & 3) === 0) drawAc(r, x + 18, fy + 20);
      // ban công xen kẽ
      if ((f + i) % 3 === 0) { r(x - 4, fy + 26, 26, 2, INK); for (let b = 0; b < 26; b += 5) r(x - 4 + b, fy + 20, 1, 7, INK); r(x - 4, fy + 19, 26, 1, INK); if ((seed + f + i) % 3 === 0) r(x, fy + 21, 8, 5, ['#e8527a', '#7fb3d6', '#e9c46a'][(f + i) % 3]); }
    }
    // cửa sổ cầu thang
    r(W / 2 - 6, fy + 8, 12, 14, INK); r(W / 2 - 5, fy + 9, 10, 12, '#7fb3d6'); r(W / 2 - 5, fy + 9, 10, 2, '#a9d3ea');
  }
  // Tầng trệt: sảnh có mái, cửa kính, bãi xe máy
  const gy = H - baseH;
  r(W / 2 - 30, gy + 4, 60, 32, INK); r(W / 2 - 28, gy + 8, 56, 28, '#7fb3d6'); r(W / 2 - 28, gy + 8, 56, 3, '#a9d3ea'); r(W / 2, gy + 8, 1, 28, INK);
  r(W / 2 - 36, gy - 2, 72, 8, INK); r(W / 2 - 35, gy - 1, 70, 6, '#2e86c1'); r(W / 2 - 35, gy - 1, 70, 2, '#5fa8d9');
  for (const x of [16, 56, 210, 252]) { r(x, gy + 8, 44, 26, INK); r(x + 1, gy + 9, 42, 24, '#4a525a'); for (let k = 1; k < 8; k++) r(x + 1, gy + 9 + k * 3, 42, 1, '#3a4148'); }
  // Mái: sân thượng, bồn nước, phòng kỹ thuật
  r(0, roofH - 12, W, 12, INK); r(1, roofH - 11, W - 2, 8, '#c9c4b8'); r(1, roofH - 11, W - 2, 1, '#e8e4da');
  r(W / 2 - 22, roofH - 22, 44, 12, INK); r(W / 2 - 21, roofH - 21, 42, 10, wall.dark);
  for (const tx of [26, W - 60]) { r(tx, roofH - 28, 22, 18, INK); r(tx + 1, roofH - 27, 20, 16, '#4b5560'); r(tx + 1, roofH - 27, 4, 16, '#7c8792'); }
  return canvas;
}

/** Dãy nhà trường học 24 ô: hai tầng, tường vàng, mái ngói, tháp giữa có cột cờ. */
export function schoolBuildingTexture(): HTMLCanvasElement {
  const W = 24 * 32;
  const H = 150;
  const { canvas, r } = surface(W, H);
  const wall = { main: '#f1d98a', light: '#fbeab0', dark: '#cfb25e', trim: '#a58a38' };
  r(2, H - 5, W - 4, 4, '#26190e44');
  r(4, 30, W - 8, H - 36, INK); r(5, 30, W - 10, H - 37, wall.main); r(5, 30, 4, H - 37, wall.light); r(W - 14, 30, 9, H - 37, wall.dark);
  r(5, 30 + 56, W - 10, 4, INK); r(5, 30 + 57, W - 10, 2, wall.light);
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 16; i++) {
      const x = 22 + i * 46;
      if (x > W / 2 - 40 && x < W / 2 + 22) continue;
      drawWindow(r, x, 30 + 12 + f * 58, 22, 22, wall, '#2e7dbf');
    }
  }
  // Tháp giữa
  r(W / 2 - 44, 4, 88, H - 10, INK); r(W / 2 - 43, 5, 86, H - 11, '#f6e29c'); r(W / 2 - 43, 5, 4, H - 11, wall.light); r(W / 2 + 36, 5, 7, H - 11, wall.dark);
  r(W / 2 - 52, 0, 104, 10, INK); r(W / 2 - 51, 1, 102, 8, '#b8402e'); r(W / 2 - 51, 1, 102, 2, '#d9654d');
  r(W / 2 - 14, 18, 28, 28, INK); r(W / 2 - 12, 20, 24, 24, '#ffffff'); r(W / 2 - 1, 22, 2, 11, INK); r(W / 2 - 1, 31, 8, 2, INK); // đồng hồ
  r(W / 2 - 38, 52, 76, 22, INK); r(W / 2 - 36, 54, 72, 18, '#2e7dbf'); // bảng tên (chữ vẽ bằng Text ở scene)
  for (let f = 0; f < 2; f++) for (const dx of [-36, 20]) drawWindow(r, W / 2 + dx, 82 + f * 28 - 6, 16, 16, wall, null);
  // Cửa chính
  r(W / 2 - 22, H - 46, 44, 42, INK); r(W / 2 - 20, H - 44, 40, 40, '#7fb3d6'); r(W / 2, H - 44, 1, 40, INK); r(W / 2 - 20, H - 44, 40, 4, '#a9d3ea');
  r(W / 2 - 28, H - 52, 56, 8, INK); r(W / 2 - 27, H - 51, 54, 6, '#b8402e');
  // Mái hai cánh
  for (const x0 of [4, W / 2 + 52]) {
    const w = W / 2 - 56 - (x0 === 4 ? 0 : 4);
    for (let i = 0; i < 26; i++) { r(x0 + (26 - i) * 0.4, 6 + i, w - (26 - i) * 0.8, 1, i % 3 === 0 ? '#7f3427' : (i % 2 ? '#a8483a' : '#c9694e')); }
    r(x0, 30, w, 2, INK);
  }
  // Băng-rôn
  r(30, 60, 120, 14, INK); r(31, 61, 118, 12, '#c0392b'); for (let x = 36; x < 144; x += 8) r(x, 65, 4, 3, '#ffe9a8');
  return canvas;
}

export function schoolGateTexture(): HTMLCanvasElement {
  const W = 4 * 32 + 40;
  const H = 64;
  const { canvas, r } = surface(W, H);
  r(0, H - 4, W, 3, '#26190e44');
  for (const x of [0, W - 22]) { r(x, 8, 22, H - 12, INK); r(x + 1, 9, 20, H - 14, '#d9d2c0'); r(x + 1, 9, 3, H - 14, '#f4efe4'); r(x - 2, 4, 26, 8, INK); r(x - 1, 5, 24, 6, '#b8402e'); }
  r(22, 2, W - 44, 14, INK); r(23, 3, W - 46, 12, '#2e7dbf'); // cổng vòm bảng tên
  r(22, 26, W - 44, 36, '#00000000');
  for (let x = 24; x < W - 24; x += 5) { r(x, 28, 2, 34, INK); r(x, 28, 1, 34, '#9aa0a6'); }
  r(22, 36, W - 44, 2, INK); r(22, 52, W - 44, 2, INK);
  return canvas;
}

export function benchTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(32, 22);
  r(2, 17, 28, 3, '#26190e44');
  r(3, 8, 26, 3, INK); r(4, 9, 24, 1, '#c89b5c'); r(3, 12, 26, 3, INK); r(4, 13, 24, 1, '#b98a4b');
  r(4, 4, 24, 3, INK); r(5, 5, 22, 1, '#c89b5c');
  for (const x of [5, 23]) { r(x, 11, 3, 8, INK); r(x, 3, 3, 8, INK); }
  return canvas;
}

export function pavilionTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(112, 88);
  r(10, 80, 92, 6, '#26190e44');
  for (const x of [14, 92]) { r(x, 30, 6, 52, INK); r(x + 1, 30, 4, 50, '#b98a4b'); r(x + 1, 30, 1, 50, '#d6b27a'); }
  for (let i = 0; i < 28; i++) { const inset = Math.floor((28 - i) * 1.6); r(inset, i + 2, 112 - inset * 2, 1, i === 0 ? INK : (i % 3 === 0 ? '#7f3427' : (i % 2 ? '#a8453a' : '#c9694e'))); }
  r(0, 30, 112, 3, INK); r(0, 31, 112, 1, '#d9654d'); r(0, 33, 112, 2, '#26190e66');
  r(14, 62, 84, 3, INK); r(15, 63, 82, 1, '#c89b5c'); // ghế dài trong chòi
  return canvas;
}

export function busStopTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(96, 60);
  r(4, 54, 88, 4, '#26190e44');
  for (const x of [8, 84]) { r(x, 12, 4, 44, INK); r(x + 1, 12, 2, 42, '#4a6a5a'); }
  r(4, 6, 88, 8, INK); r(5, 7, 86, 6, '#2e7dbf'); r(5, 7, 86, 2, '#5fa8d9');
  r(12, 14, 72, 30, '#7fb3d633'); r(12, 14, 1, 30, INK); r(83, 14, 1, 30, INK);
  r(16, 38, 64, 3, INK); r(17, 39, 62, 1, '#c89b5c');
  r(40, 20, 16, 10, '#f4f4f4'); r(42, 22, 12, 6, '#2e7dbf');
  return canvas;
}

export function playgroundTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(160, 100);
  r(8, 90, 144, 6, '#26190e44');
  // cầu trượt
  r(10, 20, 44, 6, INK); r(11, 21, 42, 4, '#e9c46a');
  for (let i = 0; i < 36; i++) { r(54 + i, 22 + i, 8, 4, INK); r(55 + i, 23 + i, 6, 2, '#e8527a'); }
  r(10, 20, 4, 70, INK); r(11, 20, 2, 68, '#2e7dbf'); r(48, 20, 4, 70, INK); r(49, 20, 2, 68, '#2e7dbf');
  // xích đu
  r(100, 18, 54, 4, INK); r(101, 19, 52, 2, '#c89b5c'); r(104, 18, 4, 72, INK); r(146, 18, 4, 72, INK);
  for (const x of [114, 132]) { r(x, 22, 1, 44, INK); r(x + 10, 22, 1, 44, INK); r(x - 1, 64, 13, 4, INK); r(x, 65, 11, 2, '#e8527a'); }
  return canvas;
}

export function bushTexture(v: number): HTMLCanvasElement {
  const { canvas, r } = surface(36, 26);
  r(3, 20, 30, 4, '#26190e44');
  const g = [['#3F8434', '#62A442', '#98CC6E'], ['#4A8A3A', '#72AE50', '#A8D880'], ['#37722E', '#5C9C40', '#8CC264']][v % 3];
  for (const [x, y, w, h] of [[2, 8, 14, 13], [10, 3, 16, 17], [20, 8, 14, 13]] as const) { r(x - 1, y - 1, w + 2, h + 2, INK); r(x, y, w, h, g[0]); r(x + 1, y + 1, w - 5, h - 6, g[1]); r(x + 2, y + 2, 3, 2, g[2]); }
  return canvas;
}

export function roundTreeTexture(v: number): HTMLCanvasElement {
  const { canvas, r } = surface(56, 72);
  r(10, 62, 36, 6, '#26190e44');
  r(24, 36, 8, 30, INK); r(25, 36, 6, 29, '#6e4125'); r(25, 36, 2, 29, '#99623c');
  const g = [['#3F8434', '#62A442', '#98CC6E'], ['#4A8A3A', '#78B456', '#A8D880'], ['#2F7A52', '#4F9F72', '#86CCA0']][v % 3];
  for (const [x, y, w, h] of [[2, 18, 30, 24], [22, 16, 32, 26], [10, 2, 38, 28], [4, 28, 24, 18], [30, 28, 24, 18]] as const) { r(x - 1, y - 1, w + 2, h + 2, INK); r(x, y, w, h, g[0]); r(x + 2, y + 2, w - 9, h - 10, g[1]); r(x + 4, y + 3, 6, 3, g[2]); }
  return canvas;
}

export function palmTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(44, 84);
  r(10, 76, 24, 5, '#26190e44');
  r(20, 26, 5, 52, INK); r(21, 26, 3, 51, '#a8825a'); for (let y = 30; y < 76; y += 6) r(21, y, 3, 1, '#7a5c3a');
  for (const [x, y, w, h] of [[0, 14, 22, 5], [22, 14, 22, 5], [6, 6, 16, 5], [22, 6, 16, 5], [14, 0, 16, 6], [2, 22, 18, 4], [24, 22, 18, 4]] as const) { r(x - 1, y - 1, w + 2, h + 2, INK); r(x, y, w, h, '#3f8f3a'); r(x, y, w, 1, '#79c67f'); }
  return canvas;
}

export function flowerbedTexture(v: number): HTMLCanvasElement {
  const { canvas, r } = surface(64, 26);
  r(2, 21, 60, 4, '#26190e44');
  r(1, 8, 62, 14, INK); r(2, 9, 60, 12, '#6b4a2f'); r(2, 9, 60, 2, '#8a6a47');
  const cols = [['#e8527a', '#f4a3bd', '#ffd1e0'], ['#f4c430', '#ffe48a', '#fff3b0'], ['#8e5bd6', '#c3a3ef', '#ffffff']][v % 3];
  for (let x = 4; x < 60; x += 5) for (let y = 3; y < 17; y += 5) { const h = hash(x, y, v); r(x, y + 3, 1, 5, '#468A38'); r(x - 1, y, 3, 3, cols[h % 3]); r(x, y + 1, 1, 1, '#ffffff'); }
  return canvas;
}

export function hedgeTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(32, 20);
  r(0, 15, 32, 4, '#26190e44');
  r(0, 4, 32, 13, INK); r(1, 5, 30, 11, '#3F8434'); r(1, 5, 30, 3, '#62A442'); for (let x = 3; x < 30; x += 6) r(x, 9, 3, 2, '#1f4d29');
  return canvas;
}

export function binTexture(): HTMLCanvasElement {
  const { canvas, r } = surface(16, 22);
  r(1, 18, 14, 3, '#26190e44'); r(2, 4, 12, 15, INK); r(3, 5, 10, 13, '#2e7d4f'); r(3, 5, 3, 13, '#4fa070'); r(1, 2, 14, 4, INK); r(2, 3, 12, 2, '#3a9060');
  return canvas;
}

export function potTexture(v: number): HTMLCanvasElement {
  const { canvas, r } = surface(12, 16);
  drawPot(r, 1, 0, v);
  return canvas;
}

/** Dải đồi núi xa (3 lớp) rộng 2400 px: cột đồi 8 px, viền tối nhẹ, vệt sáng ở sườn đón nắng. */
export function hillsTexture(layer: number): HTMLCanvasElement {
  const W = 2400;
  const H = 200;
  const { canvas, r } = surface(W, H);
  const pal = [
    { fill: '#8aa3a6', hi: '#a4bbbc', lo: '#738d92' }, // xa nhất: xanh xám nhạt
    { fill: '#6f9578', hi: '#8ab392', lo: '#587d62' },
    { fill: '#55805a', hi: '#6fa072', lo: '#436a49' }, // gần nhất: xanh lá đậm
  ][layer] ?? { fill: '#6f9578', hi: '#8ab392', lo: '#587d62' };
  const amp = [130, 100, 70][layer] ?? 100;
  for (let x = 0; x < W; x += 8) {
    const t = x / W;
    const h = 36 + amp * (0.5 + 0.5 * Math.sin(t * Math.PI * (5 + layer * 2) + layer * 1.3)) * (0.7 + 0.3 * Math.sin(t * Math.PI * 17 + layer)) + (hash(x >> 3, layer) % 5) * 2;
    const top = Math.round((H - h) / 4) * 4;
    r(x, top, 8, H - top, pal.fill);
    r(x, top, 8, 4, pal.hi);
    for (let y = top + 8; y < H; y += 12) if ((hash(x >> 3, y, layer) % 5) === 0) r(x, y, 8, 3, pal.lo);
  }
  return canvas;
}

/** Quầng sáng đèn đường: vòng đồng tâm theo bậc (giữ chất pixel), dùng với hòa trộn cộng. */
export function glowTexture(): HTMLCanvasElement {
  const S = 96;
  const { canvas, r } = surface(S, S);
  const alphas = ['#ffd98a1f', '#ffd98a38', '#ffd98a52', '#ffe9a88a'];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
    const d = Math.hypot(x - S / 2, (y - S / 2) * 1.15) / (S / 2);
    if (d >= 1) continue;
    r(x, y, 2, 2, alphas[d < 0.22 ? 3 : d < 0.45 ? 2 : d < 0.72 ? 1 : 0]);
  }
  return canvas;
}

/** Mây pixel nhiều búi, đáy phẳng, bóng xanh nhạt phía dưới (không viền cứng, giữ chất mây). */
export function cloudTexture(v: number): HTMLCanvasElement {
  const W = 168, H = 64;
  const { canvas, ctx, r } = surface(W, H);
  const sets: Array<Array<[number, number, number]>> = [
    [[30, 38, 16], [56, 28, 22], [84, 32, 20], [110, 38, 16], [66, 40, 18]],
    [[24, 40, 14], [48, 30, 18], [76, 22, 20], [104, 32, 18], [130, 40, 14], [80, 40, 18]],
    [[36, 38, 18], [64, 30, 24], [96, 36, 20], [124, 40, 14], [80, 40, 22]],
  ];
  const bumps = sets[v % sets.length];
  const disc = (cx: number, cy: number, rad: number, c: string) => {
    for (let y = -rad; y <= rad; y++) { const w = Math.floor(Math.sqrt(rad * rad - y * y)); r(cx - w, cy + y, w * 2, 1, c); }
  };
  for (const [cx, cy, rad] of bumps) disc(cx, cy + 3, rad, '#cfdceb'); // bóng dưới
  for (const [cx, cy, rad] of bumps) disc(cx, cy, rad, '#f7fbff');
  for (const [cx, cy, rad] of bumps) disc(cx - 3, cy - Math.floor(rad / 3), Math.floor(rad / 2), '#ffffff'); // vệt sáng
  ctx.clearRect(0, 49, W, H - 49); // đáy phẳng: cắt phần dưới y=49
  return canvas;
}

export function birdTexture(v: number): HTMLCanvasElement {
  const { canvas, r } = surface(9, 5);
  if (v === 0) { r(0, 2, 3, 1, INK); r(3, 3, 3, 1, INK); r(6, 2, 3, 1, INK); r(2, 1, 1, 1, INK); r(6, 1, 1, 1, INK); }
  else { r(0, 1, 3, 1, INK); r(3, 2, 3, 1, INK); r(6, 1, 3, 1, INK); r(2, 2, 1, 1, INK); r(6, 2, 1, 1, INK); }
  return canvas;
}

/** Điểm vào: trả canvas cho khóa `nb_*` hoặc null nếu không phải khóa khu phố. */
export function createNeighborhoodTexture(key: string): HTMLCanvasElement | null {
  if (!key.startsWith('nb_')) return null;
  let m = /^nb_(house|shop)_(\d+)_(\d)_(\d+)(_y)?$/.exec(key);
  if (m) return houseTexture(m[1] as 'house' | 'shop', Number(m[2]), Number(m[3]), Number(m[4]), Boolean(m[5]));
  m = /^nb_apartment_(\d+)$/.exec(key);
  if (m) return apartmentTexture(Number(m[1]));
  m = /^nb_(bush|tree_round|flowerbed|pot|hills|bird|cloud)_(\d+)$/.exec(key);
  if (m) {
    const v = Number(m[2]);
    switch (m[1]) {
      case 'bush': return bushTexture(v);
      case 'tree_round': return roundTreeTexture(v);
      case 'flowerbed': return flowerbedTexture(v);
      case 'pot': return potTexture(v);
      case 'hills': return hillsTexture(v);
      case 'bird': return birdTexture(v);
      case 'cloud': return cloudTexture(v);
    }
  }
  switch (key) {
    case 'nb_school_building': return schoolBuildingTexture();
    case 'nb_school_gate': return schoolGateTexture();
    case 'nb_bench': return benchTexture();
    case 'nb_pavilion': return pavilionTexture();
    case 'nb_bus_stop': return busStopTexture();
    case 'nb_playground': return playgroundTexture();
    case 'nb_palm': return palmTexture();
    case 'nb_hedge': return hedgeTexture();
    case 'nb_bin': return binTexture();
    case 'nb_glow': return glowTexture();
  }
  return null;
}

/** Cửa sổ sáng đèn ban đêm của một nhà (tọa độ so với góc trên-trái texture): dùng để vẽ ánh đèn cộng khi trời tối. */
export function houseLitWindows(variant: number, floors: number, wTiles: number): Array<{ x: number; y: number; w: number; h: number }> {
  const W = wTiles * 32;
  const FH = 44;
  const roofType = Math.floor(variant / 8) % 3;
  const roofH = roofType === 2 ? 32 : 26;
  const seed = hash(variant, floors, wTiles);
  const windowsPerFloor = Math.max(2, Math.floor((W - 24) / 52) + 1);
  const slotW = (W - 12) / windowsPerFloor;
  const doorFirst = (seed & 1) === 0;
  const out: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let f = 0; f < floors; f++) for (let i = 0; i < windowsPerFloor; i++) {
    const ground = f === floors - 1;
    const isDoorSlot = ground && (doorFirst ? i === 0 : i === windowsPerFloor - 1);
    if (isDoorSlot) continue;
    out.push({ x: 6 + slotW * i + slotW / 2 - 7, y: roofH + f * FH + 8, w: 14, h: 20 });
  }
  return out;
}
