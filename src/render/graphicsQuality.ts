/**
 * Mức đồ họa Thấp / Vừa / Cao (+ Tự động): cấu hình tập trung một chỗ, nhận diện máy yếu ngay
 * lúc mở game, và bộ tự hạ nhiều tầng theo FPS (độ nét → bóng → đám đông → đồ trang trí).
 * Thuần logic, không đụng three/DOM ngoài các hàm đọc máy có try/catch — test chạy được trong node.
 * Lựa chọn lưu riêng từng máy (localStorage), không nằm trong save hay state chung của hẻm online.
 */

export type GfxLevel = 'low' | 'medium' | 'high';
export type GfxChoice = 'auto' | GfxLevel;

export interface GfxPreset {
  /** Độ nét tối đa / tối thiểu (pixel ratio) mà bộ tự hạ được chạy trong mức này. */
  maxPixelRatio: number;
  minPixelRatio: number;
  /** Bóng nắng (tắt thì không vẽ shadow pass — tiết kiệm nhất trên card yếu). */
  shadows: boolean;
  shadowMapSize: number;
  /** Số nhân vật NPC hiện cùng lúc (gần camera trước); còn lại vẫn chạy logic, chỉ không vẽ. */
  npcCap: number;
  /** NPC xa hơn bao nhiêu mét thì cử động thưa (mỗi 3 khung một lần) để đỡ CPU. */
  animFarDist: number;
  /** Đồ trang trí thường ngày (chậu cây, ghế...). Đồ sự kiện (chợ phiên, sửa đường, lễ hội) luôn hiện. */
  decor: boolean;
  /** Hạt mưa / mây / sao — đọc một lần lúc dựng cảnh. */
  rainDrops: number;
  clouds: number;
  stars: number;
  /** Số nguồn sáng thật cho đèn đường gần camera. */
  lightPool: number;
}

export const GFX_PRESETS: Record<GfxLevel, GfxPreset> = {
  low: { maxPixelRatio: 1, minPixelRatio: 0.75, shadows: false, shadowMapSize: 512, npcCap: 12, animFarDist: 12, decor: false, rainDrops: 1200, clouds: 6, stars: 120, lightPool: 3 },
  medium: { maxPixelRatio: 1.5, minPixelRatio: 1, shadows: true, shadowMapSize: 1024, npcCap: 24, animFarDist: 20, decor: true, rainDrops: 2500, clouds: 10, stars: 200, lightPool: 5 },
  high: { maxPixelRatio: 2, minPixelRatio: 1, shadows: true, shadowMapSize: 2048, npcCap: 999, animFarDist: 40, decor: true, rainDrops: 5000, clouds: 14, stars: 280, lightPool: 8 },
};

/**
 * Ngưỡng FPS của bộ tự hạ. Mục tiêu sàn cho mọi máy là ≥30 FPS ở mức Thấp (luật hiệu năng trong
 * promt_game.md); bộ tự hạ cố giữ ≥45 trước khi người chơi kịp thấy khựng.
 */
export const GFX_TARGET = { floorFps: 30, downFps: 45, upFps: 57, sampleSec: 2, upStreak: 3 };

export const GFX_LABEL: Record<GfxChoice, string> = { auto: 'Tự động', low: 'Thấp', medium: 'Vừa', high: 'Cao' };
export const GFX_CYCLE: GfxChoice[] = ['auto', 'low', 'medium', 'high'];

const ORDER: GfxLevel[] = ['high', 'medium', 'low'];

export interface DeviceHints {
  cores?: number;
  memoryGb?: number;
  /** Tên card đồ họa (WEBGL_debug_renderer_info), có thể rỗng nếu trình duyệt giấu. */
  gpu?: string;
  /** Màn hình cảm ứng (điện thoại / máy tính bảng). */
  coarse: boolean;
}

/** Card onboard đời cũ / phần mềm giả lập / GPU điện thoại tầm thấp. */
const WEAK_GPU = /swiftshader|llvmpipe|software|microsoft basic|intel\(r\) (hd|uhd) graphics|intel.*(hd|uhd) graphics|mali-[gt]?[1-5]\d|adreno \(tm\) [1-5]\d\d|adreno [1-5]\d\d|powervr/i;
/** Card onboard đời mới đủ cho mức Vừa. */
const MID_GPU = /iris|radeon\(tm\) graphics|radeon graphics|vega \d|adreno.*[6-7]\d\d|mali-g7\d|apple gpu/i;

/** Đoán mức khởi đầu từ thông tin máy — sai thì bộ tự hạ chỉnh tiếp trong vài giây đầu. */
export function detectLevel(h: DeviceHints): GfxLevel {
  const gpu = h.gpu ?? '';
  if (WEAK_GPU.test(gpu)) return 'low';
  if ((h.cores !== undefined && h.cores <= 2) || (h.memoryGb !== undefined && h.memoryGb <= 2)) return 'low';
  if (h.coarse) {
    // Điện thoại: chỉ máy nhiều RAM + nhiều nhân mới lên Vừa
    return (h.memoryGb ?? 4) >= 6 && (h.cores ?? 4) >= 6 ? 'medium' : 'low';
  }
  if ((h.cores !== undefined && h.cores <= 4) || (h.memoryGb !== undefined && h.memoryGb <= 4)) return 'medium';
  if (MID_GPU.test(gpu)) return 'medium';
  return 'high';
}

/** Đọc thông tin máy thật (trình duyệt). Lỗi gì cũng trả về hints rỗng an toàn. */
export function readDeviceHints(): DeviceHints {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as Navigator & { deviceMemory?: number };
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* không có WebGL / bị chặn */ }
  let coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch { /* môi trường không có matchMedia */ }
  return { cores: nav.hardwareConcurrency || undefined, memoryGb: nav.deviceMemory, gpu, coarse };
}

