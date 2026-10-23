/**
 * Chế độ "Vào trong" kiểu cảnh riêng: máy trạng thái thuần (không biết Babylon). Viewport đọc `interiorView` mỗi khung hình
 * để vẽ lớp mờ chuyển cảnh, cô lập tòa khỏi thế giới ngoài, và đặt camera/ánh sáng trong nhà.
 *
 * Vào: mờ tối dần (nửa đầu), tới giữa thì cô lập tòa, rồi sáng dần (nửa sau) → `inside`. Ra là đảo ngược.
 * Hai chiều đối xứng quanh giữa chuyển cảnh nên đổi ý giữa chừng (vào rồi ra ngay) vẫn liên tục, không nhấp nháy.
 */
export type InteriorPhase = 'outside' | 'entering' | 'inside' | 'leaving';

/** Tổng thời gian một lần chuyển cảnh (giây): nửa tối dần + nửa sáng dần. */
export const INTERIOR_FADE_SECONDS = 0.5;

export interface InteriorModeState {
  phase: InteriorPhase;
  buildingId: string | null;
  /** Tiến độ chuyển cảnh 0..1 (chỉ có nghĩa khi `entering`/`leaving`). */
  progress: number;
  /** Người chơi đã từng ở trong chân diện tòa từ lúc vào (chỉ khi đó bước ra mới thoát). */
  seenInside: boolean;
}

export const INTERIOR_OUTSIDE: InteriorModeState = { phase: 'outside', buildingId: null, progress: 0, seenInside: false };

/** Vào tòa `buildingId`. Đang ở tòa khác hoặc đang vào thì giữ nguyên; đang ra thì đảo chiều giữa chừng. */
export function enterInterior(s: InteriorModeState, buildingId: string): InteriorModeState {
  if (s.phase === 'outside') return { phase: 'entering', buildingId, progress: 0, seenInside: false };
  if (s.phase === 'leaving' && s.buildingId === buildingId) return { ...s, phase: 'entering', progress: 1 - s.progress };
  return s;
}

/** Ra khỏi tòa. Đang ở ngoài hoặc đang ra thì giữ nguyên; đang vào thì đảo chiều giữa chừng. */
export function exitInterior(s: InteriorModeState): InteriorModeState {
  if (s.phase === 'inside') return { ...s, phase: 'leaving', progress: 0 };
  if (s.phase === 'entering') return { ...s, phase: 'leaving', progress: 1 - s.progress };
  return s;
}

/** Tiến thời gian `dt` giây; chuyển cảnh xong thì sang `inside` hoặc về `outside`. */
export function stepInteriorMode(s: InteriorModeState, dt: number): InteriorModeState {
  if (s.phase !== 'entering' && s.phase !== 'leaving') return s;
  const progress = s.progress + Math.max(0, dt) / INTERIOR_FADE_SECONDS;
  if (progress < 1) return { ...s, progress };
  return s.phase === 'entering' ? { ...s, phase: 'inside', progress: 0 } : { ...INTERIOR_OUTSIDE };
}

/**
 * Báo người chơi có đang trong chân diện tòa không. Lần đầu ở trong thì ghi nhớ; sau đó bước ra ngoài (khi đã `inside`) thì thoát.
 * Vào từ ngoài (người chơi chưa ở trong) không bị đá ra ngay.
 */
export function observePlayer(s: InteriorModeState, playerInside: boolean): InteriorModeState {
  if (s.phase !== 'entering' && s.phase !== 'inside') return s;
  if (playerInside) return s.seenInside ? s : { ...s, seenInside: true };
  return s.phase === 'inside' && s.seenInside ? exitInterior(s) : s;
}

export interface InteriorView {
  /** Độ đen của lớp mờ chuyển cảnh, 0..1 (đỉnh 1 ở giữa chuyển cảnh). */
  fade: number;
  /** Thế giới ngoài tòa đang bị ẩn (cô lập tòa). */
  isolated: boolean;
}

export function interiorView(s: InteriorModeState): InteriorView {
  if (s.phase === 'inside') return { fade: 0, isolated: true };
  if (s.phase === 'outside') return { fade: 0, isolated: false };
  const fade = 1 - Math.abs(2 * s.progress - 1);
  // Vào: cô lập từ giữa chuyển cảnh trở đi; ra: bỏ cô lập từ giữa chuyển cảnh trở đi.
  return { fade, isolated: s.phase === 'entering' ? s.progress >= 0.5 : s.progress < 0.5 };
}

/** Điểm (x, z) có nằm trong chân diện [x0, x1) × [z0, z1) không. */
export function insideFootprint(p: { x: number; z: number }, f: { x0: number; z0: number; x1: number; z1: number }): boolean {
  return p.x >= f.x0 && p.x < f.x1 && p.z >= f.z0 && p.z < f.z1;
}
