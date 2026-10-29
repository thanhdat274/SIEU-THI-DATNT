import { ROUTINE } from './gameTypes';

/**
 * Lịch tự động trong ngày: 7h ra tiệm, 8h mở cửa, 22h30 đóng cửa, 23h kiểm kê rồi về nhà.
 *
 * Phần quyết định ở đây là hàm thuần (không đụng tới 3D/người chơi) để test được: mỗi khung hình
 * main.tsx đưa ảnh chụp trạng thái vào, nhận về việc phải làm rồi mới điều khiển nhân vật.
 */

/** Ảnh chụp những gì lịch cần biết ở khung hình này. */
export interface RoutineSnapshot {
  day: number;
  minutes: number;
  autoRoutine: boolean;
  /** Giờ mở cửa do người chơi chỉnh (GĐ275, phút trong ngày); thiếu ở save cũ = 8h. */
  autoOpenAt?: number;
  /** Người chơi đang đứng trong tiệm (đúng chỗ mở cửa, tính tiền được). */
  atShop: boolean;
  shopOpen: boolean;
}

/** Mốc đã làm trong ngày — mỗi việc chỉ chạy một lần mỗi ngày. */
export interface RoutineMarks {
  /** Ngày đã cho nhân vật đi ra tiệm buổi sáng. */
  walkDay: number;
  /** Ngày đã mở cửa. */
  openDay: number;
  /** Ngày đã đóng cửa. */
  closeDay: number;
  /** Ngày đã kiểm kê và cho nhân vật về nhà. */
  homeDay: number;
}

export const newRoutineMarks = (): RoutineMarks => ({ walkDay: -1, openDay: -1, closeDay: -1, homeDay: -1 });

/** Việc lịch tự động cần làm ở khung hình này. */
export interface RoutineActions {
  /** Cho nhân vật tự đi bộ ra tiệm (7h). */
  walkToShop: boolean;
  /** Mở cửa tiệm (kèm đưa nhân vật tới quầy nếu chưa kịp tới). */
  openShop: boolean;
  /** Đóng cửa tiệm (22h30). */
  closeShop: boolean;
  /** Kiểm kê rồi cho nhân vật về nhà (23h). */
  goHome: boolean;
  /** Lần đầu chạm mốc kiểm kê trong ngày: hiện lời nhắn kiểm kê. */
  stocktake: boolean;
  /** Mốc mới sau khi làm xong các việc trên. */
  marks: RoutineMarks;
}

/**
 * Quyết định việc lịch tự động phải làm.
 *
 * Mốc giờ được xét theo *trạng thái* ("đã qua giờ chưa") chứ không chỉ "vừa vượt mốc đúng khung
 * hình này": tua nhanh 3×/8× một khung có thể nhảy qua mốc, đang mở bảng thì nhân vật chưa đi
 * được, vừa bật lịch giữa buổi tối hay vừa nạp bản lưu lúc 1h sáng — tất cả vẫn phải đóng cửa,
 * kiểm kê và về nhà y như khi chạy 1×.
 */
export function planRoutine(s: RoutineSnapshot, prev: RoutineMarks): RoutineActions {
  const marks = { ...prev };
  const out: RoutineActions = {
    walkToShop: false, openShop: false, closeShop: false, goHome: false, stocktake: false, marks,
  };
  if (!s.autoRoutine) return out;

  // GĐ275: giờ mở cửa theo người chơi (6h–8h); ra tiệm trước giờ mở 1 giờ để kịp bày/khoan nhập
  const openAt = s.autoOpenAt ?? ROUTINE.open;
  const walkAt = Math.max(5 * 60, openAt - 60);
  // Sáng: ra tiệm rồi mở cửa, chỉ trong khung giờ bán hàng (qua 22h30 thì thôi)
  const inSellingHours = s.minutes >= openAt && s.minutes < ROUTINE.close;
  if (s.minutes >= walkAt && s.minutes < ROUTINE.close && marks.walkDay !== s.day) {
    marks.walkDay = s.day;
    if (!s.atShop) out.walkToShop = true;
  }
  if (inSellingHours && marks.openDay !== s.day) {
    marks.openDay = s.day;
    out.openShop = true;
  }

  // Tối: đã qua giờ là làm — không phụ thuộc khung hình có rơi đúng mốc hay không
  if (s.minutes >= ROUTINE.close && marks.closeDay !== s.day) {
    marks.closeDay = s.day;
    out.closeShop = true;
  }
  if (s.minutes >= ROUTINE.goHome && marks.homeDay !== s.day) {
    marks.homeDay = s.day;
    out.goHome = true;
    out.stocktake = true;
  }
  return out;
}

// ───── GĐ276: dòng trạng thái lịch tự động trên Sổ đầu ngày ─────
// GĐ275 cho chỉnh giờ mở cửa — Sổ đầu ngày (mức lập kế hoạch sáng) phải phản chiếu lựa chọn đó:
// mở sớm thì khẳng định "đón trọn giờ vàng", mở 8h thì nhắc gently kèm chỗ chỉnh. Thuần đọc.

/** Dòng ghi chú lịch tự động cho Sổ đầu ngày; null khi lịch đang tắt (không nhiễu). */
export function autoOpenNote(autoOpenAt: number | undefined, autoRoutine: boolean): string | null {
  if (!autoRoutine) return null;
  const at = autoOpenAt ?? ROUTINE.open;
  return at < ROUTINE.open
    ? `⏰ Lịch tự động mở cửa ${Math.floor(at / 60)}h${at % 60 ? '30' : ''} — đón trọn giờ vàng sáng 6h–8h30.`
    : `⏰ Lịch tự động mở cửa 8h — lỡ nửa đầu giờ vàng sáng (chỉnh trong menu hồ sơ).`;
}
