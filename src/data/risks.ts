import { furnitureDef } from './furniture';

/**
 * Rủi ro của tiệm lớn: kệ hao mòn, kẻ trộm, tiền giả (ý từ bản 2D, số liệu riêng).
 * Mở ở cấp cao để không làm khó người mới.
 */
export const RISK_RULES = {
  wear: {
    unlock: 10,
    /** Mỗi đêm mòn thêm một số nguyên trong khoảng này. */
    perNight: [1, 4] as const,
    /** Từ mức mòn này mới có thể hỏng; xác suất mỗi đêm = (mòn − breakFrom) × perPoint. */
    breakFrom: 60,
    perPoint: 0.008,
    /** Phí sửa = phần giá mua mới, tối thiểu 20.000đ. */
    repairPct: 0.25,
    repairMin: 20000,
    /** Bảo trì được khi mòn từ mức này. */
    serviceFrom: 40,
  },
  theft: {
    unlock: 15,
    /** Phần khách vãng lai là kẻ trộm. */
    chance: 0.015,
    /** Xác suất bắt được ở quầy: có người đứng quầy / không ai / có kỹ năng Mắt tinh. */
    detectCashier: 0.55,
    detectNobody: 0.1,
    sharpEyeBonus: 0.3,
    /** Bắt quả tang thì phạt gấp mấy lần tiền hàng. */
    fineMul: 2,
  },
  counterfeit: {
    unlock: 20,
    chance: 0.01,
    notes: [10000, 20000, 50000, 100000],
    detect: 0.55,
    sharpEyeBonus: 0.35,
  },
} as const;

export const repairCost = (type: Parameters<typeof furnitureDef>[0]) =>
  Math.max(RISK_RULES.wear.repairMin, Math.round((furnitureDef(type).price * RISK_RULES.wear.repairPct) / 1000) * 1000);

/** Đồ có hao mòn (kệ, tủ chứa hàng). */
export const wears = (type: Parameters<typeof furnitureDef>[0]) => furnitureDef(type).tiers > 0;
