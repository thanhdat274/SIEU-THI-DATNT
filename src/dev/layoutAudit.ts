/**
 * GĐ297 — `game.layoutAudit()`: soi phần tử bị CẮT ở mép màn hình.
 *
 * Vì sao cần: kiểm tra "0 tràn ngang" của dự án so `scrollWidth == clientWidth`, nhưng `html/body`
 * đang `overflow: hidden` nên một nút tràn ra ngoài bị CẮT MẤT mà vẫn báo 0 tràn. GĐ297 tìm ra đúng
 * lỗ này: ở 320px cột HUD góc phải bị cap `max-width: calc(100% - 200px)` (120px) trong khi 3 chip
 * cần ~134px → chip tài khoản (42px) lòi ra 6px ngoài màn hình, chỉ còn một mẩu "C" bấm được.
 *
 * GĐ298 — tách hai loại cho khỏi báo động giả: bảng giá / sơ đồ kệ đặt trong khung `overflow-x: auto`,
 * nút lòi ra khỏi MÀN nhưng vẫn với tới được bằng cách vuốt ngang → đó là `inScroller` (chỉ để biết),
 * KHÔNG phải `clipped`. Chỉ `clipped` (không có tổ tiên cuộn ngang nào) mới là lỗi thật.
 *
 * Dùng trong QA mỗi giai đoạn (đọc kết quả bằng CHỮ, không cần chụp ảnh):
 *   game.layoutAudit()   // cỡ màn hiện tại
 * Đổi cỡ màn bằng công cụ giả lập thiết bị / setViewport rồi gọi lại.
 * ĐẠT khi `clipped: []` và `scrollOverflow: 0`; `inScroller` khác rỗng là bình thường.
 */

export interface ClippedControl {
  tag: string;
  cls: string;
  text: string;
  /** Lòi ra ngoài khung nhìn bao nhiêu px (dương = lòi phải). */
  overBy: number;
}

export interface LayoutAuditResult {
  viewportWidth: number;
  /** Tràn ngang thật (scrollWidth − clientWidth) — chỉ bắt được khi html/body KHÔNG overflow:hidden. */
  scrollOverflow: number;
  /** Lỗi THẬT: phần tử tương tác lòi ra ngoài mà KHÔNG có khung cuộn ngang nào → không với tới được. */
  clipped: ClippedControl[];
  /** Chỉ để biết: lòi ra khỏi màn nhưng nằm trong khung cuộn ngang → vuốt là tới. */
  inScroller: ClippedControl[];
}

/** Những thứ người chơi phải bấm được. */
const SELECTOR = '#ui button, #ui [role="button"], #ui .hud-chip, #ui input, #ui select, #ui textarea';

/** Có tổ tiên cuộn ngang (overflow-x auto/scroll) không — tức là vuốt ngang tới được. */
function inHorizontalScroller(el: HTMLElement): boolean {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const ox = getComputedStyle(p).overflowX;
    if (ox === 'auto' || ox === 'scroll') return true;
    p = p.parentElement;
  }
  return false;
}

export function layoutAudit(): LayoutAuditResult {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const clipped: ClippedControl[] = [];
  const inScroller: ClippedControl[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))) {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue; // ẩn/không chiếm chỗ → bỏ
    const over = Math.round(Math.max(r.right - vw, -r.left)); // lòi phải hoặc lòi trái
    if (over <= 0.5) continue;
    const item: ClippedControl = {
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 40),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      overBy: over,
    };
    (inHorizontalScroller(el) ? inScroller : clipped).push(item);
  }
  return { viewportWidth: vw, scrollOverflow: de.scrollWidth - de.clientWidth, clipped, inScroller };
}
