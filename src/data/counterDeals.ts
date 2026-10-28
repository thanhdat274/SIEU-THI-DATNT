/** Mặc cả và thối tiền lẻ ở quầy: chuyện nhỏ mỗi ngày của tiệm tạp hóa. */

/** Khách vãng lai mặc cả: từ cấp này, hóa đơn từ mức này, tỉ lệ mỗi lần tính tiền. */
export const HAGGLE_UNLOCK = 2;
export const HAGGLE_MIN_TOTAL = 20000;
export const HAGGLE_CHANCE = 0.08;
/** Khách xin bớt chừng này phần hóa đơn (làm tròn nghìn). */
export const HAGGLE_SHARE = 0.1;
/** Không bớt thì chừng này phần khách vẫn vui vẻ mua. */
export const HAGGLE_REFUSE_OK = 0.6;

/** Thiếu tiền lẻ: tỉ lệ mỗi lần tính tiền khi hóa đơn lẻ (không tròn 5.000đ). */
export const CHANGE_UNLOCK = 1;
export const CHANGE_CHANCE = 0.06;
/** Thối bằng kẹo thì chừng này phần khách thấy phiền. */
export const CANDY_ANNOY = 0.4;

/** Ghi sổ mà bị từ chối: khách quen hơi buồn. */
export const CREDIT_REFUSE_FRIEND_LOSS = 2;

/** Hết chừng này phút game mà chưa chọn thì tự chọn mặc định. */
export const ASK_MINUTES = 15;

/** GĐ122 — khách chờ mặc cả/ghi sổ quá lâu (thế giới dừng theo GĐ102, nhưng KHÁCH đang bị treo
 *  câu hỏi vẫn mất kiên nhẫn theo GIÂY THỰC — phá lạm dụng 'pause miễn phí AFK vô hạn').
 *  Thang bậc (không trục dốc liên tục → không thêm state/save, chỉ Date.now() thuần ứng):
 *  GRACE rộng rãi → 😕 → 😤 → TỰ CHỐT theo phương án mặc định (không 'bỏ về' — phạt nhẹ, công
 *  bằng, dạy qua end-of-day missed.wait GĐ120). Số: 30s đọc thoải mái ≫ ~2-5s đọc thật của
 *  người mới ở 8x (GĐ102); 10s giữa 😤 và tự chốt đủ để người quay lại kịp hành động. */
export const ASK_GRACE_REAL_S = 30;      // trong ngần này giây thực: không gì (đủ đọc chậm ở 320px)
export const ASK_IMPATIENT_REAL_S = 30;  // ≥ này → khách hiện 😕 (cảnh báo, KHÔNG phạt)
export const ASK_FRANTIC_REAL_S = 38;    // ≥ này → 😤 (sắp tự chốt)
export const ASK_RESOLVE_REAL_S = 45;    // ≥ này → tự chốt theo mặc định

/** GĐ122 — trạng thái kiên nhẫn (theo giây THỰC) của khách đang bị treo câu hỏi quầy. Thuần, dễ test:
 *  null = còn bình tĩnh → '😕' → '😤' → 'resolved' (hết giờ, tự chốt mặc định). */
export function askQueuedPatience(realS: number): '😕' | '😤' | 'resolved' | null {
  if (realS >= ASK_RESOLVE_REAL_S) return 'resolved';
  if (realS >= ASK_FRANTIC_REAL_S) return '😤';
  if (realS >= ASK_IMPATIENT_REAL_S) return '😕';
  return null;
}

export const haggleOff = (total: number) => Math.max(1000, Math.round((total * HAGGLE_SHARE) / 1000) * 1000);

/** Tiền lẻ phải thối khi khách đưa tờ chẵn 5.000đ; 0 = hóa đơn tròn, không thiếu lẻ. */
export const oddChange = (total: number) => (total % 5000 === 0 ? 0 : 5000 - (total % 5000));

