/**
 * Hệ 7-L6 — Cảm giác tay cho trò khéo tay (SPEC-CHIEU-RONG §7.8 L6): âm thanh + rung nhẹ.
 *
 * Gọi MỘT nơi (MiniHostView) mỗi lần điểm tăng trong lúc chơi → như thao tác thành công có
 * "tiếng kêu" + rung nhẹ, đồng thời cho cả bốn trò và trò thử, không phải sửa từng trò.
 *
 * Nhạc/tiếng đi qua `playSfx` (tôn trọng nút tắt tiếng); rung là `navigator.vibrate` khẽ và
 * giới hạn tần suất để máy yếu không bị dồn. Môi trường không có `navigator.vibrate` thì im.
 */
import { playSfx } from '../../core/audio';

let lastTick = 0;

/** Rung nhẹ (nếu máy hỗ trợ), bọc try/catch vì iOS/Safari có thể không có. */
function buzz(pattern: number[] | number) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* máy không cho rung */ }
}

/** tiếng "cạch" + rung khẽ mỗi lần xếp/xử lý có điểm (giới hạn ~80ms chống dồn). */
export function miniPlace(quiet = false) {
  const now = performance.now();
  if (now - lastTick < 80) return;
  lastTick = now;
  buzz(6);
  if (!quiet) playSfx('ding');
}

/** chớp nhẹ khi mở một món quà/lần chạm (không tiếng — chống nhiễu). */
export function miniTap() {
  const now = performance.now();
  if (now - lastTick < 60) return;
  lastTick = now;
  buzz(4);
}

/** Xong trò: rung dài hơn một nhịp + tiếng "leng keng" thưởng. */
export function miniReward() {
  buzz([14, 40, 14]);
  playSfx('gift');
}

/** Bỏ qua / kết thúc sớm: rung ngắn + không thưởng. */
export function miniSkip() {
  buzz(8);
  playSfx('ding');
}
