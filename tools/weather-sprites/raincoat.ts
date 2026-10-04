import {
  CHARACTER_FRAME, RAINCOAT_POSES, RAINCOAT_WIND_FRAMES, WEATHER_SPRITE_DIRS, raincoatFrameName,
  type RaincoatPose, type RaincoatWindState, type WeatherSpriteDir, type WindLean,
} from '../../packages/game-data/src/weather-sprite-layout';
import { Img, hex, shade, type Rgba } from './image';
import type { SheetFrame } from './umbrella';

export const RAINCOAT_BASE: Record<string, string> = { yellow: '#E5B93C', blue: '#3F6FB5', green: '#3F9A5E', orange: '#E07A32', red: '#C4423A' };

const OUTLINE = hex('#281810');

interface Pose { breathe: number; stride: number; sw: number }

function poseOf(p: RaincoatPose): Pose {
  if (p === 'idle0') return { breathe: 0, stride: 0, sw: 0 };
  if (p === 'idle1') return { breathe: 1, stride: 0, sw: 0 };
  const f = Number(p.slice(4));
  return { breathe: 0, stride: [0, 2, 0, -2][f], sw: [0, 3, 0, -3][f] };
}

interface Wind {
  sign: number;
  /** Độ bay của vạt dưới (px ở mép dưới). */
  hem: number;
  /** Đuôi mũ (px). */
  tail: number;
  /** Cổ tay áo phía khuất gió bay (px). */
  cuff: number;
}
const CALM: Wind = { sign: 0, hem: 0, tail: 0, cuff: 0 };

interface Pal { base: Rgba; dark: Rgba; light: Rgba; hl: Rgba }

/** Vẽ áo mưa hướng down, up hoặc right (hướng trái là lật gương hướng phải, giống nhân vật gốc). */
function drawCoat(dir: 'down' | 'up' | 'right', pose: Pose, wind: Wind, walkHem: number, pal: Pal): Img {
  const img = new Img(CHARACTER_FRAME.w, CHARACTER_FRAME.h);
  const { base, dark, light, hl } = pal;
  const b = pose.breathe;
  const R = (x: number, y: number, w: number, h: number, c: Rgba) => img.rect(x, y, w, h, c);
  const P = (x: number, y: number, c: Rgba) => img.set(x, y, c);
  const side = dir === 'right';
  const lx = side ? 9 : 8; // mép trái thân áo
  const rx = side ? 22 : 23; // mép phải thân áo
  const top = 22 - b;
  const hemTop = 34;
  const hemRows = [hemTop, hemTop + 1, hemTop + 2, hemTop + 3];

  // Thân áo
  R(lx, top, rx - lx + 1, hemTop - top, base);
  R(lx, top, 1, hemTop - top, OUTLINE); R(rx, top, 1, hemTop - top, OUTLINE);
  R(lx + 1, top, 2, hemTop - top, light);
  R(rx - 2, top, 2, hemTop - top, dark);
  if (dir === 'down') {
    R(15, top + 2, 1, hemTop - top - 2, OUTLINE); R(16, top + 2, 1, hemTop - top - 2, light); // khóa kéo
    R(11, 30, 3, 1, dark); R(18, 30, 3, 1, dark); // miệng túi
    P(13, top + 4, hl); P(19, 31, hl);
  } else if (dir === 'up') {
    R(15, top + 1, 1, hemTop - top - 1, dark);
    R(lx + 1, 26, rx - lx - 1, 1, dark); // đường cầu vai
    P(12, 29, hl); P(19, 32, hl);
  } else {
    R(rx - 2, top + 2, 1, hemTop - top - 2, OUTLINE); // khóa kéo phía trước
    R(lx + 2, 30, 3, 1, dark);
    P(12, top + 4, hl);
  }
  // Vạt dưới: nghiêng theo gió, nhún nhẹ khi đi; mỗi hàng dịch nguyên khối.
  hemRows.forEach((y, i) => {
    const k = i / (hemRows.length - 1);
    const dx = Math.round(wind.sign * wind.hem * k) + Math.round(walkHem * k);
    const grow = i === 0 ? 0 : 1;
    const x0 = lx - grow + dx; const x1 = rx + grow + dx;
    const last = i === hemRows.length - 1;
    R(x0, y, x1 - x0 + 1, 1, last ? OUTLINE : i === hemRows.length - 2 ? dark : base);
    if (!last) { P(x0, y, OUTLINE); P(x1, y, OUTLINE); }
    if (i === 0) P(x0 + 1, y, light);
  });
  // Tay áo theo tay nhân vật; cổ tay phía khuất gió bay ra.
  const sleeve = (x0: number, y0: number, w: number, cuffDx: number) => {
    R(x0, y0, w, 9, base); R(x0, y0, 1, 9, OUTLINE); R(x0 + w - 1, y0, 1, 9, OUTLINE);
    R(x0 + 1, y0, 1, 7, light); R(x0, y0 + 7, w, 1, dark);
    if (cuffDx) R(x0 + cuffDx, y0 + 7, w, 1, dark);
    R(x0, y0 + 8, w, 1, OUTLINE);
  };
  if (side) {
    sleeve(12 - pose.sw, 23, 5, wind.sign * wind.cuff);
  } else {
    const sl = Math.round(pose.stride / 2);
    sleeve(5, 23 + sl, 4, wind.sign < 0 ? -wind.cuff : 0);
    sleeve(23, 23 - sl, 4, wind.sign > 0 ? wind.cuff : 0);
  }
  // Cổ áo và vai
  R(lx - 1, top - 1, rx - lx + 3, 3, base); R(lx - 1, top - 1, rx - lx + 3, 1, OUTLINE);
  R(lx, top, rx - lx + 1, 1, light);
  R(lx - 1, top - 1, 1, 3, OUTLINE); R(rx + 1, top - 1, 1, 3, OUTLINE);
  if (dir !== 'up') R(10, top, 12, 1, OUTLINE); // bóng cằm dưới mặt
  // Mũ trùm
  const t = 2 - b;
  R(10, t, 12, 1, OUTLINE);
  R(8, t + 1, 16, 1, OUTLINE); R(9, t + 1, 14, 1, light);
  R(7, t + 2, 18, 6, base); R(7, t + 2, 1, 6, OUTLINE); R(24, t + 2, 1, 6, OUTLINE);
  R(8, t + 2, 4, 2, light); R(20, t + 4, 4, 4, dark);
  P(11, t + 2, hl); P(12, t + 3, hl);
  if (dir === 'up') {
    R(7, t + 8, 18, 12, base); R(7, t + 8, 1, 12, OUTLINE); R(24, t + 8, 1, 12, OUTLINE);
    R(8, t + 8, 3, 12, light); R(21, t + 8, 3, 12, dark);
    R(9, t + 20, 14, 1, OUTLINE); R(15, t + 3, 2, 17, dark);
    P(12, t + 9, hl);
  } else if (dir === 'down') {
    R(7, t + 8, 3, 11, base); R(7, t + 8, 1, 11, OUTLINE); R(8, t + 8, 1, 11, light); // viền mũ bên trái mặt
    R(22, t + 8, 3, 11, dark); R(24, t + 8, 1, 11, OUTLINE);
    R(10, t + 7, 12, 1, OUTLINE); R(10, t + 6, 12, 1, dark); // mép mũ trên trán
    R(9, t + 18, 2, 2, OUTLINE); R(21, t + 18, 2, 2, OUTLINE);
  } else {
    R(7, t + 8, 4, 12, base); R(7, t + 8, 1, 12, OUTLINE); R(8, t + 8, 1, 12, light); // lưng mũ
    R(11, t + 8, 1, 12, dark);
    R(22, t + 8, 3, 3, dark); R(24, t + 8, 1, 3, OUTLINE);
    R(10, t + 7, 14, 1, OUTLINE); R(10, t + 6, 14, 1, dark);
    R(8, t + 20, 3, 1, OUTLINE);
  }
  // Đuôi mũ bay khi gió mạnh (nối liền mép mũ, không rời)
  if (wind.tail && wind.sign) {
    const sgn = wind.sign;
    const ex = sgn > 0 ? 24 : 7;
    for (let i = 1; i <= wind.tail; i++) {
      const yy = t + 3 + (i > 1 ? 1 : 0);
      P(ex + sgn * i, yy - 1, OUTLINE);
      P(ex + sgn * i, yy, i === wind.tail ? OUTLINE : base);
    }
  }
  return img;
}

