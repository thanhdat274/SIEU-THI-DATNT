import { formatMoney } from './products';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1506 — ĐOÀN KIỂM TRA VỆ SINH (tham khảo hệ "Food safety audit" của khu ăn tại
// chỗ — TONG-HOP mục E/I2, đã Việt hoá: bỏ lựa chọn hối lộ nhạy cảm, gắn với hệ
// bẩn sàn CÓ SẴN của tiệm): thỉnh thoảng đoàn kiểm tra ghé — sàn sạch thì khen,
// sàn bẩn thì lập biên bản và người chơi chọn "Nhận phạt" (chắc) hoặc
// "Vệ sinh gấp" (rẻ hơn, giảm bẩn, nhưng có thể bị soi thêm chỗ khác).
// Phạt = % doanh thu HÔM NAY (đúng tỷ lệ "đau vừa đủ", không chạm chuỗi rng kinh tế —
// mọi rút ngẫu nhiên đi qua metaRng ở nơi gọi).
// ─────────────────────────────────────────────────────────────────────────────

/** Cấp mở: sau khi vòng ngày đã vững (lao công/quét sàn có ý nghĩa), trước khu ăn tại chỗ. */
export const INSPECTION_UNLOCK = 18;
/** Gieo 1 lần mỗi 5 phút game, tỉ lệ/lần → kỳ vọng ~1–2 lần/ngày mở cửa 11 giờ. */
export const INSPECTION_ROLL_EVERY = 5;
export const INSPECTION_CHANCE = 0.012;
/** Sàn bẩn từ mức này trở lên mới lập biên bản (DIRT_MAX = 100). */
export const DIRT_FAIL_AT = 30;

/** Phạt = phần doanh thu hôm nay, khung 20.000–150.000đ, làm tròn nghìn. */
export const INSPECTION_FINE_PCT = 0.05;
export const INSPECTION_FINE_MIN = 20000;
export const INSPECTION_FINE_MAX = 150000;

export const inspectionFine = (revenueToday: number): number => {
  const raw = revenueToday * INSPECTION_FINE_PCT;
  return Math.min(INSPECTION_FINE_MAX, Math.max(INSPECTION_FINE_MIN, Math.round(raw / 1000) * 1000));
};

/** "Vệ sinh gấp": trả 30% phạt + quét sàn giảm một nửa, nhưng 25% bị soi thêm → cộng 50% phạt. */
export const QUICK_PCT = 0.3;
export const QUICK_CAUGHT_CHANCE = 0.25;
export const QUICK_EXTRA_PCT = 0.5;

/** Lý do lập biên bản — đời thường, hài nhẹ, ≤ 90 ký tự (Luật thông báo). */
export const INSPECTION_NOTES = [
  'Sàn dính nước trái cây chưa lau — khách suýt trượt ngã trước ống kính.',
  'Thùng rác đầy tràn, ruồi bay kín véo các kệ hàng.',
  'Góc kho bốc ra một mùi mà đoàn phải mở hết cửa sổ.',
  'Kệ hàng phủ bụi, quẹt ngón tay ra một vệt dài.',
  'Ống hút bày lộn xộn cạnh quầy thu ngân, chưa có nắp đậy.',
  'Sàn sau quầy dính dầu mỡ chưa cọ — chấm đỏ đầu tiên!',
];

/** Đoàn đi về buổi — sàn sạch: khen, không phạt ai. */
export const INSPECTION_PRAISE = [
  'Sàn sạch bóng, kệ gọn gàng — đoàn gật gù ghi điểm đẹp vào sổ!',
  'Kiểm tra bất ngờ: sạch sẽ sáng trưng, không có gì để góp ý!',
  'Quán ngăn nắp đúng chuẩn — đoàn chúc tiệm bán đắt hàng!',
];

/** Chọn câu từ danh sách theo rng (metaRng truyền vào từ nơi gọi — test seed được). */
export const pickNote = (list: readonly string[], rng: () => number): string => list[Math.floor(rng() * list.length) % list.length];

/** Kết quả một lần xử lý biên bản (thuần — metaRng truyền vào để test seed được). */
export interface InspectionResult {
  /** Tiền bị trừ (đã làm tròn nghìn). */
  money: number;
  /** Độ bẩn còn lại (chỉ "vệ sinh gấp" mới quét sàn). */
  dirt: number;
  message: string;
}

const roundK = (n: number) => Math.round(n / 1000) * 1000;

export function inspectionOutcome(choice: 0 | 1, fine: number, dirt: number, rng: () => number): InspectionResult {
  if (choice === 0) {
    return { money: fine, dirt, message: `🧹 Nộp phạt ${formatMoney(fine)} — đoàn ghi sổ rồi ra về. Vệ sinh sớm nhé!` };
  }
  const quick = roundK(fine * QUICK_PCT);
  const caught = rng() < QUICK_CAUGHT_CHANCE;
  const extra = caught ? roundK(fine * QUICK_EXTRA_PCT) : 0;
  const dirtLeft = Math.round(dirt / 2);
  return {
    money: quick + extra,
    dirt: dirtLeft,
    message: caught
      ? `🧹 Vừa quét xong đoàn lại soi thấy chỗ khác — cộng thêm ${formatMoney(extra)}. Đủ ${formatMoney(quick + extra)}!`
      : `🧹 Quét vội xong ngay trước mặt đoàn — chỉ nộp ${formatMoney(quick)}, sàn cũng sạch hơn!`,
  };
}
