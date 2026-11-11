// ============================================================================
// Đo hiệu năng trong game (SPEC-TOI-UU §T2, lát L1) — lớp phủ ?perf=1 / game.perf(true)
// ----------------------------------------------------------------------------
// Chỉ bật bằng URL `?perf=1` hoặc `game.perf(true)` từ console. Khi bật, vòng render
// (main.tsx) đẩy thời gian khung mỗi frame và mỗi giây chụp một `PerfSnapshot`; lớp phủ
// (`ui/PerfOverlay.tsx`) đọc store này để hiện, kèm nút "Ghi 30 giây" xuất một dòng JSON.
// Phần đo thô (renderer.info, số nhân vật, instanced mesh) chỉ tính khi `perfOn()` đúng,
// nên không tốn chi phí khi tắt. KHÔNG đổi state game, không đụng save/coopGuard.
// ============================================================================

import { create } from 'zustand';

export interface FrameTimes { p50: number; p95: number; worst: number }

export interface PerfSnapshot {
  /** FPS gần đúng (1 / p50). */
  fps: number;
  frameMs: FrameTimes;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** Số nhân vật đang sống trong khung (khách + nhân viên...). */
  npc: number;
  /** Số InstancedMesh đang được tạo cho hàng hoá (shelfInstancer). */
  instancedMeshes: number;
  /** Bộ nhớ JS (MB, chỉ khi browser hỗ trợ performance.memory — Chrome). */
  jsMemory: number;
  /** Số lần Hud React vẽ lại trong giây vừa rồi. */
  hudRedraws: number;
  /** Mức đồ hoạ + bậc độ nét đang chạy (QualityGovernor). */
  gfx: string;
  pixelRatio: number;
}

interface PerfStore { on: boolean; snap: PerfSnapshot | null }
export const usePerf = create<PerfStore>(() => ({
  on: typeof location !== 'undefined' && new URLSearchParams(location.search).has('perf'),
  snap: null,
}));

export const setPerf = (on: boolean): void => usePerf.setState({ on });
export const perfOn = (): boolean => usePerf.getState().on;

// ── Bộ mẫu thời gian khung (cửa sổ trượt) ─────────────────────────────────
const MAX = 180;
const frames: number[] = [];
let worst = 0;

function q(p: number): number {
  if (!frames.length) return 0;
  const s = [...frames].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

/** Đẩy thời gian khung thật (ms) — gọi mỗi frame trong main.tsx; chỉ tốn khi bật. */
export function sampleFrame(ms: number): void {
  if (!perfOn()) return;
  frames.push(ms);
  if (frames.length > MAX) frames.shift();
  if (ms > worst) worst = ms;
}

export function frameTimes(): FrameTimes { return { p50: q(0.5), p95: q(0.95), worst }; }

// ── HUD vẽ lại ──────────────────────────────────────────────────────────────
let hudCount = 0;
/** Hud gọi mỗi lần render (chỉ đếm khi bật) — đo "vẽ lại bao nhiêu lần/giây". */
export function bumpHudRender(): void { if (perfOn()) hudCount++; }
/** Đọc và xoá bộ đếm — main.tsx gọi mỗi giây. */
export function takeHudRedraws(): number { const n = hudCount; hudCount = 0; return n; }

/** main.tsx mỗi giây chụp một snapshot tổng hợp; chỉ giữ khi đang bật. */
export function setSnapshot(s: PerfSnapshot): void {
  if (perfOn()) usePerf.setState({ snap: s });
}
