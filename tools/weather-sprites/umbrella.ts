import {
  UMBRELLA_ATTACHMENT, UMBRELLA_CANOPY_DX, UMBRELLA_FRAME, UMBRELLA_HEAD_MASK_Y, UMBRELLA_STATES, UMBRELLA_WALK_HAND, WEATHER_SPRITE_DIRS,
  umbrellaFrameName, type UmbrellaSpriteState, type WeatherSpriteDir, type WindLean,
} from '../../packages/game-data/src/weather-sprite-layout';
import { Img, hex, shade, type Rgba } from './image';

export const UMBRELLA_BASE: Record<string, string> = { blue: '#3F72B8', red: '#C8453A', yellow: '#E2B33A', green: '#3E9A62', purple: '#7C5AA6' };

const OUTLINE = hex('#281810');
const POLE_DARK = hex('#4A3828');
const POLE_LIGHT = hex('#7A5E45');
const GRIP = hex('#B07840');
const HALF_WIDTH = [3, 7, 10, 12, 14, 15, 16, 16];
const ROWS = HALF_WIDTH.length;

interface Pose {
  /** Độ mở vòm 0..1. */
  open: number;
  /** Vòm nhấp theo nhịp thở đầu (px, âm = lên). */
  canopyDy: number;
  /** Cán đi theo tay khi bước. */
  hand: { dx: number; dy: number };
  /** Độ nghiêng (px ngang cho mỗi px cao tính từ điểm nắm), dấu theo `lean`. */
  slope: number;
  /** Mép đón gió nâng lên bao nhiêu px. */
  lift: number;
}

function canopy(dir: WeatherSpriteDir, pose: Pose, base: Rgba): Img {
  const { w, h, gripX } = UMBRELLA_FRAME;
  const img = new Img(w, h);
  const f = pose.open;
  const centre = Math.round(gripX + UMBRELLA_CANOPY_DX[dir] * f);
  const rim = 24 + Math.round((1 - f) * 10) + pose.canopyDy;
  const dark = shade(base, 0.72);
  const light = shade(base, 1.22);
  const rib = shade(base, 0.82);
  const hl = shade(base, 1.65);
  const mask = new Set<number>();
  const hws: number[] = [];
  const key = (x: number, y: number) => y * w + x;
  for (let i = 0; i < ROWS; i++) {
    const hw = Math.max(1, Math.round(HALF_WIDTH[i] * f));
    hws.push(hw);
    const y = rim - ROWS + i;
    for (let x = centre - hw; x <= centre + hw; x++) mask.add(key(x, y));
  }
  const rimHw = hws[ROWS - 1];
  for (let x = centre - rimHw; x <= centre + rimHw; x++) mask.add(key(x, rim));
  const has = (x: number, y: number) => mask.has(key(x, y));
  for (let i = 0; i < ROWS; i++) {
    const y = rim - ROWS + i;
    const hw = hws[i];
    for (let x = centre - hw; x <= centre + hw; x++) {
      const t = hw > 0 ? (x - centre) / hw : 0;
      let c: Rgba = t < -0.45 ? light : t > 0.4 ? dark : base;
      if (i >= 1 && f > 0.5) for (const r of [-0.5, 0, 0.5]) if (x === centre + Math.round(r * hw) && i > 1) c = rib;
      img.set(x, y, c);
    }
  }
  // Mép dưới lượn sóng: các múi 4 px, đầu mỗi múi có viền.
  for (let x = centre - rimHw; x <= centre + rimHw; x++) {
    const k = (x - (centre - rimHw)) % 4;
    img.set(x, rim, k === 3 ? OUTLINE : dark);
  }
  // Viền ngoài: điểm nằm sát ngoài hình (trừ mép dưới đã có múi) và hai đầu mép.
  for (const k of mask) {
    const x = k % w; const y = Math.floor(k / w);
    if (y === rim) { if (x === centre - rimHw || x === centre + rimHw) img.set(x, y, OUTLINE); continue; }
    if (!has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1)) img.set(x, y, OUTLINE);
    else if (y === rim - 1 && !has(x, y + 1)) img.set(x, y, OUTLINE);
  }
  // Đầu mút trên.
  img.set(centre, rim - ROWS - 1, OUTLINE); img.set(centre, rim - ROWS - 2, POLE_LIGHT);
  // Vệt sáng ướt.
  if (f > 0.5) { img.set(centre - 6, rim - ROWS + 3, hl); img.set(centre - 5, rim - ROWS + 3, hl); img.set(centre - 8, rim - ROWS + 5, hl); img.set(centre + 6, rim - ROWS + 4, light); }
  return img;
}