function palette(base: Rgba): Pal {
  return { base, dark: shade(base, 0.7), light: shade(base, 1.2), hl: shade(base, 1.6) };
}

function windFor(state: 'idle' | 'walk' | RaincoatWindState, phase: number, lean: WindLean | '-'): Wind {
  const sign = lean === 'R' ? 1 : lean === 'L' ? -1 : 0;
  if (state === 'wind_light') return { sign, hem: [1, 2][phase], tail: 0, cuff: 0 };
  if (state === 'wind_strong') return { sign, hem: [3, 5, 4][phase], tail: [1, 3, 2][phase], cuff: [1, 2, 1][phase] };
  return CALM;
}

export function raincoatFrame(dir: WeatherSpriteDir, pose: RaincoatPose, state: 'idle' | 'walk' | RaincoatWindState, lean: WindLean | '-', phase: number, base: Rgba): Img {
  const p = poseOf(pose);
  const w = windFor(state, phase, lean);
  const walkHem = state === 'walk' ? [0, 1, 0, -1][Number(pose.slice(4))] : 0;
  const pal = palette(base);
  // Hướng trái là hướng phải lật gương: đảo dấu gió/nhún vạt trước khi lật để lean vẫn tính theo màn hình.
  if (dir === 'left') return drawCoat('right', p, { ...w, sign: -w.sign }, -walkHem, pal).mirrored();
  return drawCoat(dir, p, w, walkHem, pal);
}

export function raincoatSheetFrames(color: string): { rows: SheetFrame[][] } {
  const base = hex(RAINCOAT_BASE[color]);
  const rows: SheetFrame[][] = [];
  for (const dir of WEATHER_SPRITE_DIRS) {
    for (const pose of RAINCOAT_POSES) {
      const state = pose.startsWith('idle') ? 'idle' : 'walk';
      rows.push([{ name: raincoatFrameName(dir, state, '-', pose, 0), img: raincoatFrame(dir, pose, state, '-', 0, base) }]);
    }
    for (const state of ['wind_light', 'wind_strong'] as RaincoatWindState[]) {
      for (const lean of ['L', 'R'] as WindLean[]) {
        for (const pose of RAINCOAT_POSES) {
          const row: SheetFrame[] = [];
          for (let i = 0; i < RAINCOAT_WIND_FRAMES[state]; i++) row.push({ name: raincoatFrameName(dir, state, lean, pose, i), img: raincoatFrame(dir, pose, state, lean, i, base) });
          rows.push(row);
        }
      }
    }
  }
  return { rows };
}
