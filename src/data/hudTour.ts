// ─────────────────────────────────────────────────────────────────────────────
// GĐ1503 — Tour HUD khoanh vùng (sau hướng dẫn ngày đầu): dim + ô sáng khoanh
// từng element trên thanh HUD, bấm ĐÚNG ô được khoanh mới đi tiếp (tham khảo
// tour HUD sau tutorial của khu eat-in — dạy đọc bảng điều khiển top-bar bằng vài
// lần bấm, rẻ hơn bảng thống kê và không đụng kinh tế/save ngoài cờ "đã xem").
// ─────────────────────────────────────────────────────────────────────────────

export interface HudTourStep {
  /** CSS selector neo ô sáng (element phải tồn tại trong HUD). */
  sel: string;
  /** Lời dạy ngắn ≤90 ký tự (ngân sách thông báo). */
  text: string;
  /** Vị trí hộp lời dạy so với ô sáng. */
  tip: 'below' | 'above';
}

export const HUD_TOUR_STEPS: readonly HudTourStep[] = [
  { sel: '.hud-money', tip: 'below', text: '💰 Tiền của tiệm — nhập hàng, thuê người, mở rộng đều trừ vào đây' },
  { sel: '.hud-time', tip: 'below', text: '🕒 Giờ & ngày — khách đông theo giờ; giờ vàng hiện ngay dưới đồng hồ' },
  { sel: '.hud-dock', tip: 'above', text: '🧰 Cột công cụ: Nhập hàng, Kho, Sổ đầu ngày, Xây dựng — bấm để mở bảng' },
] as const;

/** Đã đi hết tour chưa (chỉ số bước chạy khỏi danh sách). */
export const tourFinished = (index: number) => index >= HUD_TOUR_STEPS.length;