function pole(dir: WeatherSpriteDir, pose: Pose): Img {
  const { w, h, gripX, gripY } = UMBRELLA_FRAME;
  const img = new Img(w, h);
  const rim = 24 + Math.round((1 - pose.open) * 10) + pose.canopyDy;
  // Điểm cán ló ra khỏi vòm: lệch về điểm nắm theo độ mở (đóng thì vòm gập sát cán).
  const sideView = dir === 'left' || dir === 'right';
  const att = UMBRELLA_ATTACHMENT[dir];
  const yChar = (frameY: number) => frameY - gripY + att.y;
  const bottom = gripY - 4 + pose.hand.dy;
  const swing0 = 39;
  for (let y = rim + 1; y <= bottom; y++) {
    if (sideView && yChar(y) >= UMBRELLA_HEAD_MASK_Y.top && yChar(y) <= UMBRELLA_HEAD_MASK_Y.bottom) continue;
    const dx = y > swing0 ? Math.round(pose.hand.dx * Math.min(1, (y - swing0) / Math.max(1, bottom - swing0))) : 0;
    img.set(gripX + dx, y, POLE_DARK);
    img.set(gripX + dx + 1, y, POLE_LIGHT);
  }
  // Tay cầm gỗ.
  const gx = gripX + pose.hand.dx; const gy = gripY + pose.hand.dy;
  img.rect(gx - 1, gy - 3, 4, 4, OUTLINE);
  img.rect(gx, gy - 2, 2, 2, GRIP);
  return img;
}

/** Cắt nghiêng: hàng càng cao so với điểm nắm càng lệch ngang (mỗi hàng dịch nguyên khối, giữ cạnh sắc). */
function shear(src: Img, slope: number, sign: number): Img {
  const out = new Img(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    const dx = Math.round(slope * sign * (UMBRELLA_FRAME.gripY - y));
    for (let x = 0; x < src.w; x++) { const c = src.get(x, y); if (c[3]) out.set(x + dx, y, c); }
  }
  return out;
}

/** Mép đón gió nâng lên, mép khuất gió hạ nhẹ (dịch nguyên cột). */
function lift(src: Img, centre: number, amount: number, sign: number): Img {
  if (!amount) return src;
  const out = new Img(src.w, src.h);
  for (let x = 0; x < src.w; x++) {
    const rel = (x - centre) / 16;
    const windward = sign > 0 ? Math.max(0, -rel) : Math.max(0, rel);
    const leeward = sign > 0 ? Math.max(0, rel) : Math.max(0, -rel);
    const dy = -Math.round(amount * windward) + Math.round(amount * 0.4 * leeward);
    for (let y = 0; y < src.h; y++) { const c = src.get(x, y); if (c[3]) out.set(x, y + dy, c); }
  }
  return out;
}

export function umbrellaFrame(dir: WeatherSpriteDir, state: UmbrellaSpriteState, lean: WindLean | '-', i: number, base: Rgba): Img {
  const hand0 = { dx: 0, dy: 0 };
  let pose: Pose = { open: 1, canopyDy: 0, hand: hand0, slope: 0, lift: 0 };
  switch (state) {
    case 'closed': pose = { ...pose, open: 0.12 }; break;
    case 'opening': pose = { ...pose, open: [0.35, 0.7, 0.9][i] }; break;
    case 'open_idle': pose = { ...pose, canopyDy: -i }; break;
    case 'open_walk': pose = { ...pose, hand: UMBRELLA_WALK_HAND[dir][i] }; break;
    case 'wind_light': pose = { ...pose, slope: [0.05, 0.09, 0.06, 0.1][i], canopyDy: [0, -1, 0, -1][i] }; break;
    case 'wind_strong': pose = { ...pose, slope: [0.2, 0.28, 0.22, 0.32, 0.25][i], lift: [3, 4, 3, 5, 4][i], canopyDy: [0, -1, -1, 0, -2][i] }; break;
  }
  const sign = lean === 'R' ? 1 : lean === 'L' ? -1 : 0;
  const centre = Math.round(UMBRELLA_FRAME.gripX + UMBRELLA_CANOPY_DX[dir] * pose.open);
  let c = canopy(dir, pose, base);
  let p = pole(dir, pose);
  if (sign) { c = lift(c, centre, pose.lift, sign); c = shear(c, pose.slope, sign); p = shear(p, pose.slope, sign); }
  const out = new Img(UMBRELLA_FRAME.w, UMBRELLA_FRAME.h);
  out.blit(p, 0, 0);
  out.blit(c, 0, 0);
  return out;
}

export interface SheetFrame { name: string; img: Img }

/** Mọi khung ô của một màu theo thứ tự cố định; hàng = (hướng, trạng thái, nghiêng), cột = số khung. */
export function umbrellaSheetFrames(color: string): { rows: SheetFrame[][] } {
  const base = hex(UMBRELLA_BASE[color]);
  const rows: SheetFrame[][] = [];
  for (const dir of WEATHER_SPRITE_DIRS) {
    for (const [state, spec] of Object.entries(UMBRELLA_STATES) as [UmbrellaSpriteState, { frames: number; leans: boolean }][]) {
      for (const lean of (spec.leans ? ['L', 'R'] : ['-']) as Array<WindLean | '-'>) {
        const row: SheetFrame[] = [];
        for (let i = 0; i < spec.frames; i++) row.push({ name: umbrellaFrameName(dir, state, lean, i), img: umbrellaFrame(dir, state, lean, i, base) });
        rows.push(row);
      }
    }
  }
  return { rows };
}
