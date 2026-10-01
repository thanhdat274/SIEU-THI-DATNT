/**
 * Trộm cắp và an ninh (ý tưởng từ game tham khảo `security.ts`; số liệu là thiết kế riêng, chưa cân bằng).
 * Hai nguồn mất mát: kẻ trộm lẻ trong giờ bán (lấy hàng không trả tiền) và trộm đột nhập ban đêm (lấy tiền két hoặc hàng).
 * Bảo vệ, camera và nhân viên châm hàng làm tăng khả năng phát hiện/phòng ngừa; báo công an có thể đòi lại một phần.
 */
export const SECURITY_RULES = {
  /** Từ cấp này trở lên mới có trộm (tránh phạt người mới). */
  unlockLevel: 5,
  /** Xác suất mỗi khách thường (không phải khách quen) là kẻ trộm lẻ. */
  thiefChance: 0.015,
  /** Xác suất phát hiện kẻ trộm lẻ khi thanh toán: các nguồn độc lập, kết hợp 1 − Π(1 − p). */
  detect: { guard: 0.9, camera: 0.8, refill: 0.3 },
  /** Bắt quả tang: kẻ trộm trả lại hàng và nộp phạt = hệ số này × tiền hàng theo giá bán. */
  fineMul: 2,
  /** Giá lắp camera (VND, một lần). */
  cameraCost: 250_000,
  /** Xác suất mỗi đêm có trộm đột nhập; camera nhân với `nightCameraMul`. */
  nightChance: 0.06,
  nightCameraMul: 0.5,
  /** Trộm đột nhập: xác suất lấy tiền két (còn lại lấy hàng), tỷ lệ tiền két bị lấy, tỷ lệ và số món tối đa lấy từ kệ. */
  nightCashChance: 0.5,
  nightCashMin: 0.3,
  nightCashMax: 0.6,
  nightStealMin: 0.08,
  nightStealMax: 0.2,
  nightMaxItems: 20,
  /** Hồ sơ công an: xác suất bắt được kẻ trộm, cộng thêm khi có camera, và số ngày có kết quả. */
  policeCatch: 0.35,
  policeCameraBonus: 0.25,
  policeDaysMin: 2,
  policeDaysMax: 5,
  /** Số sự cố giữ lại để xem. */
  incidentCap: 20,
} as const;

/** Quy tắc thiết kế ban đầu cho tiền giả; cần cân bằng bằng playtest trước khi nghiệm thu. */
export const COUNTERFEIT_RULES = {
  /** Tỷ lệ giao dịch có một tờ tiền giả. */
  transactionChance: 0.008,
  denominations: [10_000, 20_000, 50_000, 100_000],
  playerDetectChance: 0.7,
  staffDetectBase: 0.35,
  staffAccuracyBonus: 0.05,
  staffDetectCap: 0.85,
} as const;
