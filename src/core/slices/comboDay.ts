/**
 * Theo dõi hiệu quả combo THEO NGÀY — TRANSIENT, chỉ trong bộ nhớ, KHÔNG persist (KHÔNG đụng SAVE_VERSION).
 * Tiền lệ GĐ122 `askStartedWall` (counterAsk.ts): biến module-scope + reset khi sang ngày.
 *
 * Vì sao: combo chạy trong slot hạn chế (3→6 theo cấp) là quyết định chiến lược lặp lại mỗi ngày,
 * nhưng comboHitCount chỉ đếm TÍCH LŨY cả đời → người chơi không biết combo nào HÔM NAY bán được
 * bao nhiêu, giảm bao nhiêu, lời hay lỗ (hộp đen). Ở đây gom riêng dữ liệu của ngày hiện tại.
 *
 * Vòng đời: checkout khách → noteComboDay(); cuối ngày SummaryPanel đọc snapshot (ngày vừa qua);
 * Sổ đầu ngày hôm sau đọc snapshot để mồi "combo đang lỗ/ít bán"; khi đóng Sổ đầu ngày (bắt đầu
 * ngày mới thực sự) → resetComboDay().
 */
export interface ComboDayStat {
  /** Số lần combo kích hoạt ở quầy hôm nay. */
  count: number;
  /** Tổng tiền đã giảm giá cho combo này hôm nay. */
  discount: number;
}

let comboDay: Record<string, ComboDayStat> = {};

/** Ghi nhận một lượt combo kích hoạt: cộng số lần + tiền giảm vào ngày hiện tại. */
export function noteComboDay(byCombo: Record<string, number>, byDiscount: Record<string, number>) {
  if (!byCombo || !Object.keys(byCombo).length) return;
  const next: Record<string, ComboDayStat> = { ...comboDay };
  for (const id of Object.keys(byCombo)) {
    const n = byCombo[id] ?? 0;
    if (!n) continue;
    const prev = next[id] ?? { count: 0, discount: 0 };
    next[id] = { count: prev.count + n, discount: prev.discount + (byDiscount?.[id] ?? 0) };
  }
  comboDay = next;
}

/** Snap chụp dữ liệu combo hôm nay cho UI đọc (bản sao sâu, không để lộ tham chiếu nội bộ). */
export function comboDaySnapshot(): Record<string, ComboDayStat> {
  const out: Record<string, ComboDayStat> = {};
  for (const k of Object.keys(comboDay)) out[k] = { ...comboDay[k] };
  return out;
}

/** Xóa dữ liệu combo khi bắt đầu ngày mới (gọi lúc đóng Sổ đầu ngày). */
export function resetComboDay() {
  comboDay = {};
}
