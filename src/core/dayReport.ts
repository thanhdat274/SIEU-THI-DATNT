// ============================================================================
// Data: BÁO CÁO NGÀY ẨN DANH (SPEC-TOI-UU §T1, lát L1 — BẢN CỤC BỘ)
// ----------------------------------------------------------------------------
// Mục tiêu: trả lời "người chơi mất bao lâu tới cấp nào, rời sau chuyện gì, mở bảng nào"
// mà KHÔNG thu thập gì nhạy cảm. Mỗi NGÀY GAME đã chốt → một bản ghi nhỏ (~0,5 KB) gom tại
// endDay. L1 chưa gửi đi đâu: chỉ lưu 30 bản CỤC BỘ trong localStorage, người chơi thử tự
// xuất file JSON (nút ⋯ → "Xuất nhật ký chơi thử") gửi qua tin nhắn. Không có server.
//
// KHÔNG lưu: tên, email, uid, tên tiệm, toạ độ, nội dung gõ, số tiền thật (chỉ dải).
// `install` là id ngẫu nhiên sinh trên máy, KHÔNG gắn tài khoản.
// THUẦN ĐỌC với state: buildReport chỉ đọc, không set state, không RNG, không đụng save.
// ============================================================================

import type { DayStats } from './dayStats';
import type { GameState } from './gameTypes';
import { faintMinutes } from '../data/biz';

export type GfxLevel = 'low' | 'medium' | 'high';
export type DeviceKind = 'phone' | 'tablet' | 'desktop';

export interface DayReport {
  v: 1;
  /** Id ngẫu nhiên sinh trên máy — KHÔNG phải uid, không gắn tài khoản. */
  install: string;
  /** Phiên bản game (import.meta.env.MODE). */
  build: string;
  day: number;
  level: number;
  prestige: number;
  mode: 'solo' | 'alley';
  /** Giây thật đã chơi trong ngày game này (chỉ khi tab hiện). */
  realSec: number;
  /** Số lần mở game trong ngày game này. */
  sessions: number;
  /** Dải tiền, không gửi số thật: âm / <1tr / <10tr / <100tr / hơn. */
  moneyBand: 0 | 1 | 2 | 3 | 4;
  customers: number;
  unhappy: number;
  /** Khách bỏ về vì chờ quầy quá lâu. */
  walkouts: number;
  fainted: boolean;
  shortfall: boolean;
  inspectFail: boolean;
  /** Số lần mở từng bảng trong ngày (bọc openPanel). */
  panels: Record<string, number>;
  /** Hệ có thao tác trong ngày. */
  used: string[];
  /** Số mục mới mở khi lên cấp trong ngày. */
  unlockedToday: number;
  fps: number;
  gfx: GfxLevel;
  device: DeviceKind;
}

// ── Khoá localStorage ──────────────────────────────────────────────────────
const INSTALL_KEY = 'th.install';
const ACC_KEY = 'th.tacc';       // tích luỹ của ngày game ĐANG diễn ra
const REPORTS_KEY = 'th.reports'; // 30 bản gần nhất
export const REPORTS_MAX = 30;