// ── GĐ61 "Chính sách quầy": thái độ chủ tiệm (mặc cả & tiền lẻ) ────────────────────────────────
// Mặc cả (~8% khách ≥20k) và thiếu lẻ (~6%) lặp lại mãi với CÙNG đáp án tối ưu — chính sách này cho
// phép chủ tiệm "chọn trước" thái độ để tự xử lý, biến phiền lặp thành stance chiến lược thật mà vẫn
// giữ NGUYÊN mọi tỉ lệ công thức (HAGGLE_CHANCE/SHARE/REFUSE_OK, CHANGE_CHANCE, CANDY_ANNOY).
// Mặc định 'ask' = nhắc mỗi lần = đúng hành vi hôm nay → 0 thay đổi kinh tế/save.

export type HagglePolicy = 'ask' | 'accept' | 'refuse';
export type ChangePolicy = 'ask' | 'round' | 'candy';

/** Thái độ quầy của chủ tiệm; 'ask' = vẫn hỏi như trước (prompt path). */
export interface CounterPolicy {
  haggle: HagglePolicy;
  change: ChangePolicy;
}

/** Mặc định: nhắc mỗi lần = hành vi hiện tại (save cũ backfill sang đây = y hệt). */
export const defaultCounterPolicy = (): CounterPolicy => ({ haggle: 'ask', change: 'ask' });

/** Mặc cả: 'ask' → null (giữ prompt path); 'accept' → 0 (bớt HAGGLE_SHARE, khách mặc cả đều gật);
 * 'refuse' → 1 (giữ giá, vẫn mất 1−HAGGLE_REFUSE_OK khách mặc cả). `total` giữ để khớp chữ ký/tiện mở rộng. */
export const haggleChoice = (policy: CounterPolicy, total: number): 0 | 1 | null => {
  if (policy.haggle === 'ask') return null;
  return policy.haggle === 'accept' ? 0 : 1;
};

/** Tiền lẻ: 'ask' → null; 'round' → 0 (bớt cho tròn, không phiền); 'candy' → 1 (thối kẹo → CANDY_ANNOY thấy phiền). */
export const changeChoice = (policy: CounterPolicy, total: number): 0 | 1 | null => {
  if (policy.change === 'ask') return null;
  return policy.change === 'round' ? 0 : 1;
};

/** Từng stance của mặc cả — value/label/note cho radio UI (các note cố định theo công thức). */
export const HAGGLE_OPTS: { value: HagglePolicy; label: string; note: string }[] = [
  { value: 'ask', label: 'Nhắc mỗi lần', note: 'Chủ tiệm quyết từng đơn như trước.' },
  { value: 'accept', label: 'Luôn bớt', note: 'Tự bớt 10% — khách mặc cả vui, thu nhập giảm nhẹ.' },
  { value: 'refuse', label: 'Không bớt', note: 'Giữ giá — vẫn mất 40% khách mặc cả.' },
];

/** Từng stance của tiền lẻ — value/label/note cho radio UI. */
export const CHANGE_OPTS: { value: ChangePolicy; label: string; note: string }[] = [
  { value: 'ask', label: 'Nhắc mỗi lần', note: 'Chủ tiệm quyết từng đơn như trước.' },
  { value: 'round', label: 'Bớt cho tròn', note: 'Không phiền khách, thu nhập giảm nhẹ.' },
  { value: 'candy', label: 'Thối kẹo', note: 'Đỡ mất lẻ, nhưng 40% khách thấy phiền.' },
];

/** Tradeoff text của stance đang chọn (dùng làm dòng tóm tắt dưới tiêu đề card). */
export const counterPolicySummary = (policy: CounterPolicy): { haggleText: string; changeText: string } => {
  const haggleText: Record<HagglePolicy, string> = {
    ask: 'Mặc cả: vẫn hỏi từng đơn như trước.',
    accept: 'Mặc cả: luôn bớt 10% — khách mặc cả vui, thu nhập giảm nhẹ.',
    refuse: 'Mặc cả: không bớt — giữ giá, mất 40% khách mặc cả.',
  };
  const changeText: Record<ChangePolicy, string> = {
    ask: 'Tiền lẻ: vẫn hỏi từng đơn như trước.',
    round: 'Tiền lẻ: bớt cho tròn — không phiền khách.',
    candy: 'Tiền lẻ: thối kẹo — đỡ mất lẻ, 40% khách thấy phiền.',
  };
  return { haggleText: haggleText[policy.haggle], changeText: changeText[policy.change] };
};
