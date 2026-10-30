/**
 * GĐ297 — `game.layoutAudit()`: soi phần tử bị CẮT ở mép màn hình.
 *
 * Vì sao cần: kiểm tra "0 tràn ngang" của dự án so `scrollWidth == clientWidth`, nhưng `html/body`
 * đang `overflow: hidden` nên một nút tràn ra ngoài bị CẮT MẤT mà vẫn báo 0 tràn. GĐ297 tìm ra đúng
 * lỗ này: ở 320px cột HUD góc phải bị cap `max-width: calc(100% - 200px)` (120px) trong khi 3 chip
 * cần ~134px → chip tài khoản (42px) lòi ra 6px ngoài màn hình, chỉ còn một mẩu "C" bấm được.
 *
 * Dùng trong QA mỗi giai đoạn (đọc kết quả bằng CHỮ, không cần chụp ảnh):
 *   game.layoutAudit()   // cỡ màn hiện tại → { viewportWidth, scrollOverflow, clipped: [] }
 * Đổi cỡ màn bằng công cụ giả lập thiết bị / setViewport rồi gọi lại. Kết quả rỗng = đạt.
 */

export interface ClippedControl {
  tag: string;
  cls: string;
  text: string;
  /** Cạnh phải/vị trí vượt khung nhìn bao nhiêu px (dương = lòi ra phải, âm = lòi ra trái). */
  overBy: number;
}

export interface LayoutAuditResult {
  viewportWidth: number;
  /** Tràn ngang thật (scrollWidth − clientWidth) — chỉ bắt được khi html/body KHÔNG overflow:hidden. */
  scrollOverflow: number;
  /** Phần tử tương tác lòi ra ngoài mép trái/phải → bị cắt, khó bấm. */
  clipped: ClippedControl[];
}

/** Những thứ người chơi phải bấm được: nút, chip HUD, ô nhập. Panel cuộn dọc thì bỏ qua. */
const SELECTOR = '#ui button, #ui [role="button"], #ui .hud-chip, #ui input, #ui select, #ui textarea';

export function layoutAudit(): LayoutAuditResult {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const clipped: ClippedControl[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))) {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue; // ẩn/không chiếm chỗ → bỏ
    const over = Math.round(Math.max(r.right - vw, -r.left)); // lòi phải hoặc lòi trái
    if (over <= 0.5) continue;
    clipped.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 40),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      overBy: over,
    });
  }
  return { viewportWidth: vw, scrollOverflow: de.scrollWidth - de.clientWidth, clipped };
}