/** Id cài đặt ngẫu nhiên, sinh một lần rồi giữ. */
export function installId(): string {
  try {
    let v = localStorage.getItem(INSTALL_KEY);
    if (!v) {
      v = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(INSTALL_KEY, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

/** Nhận diện loại máy thô — chỉ cho biết xu hướng FPS, không nhận diện thiết bị cá nhân. */
export function deviceKind(): DeviceKind {
  try {
    const w = window.innerWidth;
    const touch = (navigator.maxTouchPoints ?? 0) > 0;
    if (touch && w < 700) return 'phone';
    if (touch && w < 1200) return 'tablet';
    return 'desktop';
  } catch {
    return 'desktop';
  }
}

// ── Bộ tích luỹ ngày game ──────────────────────────────────────────────────
interface TeleAcc {
  day: number;
  sessions: number;
  realSec: number;
  panels: Record<string, number>;
  used: string[];
  unlockedToday: number;
}

const freshAcc = (day: number): TeleAcc =>
  ({ day, sessions: 1, realSec: 0, panels: {}, used: [], unlockedToday: 0 });

let acc: TeleAcc = freshAcc(-1);
let liveFps = 0;
let liveGfx: GfxLevel = 'low';
let pendingReal = 0;
/** Chế độ chơi — do UI (main.tsx) đặt từ net/coop, để core này KHÔNG import net (tránh kéo firebase vào test node). */
let mode: DayReport['mode'] = 'solo';

function readAcc(): TeleAcc | null {
  try {
    const r = localStorage.getItem(ACC_KEY);
    if (!r) return null;
    const a = JSON.parse(r);
    return (a && typeof a.day === 'number' && typeof a.sessions === 'number') ? a as TeleAcc : null;
  } catch {
    return null;
  }
}
function saveAcc(): void {
  try { localStorage.setItem(ACC_KEY, JSON.stringify(acc)); } catch { /* bỏ qua */ }
}

/** Sang ngày game mới (cuối endDay): bắt đầu tích luỹ mới, không đổi số đo FPS/dồ hoạ. */
export function startDay(day: number): void {
  acc = freshAcc(day);
  pendingReal = 0;
  saveAcc();
}

/** Gọi MỘT lần lúc mở game (boot). Mở lại cùng một ngày game → tăng `sessions`
 *  (đếm số lần mở trong ngày đó); sang ngày khác thì bắt đầu tích luỹ mới. */
export function openSession(day: number, fps: number, gfx: GfxLevel): void {
  liveFps = fps; liveGfx = gfx;
  const stored = readAcc();
  if (stored && stored.day === day) {
    acc = stored;
    acc.sessions += 1;
  } else {
    acc = freshAcc(day);
  }
  saveAcc();
}

/** Cộng giây thật chơi (chỉ gọi khi tab đang hiện). Flush gộp để đỡ ghi localStorage. */
export function noteRealSec(sec: number): void {
  if (!(sec > 0)) return;
  acc.realSec += sec;
  pendingReal += sec;
  if (pendingReal >= 5) { saveAcc(); pendingReal = 0; }
}

/** Ghi mức đo trực tiếp mỗi khung hình (rẻ, không lưu trừ khi đã có thay đổi). */
export function noteLiveFps(v: number): void { liveFps = v; }
export function noteLiveGfx(l: GfxLevel): void { liveGfx = l; }

/** Chế độ chơi ('solo'|'alley') — UI set khi biết có đang ở hẻm online không. */
export function setMode(m: DayReport['mode']): void { mode = m; }

/** Đếm số lần mở bảng trong ngày — bọc tại openPanel (một chỗ duy nhất). */
export function countPanel(type: string): void {
  if (!type) return;
  acc.panels[type] = (acc.panels[type] ?? 0) + 1;
  saveAcc();
}

/** Đánh dấu một hệ đã có thao tác trong ngày. */
export function noteUsed(system: string): void {
  if (!acc.used.includes(system)) { acc.used.push(system); saveAcc(); }
}

/** Số mục mới mở khi lên cấp trong ngày — nối tại addXp (slices/progress.ts). */
export function noteUnlocked(n: number): void {
  if (n > 0) { acc.unlockedToday += n; saveAcc(); }
}

/** Bảng `used` suy từ DayStats (ít lệch khỏi thực tế, đúng các trường seasonEvent đang đọc). */
function usedFromStats(s: GameState, stats: DayStats): string[] {
  const u: string[] = [];
  if ((stats.cookOrders ?? 0) > 0) u.push('cook');
  if ((stats.onlineDone ?? 0) > 0 || (stats.online ?? 0) > 0) u.push('online');
  if ((stats.farmHarvest ?? 0) > 0) u.push('garden');
  if ((stats.combos ?? 0) > 0) u.push('combo');
  if ((stats.services ?? 0) > 0) u.push('services');
  if ((stats.tips ?? 0) > 0) u.push('dine');
  if ((stats.gifts ?? 0) > 0) u.push('regulars');
  if ((stats.socialPosts ?? 0) > 0) u.push('social');
  if ((stats.clawWins ?? 0) > 0) u.push('claw');
  if (s.branch) u.push('branch');
  if (s.biz.quanNuocLast?.day === s.day) u.push('quan_nuoc');
  return u;
}

const moneyBandOf = (money: number): DayReport['moneyBand'] =>
  money < 0 ? 0 : money < 1e6 ? 1 : money < 1e7 ? 2 : money < 1e8 ? 3 : 4;

/** Dựng bản ghi ngày từ state + DayStats + bộ tích luỹ. THUẦN: không đổi gì, để test được. */
export function buildReport(
  s: GameState,
  stats: DayStats,
  tele: TeleAcc,
  arg: { mode: 'solo' | 'alley'; install: string; build: string; fps: number; gfx: GfxLevel; device: DeviceKind },
): DayReport {
  const used = new Set<string>([...usedFromStats(s, stats), ...tele.used]);
  return {
    v: 1,
    install: arg.install,
    build: arg.build,
    day: s.day,
    level: s.level,
    prestige: s.biz.prestige.level,
    mode: arg.mode,
    realSec: Math.round(tele.realSec),
    sessions: tele.sessions,
    moneyBand: moneyBandOf(s.money),
    customers: stats.customers,
    unhappy: stats.unhappy,
    walkouts: stats.missed?.wait ?? 0,
    fainted: s.minutes >= faintMinutes(s.biz.breakfastDay === s.day),
    shortfall: (stats.shortfall ?? 0) > 0,
    inspectFail: s.inspection.lastDay === s.day && s.inspection.lastPass === false,
    panels: { ...tele.panels },
    used: [...used],
    unlockedToday: tele.unlockedToday,
    fps: Math.round(arg.fps),
    gfx: arg.gfx,
    device: arg.device,
  };
}

function pushReport(r: DayReport): void {
  try {
    const list = readReports();
    list.push(r);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(-REPORTS_MAX)));
  } catch { /* bỏ qua */ }
}

/** Gom ngày đang đóng (gọi cuối endDay, trước khi set ngày mới): lưu 30 bản rồi reset tích luỹ. */
export function collectReport(s: GameState, stats: DayStats): DayReport {
  const report = buildReport(s, stats, acc, {
    mode,
    install: installId(),
    build: (import.meta.env?.MODE as string) ?? 'dev',
    fps: liveFps,
    gfx: liveGfx,
    device: deviceKind(),
  });
  pushReport(report);
  acc = freshAcc(-1);
  pendingReal = 0;
  saveAcc();
  return report;
}

/** 30 bản ghi cục bộ gần nhất (đã cắt theo REPORTS_MAX). */
export function readReports(): DayReport[] {
  try {
    const r = localStorage.getItem(REPORTS_KEY);
    return r ? JSON.parse(r) as DayReport[] : [];
  } catch {
    return [];
  }
}

/** JSON đẹp cho nút "Xuất nhật ký chơi thử" / game.report(). */
export function exportReportsJson(): string {
  return JSON.stringify(readReports(), null, 2);
}

/** Xoá toàn bộ báo cáo cục bộ (và tích luỹ hiện tại) — nút đặt lại. */
export function clearReports(): void {
  try { localStorage.removeItem(REPORTS_KEY); localStorage.removeItem(ACC_KEY); } catch { /* bỏ qua */ }
  acc = freshAcc(-1);
}