const STORE_KEY = 'gfx';

export function parseChoice(v: string | null | undefined): GfxChoice | null {
  return v === 'auto' || v === 'low' || v === 'medium' || v === 'high' ? v : null;
}

/** Lựa chọn của người chơi: `?gfx=low` (nhớ cho lần sau) > đã lưu > Tự động. */
export function loadChoice(): GfxChoice {
  try {
    const pick = parseChoice(new URLSearchParams(location.search).get('gfx'));
    if (pick) localStorage.setItem(STORE_KEY, pick);
    return pick ?? parseChoice(localStorage.getItem(STORE_KEY)) ?? 'auto';
  } catch {
    return 'auto';
  }
}

export function saveChoice(c: GfxChoice) {
  try { localStorage.setItem(STORE_KEY, c); } catch { /* ẩn danh */ }
}

export interface GfxStep { level: GfxLevel; pixelRatio: number }

/**
 * Thang các bậc từ đẹp nhất xuống nhẹ nhất. Tự động: đi qua mọi mức từ `start` xuống Thấp
 * (hết độ nét của mức này mới sang mức dưới — tức là mới tắt bóng, bớt NPC, ẩn đồ trang trí).
 * Người chơi chọn cố định một mức: chỉ co giãn độ nét trong mức đó, không tự đổi mức.
 */
export function buildLadder(start: GfxLevel, nativeDpr: number, auto: boolean): GfxStep[] {
  const levels = auto ? ORDER.slice(ORDER.indexOf(start)) : [start];
  const steps: GfxStep[] = [];
  for (const level of levels) {
    const p = GFX_PRESETS[level];
    const top = Math.min(nativeDpr, p.maxPixelRatio);
    const ratios = [...new Set([top, 1.5, 1.25, 1, 0.75].filter((r) => r <= top + 0.01 && r >= p.minPixelRatio - 0.01))].sort((a, b) => b - a);
    // DPR < min (zoom trang < 100%) lọc hết bậc → thang rỗng, step undefined; giữ ít nhất một bậc.
    if (!ratios.length) ratios.push(top);
    for (const pixelRatio of ratios) steps.push({ level, pixelRatio });
  }
  return steps;
}

/**
 * Bộ tự hạ: đo FPS mỗi `sampleSec` giây, tụt dưới `downFps` thì xuống một bậc, ổn trên `upFps`
 * đủ `upStreak` lần liền thì lên lại một bậc (không vượt bậc khởi đầu).
 */
export class QualityGovernor {
  private idx = 0;
  private elapsed = 0;
  private frames = 0;
  private goodStreak = 0;
  /** FPS trung bình trượt — để ghi nhật ký hiệu năng của máy. */
  avgFps = 60;
  readonly ladder: GfxStep[];

  constructor(start: GfxLevel, nativeDpr: number, readonly auto: boolean) {
    this.ladder = buildLadder(start, nativeDpr, auto);
  }

  get step(): GfxStep { return this.ladder[this.idx]; }
  get preset(): GfxPreset { return GFX_PRESETS[this.step.level]; }

  /** Trả về true khi bậc vừa đổi (người gọi áp lại cấu hình). */
  update(dt: number): boolean {
    this.elapsed += dt;
    this.frames++;
    if (this.elapsed < GFX_TARGET.sampleSec) return false;
    const fps = this.frames / this.elapsed;
    this.avgFps = this.avgFps * 0.8 + fps * 0.2;
    this.elapsed = 0;
    this.frames = 0;
    if (fps < GFX_TARGET.downFps && this.idx < this.ladder.length - 1) {
      this.idx++;
      this.goodStreak = 0;
      return true;
    }
    if (fps > GFX_TARGET.upFps && this.idx > 0 && ++this.goodStreak >= GFX_TARGET.upStreak) {
      this.idx--;
      this.goodStreak = 0;
      return true;
    }
    if (fps <= GFX_TARGET.upFps) this.goodStreak = 0;
    return false;
  }
}

/** Nhật ký hiệu năng riêng máy: FPS trung bình + mức đang dùng của 7 ngày chơi gần nhất. */
export interface PerfEntry { day: number; fps: number; level: GfxLevel }
const LOG_KEY = 'gfx-perf';

export function recordPerf(entry: PerfEntry, prev: PerfEntry[] = readPerfLog()): PerfEntry[] {
  const next = [...prev.filter((e) => e.day !== entry.day), { ...entry, fps: Math.round(entry.fps) }].slice(-7);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch { /* ẩn danh */ }
  return next;
}

export function readPerfLog(): PerfEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Cầu nối nhỏ giữa nút "Đồ họa" trên HUD và vòng render ở main.tsx: HUD đổi lựa chọn, main áp
 * lại bộ tự hạ và báo ngược mức đang chạy. Chỉ là tuỳ chọn riêng máy (LOCAL_ONLY ở hẻm online).
 */
const live = { choice: 'auto' as GfxChoice, level: 'high' as GfxLevel, fps: 60 };
let onChoice: ((c: GfxChoice) => void) | null = null;

export function gfxStatus(): Readonly<typeof live> { return live; }
export function reportGfx(choice: GfxChoice, level: GfxLevel, fps: number) {
  live.choice = choice;
  live.level = level;
  live.fps = fps;
}
export function onGfxChoice(fn: (c: GfxChoice) => void) { onChoice = fn; }
export function setGfxChoice(c: GfxChoice) {
  saveChoice(c);
  live.choice = c;
  onChoice?.(c);
}
