// ============================================================================
// Data: KỶ NGUYÊN NỘI DUNG (SPEC-TOI-UU §T4)
// ----------------------------------------------------------------------------
// Vấn đề: test golden (simGolden.test.ts) chạy sim trên DỮ LIỆU THẬT ở cấp 30. Thêm một món mở ở
// cấp ≤ 30 là đổi bể hàng bot nhập/khách chọn → lệch mốc. Từ đó sinh quy ước ngầm "nội dung mới
// phải mở sau cấp 30", làm cấp 1–30 đóng băng nội dung và dồn mọi thứ vào cấp 31–40.
//
// Giải pháp: nội dung MỚI ghi `since: 1` (kỷ nguyên thêm vào). Golden chạy ở kỷ nguyên 0 nên
// KHÔNG NHÌN THẤY nội dung mới, bất kể nó mở ở cấp nào. Người chơi thật luôn ở kỷ nguyên vô cực.
//
// Cách lọc: trong code có ~150 chỗ so `x.unlock <= level` rải rác. Thay vì sửa từng chỗ,
// `epochGate` biến `unlock` của dòng có `since` thành thuộc tính tính toán: khi kỷ nguyên hiện tại
// nhỏ hơn `since`, `unlock` trả EPOCH_LOCKED (không cấp nào với tới) → MỌI phép so cấp sẵn có tự
// loại dòng đó. Mẫu "biến mức module do nơi khác đặt" đã dùng ở setMarketIndex (pricing.ts) và
// setCostModifier (suppliers.ts).
//
// Giới hạn: chỉ che được NỘI DUNG (dòng dữ liệu). CƠ CHẾ mới (code chạy ở cấp ≤ 30) vẫn đổi sim —
// phải cổng theo cấp hoặc chép lại mốc bằng `npm run golden:update -- "<lý do>"`.
// ============================================================================

/** Kỷ nguyên ghi cho nội dung thêm từ nay: `since: CONTENT_EPOCH_NOW`. */
export const CONTENT_EPOCH_NOW = 1;

/** Giá trị `unlock` của nội dung chưa tới kỷ nguyên — không cấp nào với tới (trần cấp là 200). */
export const EPOCH_LOCKED = 9999;

let epoch = Infinity;

/** Sim golden gọi `setContentEpoch(0)` trước khi chạy; xong phải trả về `Infinity`. */
export const setContentEpoch = (n: number): void => { epoch = n; };
export const contentEpoch = (): number => epoch;

/** Bọc một bảng nội dung: dòng nào có `since` thì `unlock` tự khoá khi kỷ nguyên hiện tại < since.
 *  Sửa TẠI CHỖ và trả lại chính mảng đó. Gọi lại nhiều lần an toàn (dòng đã bọc được bỏ qua). */
export function epochGate<T extends { unlock: number; since?: number }>(items: T[]): T[] {
  for (const it of items) {
    if (!it.since) continue;
    const d = Object.getOwnPropertyDescriptor(it, 'unlock');
    if (d?.get) continue;
    const real = it.unlock;
    const since = it.since;
    Object.defineProperty(it, 'unlock', { get: () => (epoch >= since ? real : EPOCH_LOCKED), enumerable: true, configurable: true });
  }
  return items;
}
