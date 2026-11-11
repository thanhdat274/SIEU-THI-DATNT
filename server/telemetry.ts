/**
 * SPEC-TOI-UU §T1 (L3) — Lược đồ telemetry ẩn danh phía server.
 *
 * Logic thuần tách khỏi `index.ts` để test được (theo mẫu `room.ts`).
 * Chỉ nhận ĐÚNG lược đồ `DayReport`; thừa trường, sai kiểu, hay vượt trần
 * (giá trị vô lý theo cấp) thì BỎ CẢ BẢN GHI — không nhập vào kho.
 *
 * Mọi dữ liệu ẩn danh: `install` là id ngẫu nhiên sinh trên máy, KHÔNG ghép uid
 * (xem CHINH-SACH-BAO-MAT.md mục "Số liệu ẩn danh").
 */

export const TELEMETRY_TTL_DAYS = 180;
export const BATCH_MAX = 20;

export const GFX = ['low', 'medium', 'high'] as const;
export const DEVICE = ['phone', 'tablet', 'desktop'] as const;
export const MODE = ['solo', 'alley'] as const;
export type Gfx = typeof GFX[number];
export type Device = typeof DEVICE[number];
export type Mode = typeof MODE[number];

/** Trần chặn giá trị vô lý (người sửa bừa / lỗi) — vượt trần là bỏ cả bản. */
const CAP = {
  installLen: [8, 96] as [number, number],
  buildLen: 40,
  day: 200_000,
  level: 200,
  prestige: 300,
  realSec: 2_000_000,
  sessions: 500,
  customers: 200_000,
  unhappy: 200_000,
  walkouts: 200_000,
  panelsKeys: 150,
  usedLen: 150,
  unlockedToday: 2_000,
  fps: 240,
} as const;

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}
function isBool(b: unknown): b is boolean {
  return typeof b === 'boolean';
}
function isStr(s: unknown, maxLen: number): s is string {
  return typeof s === 'string' && s.length > 0 && s.length <= maxLen;
}

/** Kiểm một bản ghi thô (từ client) theo đúng lược đồ DayReport. Trả bản đã chuẩn hoá hoặc lý do loại. */
export function validateReport(raw: unknown): { ok: true; report: Record<string, unknown> } | { ok: false; reason: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, reason: 'not-object' };
  const r = raw as Record<string, unknown>;
  // Đúng lược đồ: mọi khoá phải thuộc danh sách biết trước, không chấp nhận khoá lạ (chặn nhét uid…).
  const allowed = ['v', 'install', 'build', 'day', 'level', 'prestige', 'mode', 'realSec', 'sessions',
    'moneyBand', 'customers', 'unhappy', 'walkouts', 'fainted', 'shortfall', 'inspectFail',
    'panels', 'used', 'unlockedToday', 'fps', 'gfx', 'device'];
  const extra = Object.keys(r).filter((k) => !allowed.includes(k));
  if (extra.length) return { ok: false, reason: `extra:${extra[0]}` };

  if (r.v !== 1) return { ok: false, reason: 'v' };
  if (!isStr(r.install, CAP.installLen[1]) || r.install.length < CAP.installLen[0] || !/^[a-z0-9_-]+$/.test(r.install)) return { ok: false, reason: 'install' };
  if (!isStr(r.build, CAP.buildLen)) return { ok: false, reason: 'build' };
  if (!isInt(r.day, 0, CAP.day)) return { ok: false, reason: 'day' };
  if (!isInt(r.level, 1, CAP.level)) return { ok: false, reason: 'level' };
  if (!isInt(r.prestige, 0, CAP.prestige)) return { ok: false, reason: 'prestige' };
  if (!MODE.includes(r.mode as Mode)) return { ok: false, reason: 'mode' };
  if (!isInt(r.realSec, 0, CAP.realSec)) return { ok: false, reason: 'realSec' };
  if (!isInt(r.sessions, 0, CAP.sessions)) return { ok: false, reason: 'sessions' };
  if (!isInt(r.moneyBand, 0, 4)) return { ok: false, reason: 'moneyBand' };
  if (!isInt(r.customers, 0, CAP.customers)) return { ok: false, reason: 'customers' };
  if (!isInt(r.unhappy, 0, CAP.customers)) return { ok: false, reason: 'unhappy' };
  if (!isInt(r.walkouts, 0, CAP.customers)) return { ok: false, reason: 'walkouts' };
  if (!isBool(r.fainted) || !isBool(r.shortfall) || !isBool(r.inspectFail)) return { ok: false, reason: 'flags' };
  if (!isInt(r.unlockedToday, 0, CAP.unlockedToday)) return { ok: false, reason: 'unlockedToday' };
  if (!isInt(r.fps, 0, CAP.fps)) return { ok: false, reason: 'fps' };
  if (!GFX.includes(r.gfx as Gfx)) return { ok: false, reason: 'gfx' };
  if (!DEVICE.includes(r.device as Device)) return { ok: false, reason: 'device' };

  // panels: object chuỗi → số nguyên, tối đa trần khoá.
  if (typeof r.panels !== 'object' || r.panels === null || Array.isArray(r.panels)) return { ok: false, reason: 'panels' };
  const panels = r.panels as Record<string, unknown>;
  const pKeys = Object.keys(panels);
  if (pKeys.length > CAP.panelsKeys) return { ok: false, reason: 'panels-cap' };
  if (pKeys.some((k) => !isStr(k, 40) || !isInt(panels[k], 0, 100_000))) return { ok: false, reason: 'panels-val' };

  // used: mảng chuỗi, tối đa trần.
  if (!Array.isArray(r.used)) return { ok: false, reason: 'used' };
  if (r.used.length > CAP.usedLen) return { ok: false, reason: 'used-cap' };
  if ((r.used as unknown[]).some((u) => !isStr(u, 40))) return { ok: false, reason: 'used-val' };

  return {
    ok: true,
    report: { v: 1, install: r.install, build: r.build, day: r.day, level: r.level, prestige: r.prestige,
      mode: r.mode, realSec: r.realSec, sessions: r.sessions, moneyBand: r.moneyBand, customers: r.customers,
      unhappy: r.unhappy, walkouts: r.walkouts, fainted: r.fainted, shortfall: r.shortfall, inspectFail: r.inspectFail,
      panels: panels, used: [...(r.used as string[])], unlockedToday: r.unlockedToday, fps: r.fps, gfx: r.gfx, device: r.device },
  };
}

/** Khoá giới hạn tần suất theo install + IP (không có uid). */
export function tBucketKey(install: string, ip: string): string {
  return `${install}:${ip}`;
}
