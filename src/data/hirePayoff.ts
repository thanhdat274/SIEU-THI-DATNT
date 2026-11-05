// ============================================================================
// Data: Tuyển dụng — bề mặt "thuê vai này được gì cho MÌNH?" (GĐ1267)
// ----------------------------------------------------------------------------
// Tab Tuyển dụng (StaffPanel) trước giờ chỉ hiện ứng viên + vai + lương + tay nghề: chủ phải
// thuê DÙ không biết vai này vá đúng lỗ nào đang rò tiền/khách (hộp đen, Nguyên tắc a "mọi quyết
// định hằng ngày phải có dữ liệu phản hồi"). Đào tạo đã có "hoà vốn ~N ngày", thăng chức đã có
// promotionWorth (GĐ1258), cây kỹ năng đã có skillPayoff (GĐ1266) — tuyển dụng là ô trống cuối.
// Helper này THUẦN — đọc HẰNG SỐ đã cân bằng + tín hiệu THẬT đang đo trong sổ hôm nay để trả MỘT
// dòng ngắn (≤90 ký tự) nêu lỗ cụ thể vai đó vá: không đổi state/save/kinh tế (Luật 5 an toàn).
//
// Chỉ ra dòng khi con số là TỔN THẤT THẬT đang đo (không chế số mới, không bịa — trung thực):
// - cashier      : hôm nay có khách bỏ về vì chờ quầy (stats.missed.wait) → thêm thu ngân giữ.
// - customer_care: cùng tín hiệu chờ quầy (khách kiên nhẫn hơn theo tay nghề) → giữ khách.
// - stocker      : hôm nay lỡ vì KỆ TRỐNG mà KHO CÒN (storeMissRevenue rows inStorage>0)
//                  → thêm người xếp bày kịp (cùng tín hiệu với neat_shelves GĐ1266).
// - cleaner      : sàn bẩn đang làm mất lượt ghé (dirtLoss GĐ241) → thêm lao công giữ sạch.
// Các vai còn lại (courier/guard/manager/cook/bartender/...): không có lỗ TIỀN trung thực đo được
// theo sổ hôm nay một cách đáng tin → để mô tả desc nguyên bản, không nói quá (tránh nhiễu, không ồn
// đầu ngày — giống todayLine/skillPayoff). Trả ok:false và line rỗng khi không có tín hiệu.
// ============================================================================

import { dailyWage } from './staff';
import { dirtLoss, DIRT_LOSS_WARN_KHACH } from './dirtLoss';
import { theftCatchChance, theftSpawnChance } from './theftRisk';

export interface HirePayoff {
  /** Có lỗ THẬT đang đo để nêu hay không (UI chỉ hiện dòng khi true). */
  ok: boolean;
  /** Một dòng ngắn tiếng Việt (≤90 ký tự) — rỗng khi !ok. */
  line: string;
}

/** Ngưỡng lỡ kệ-trống-dù-kho-còn đáng nhắc khi thuê xếp hàng (cùng tinh thần SKILL_PAYOFF_MIN_LOSS). */
export const HIRE_SHELF_MIN_LOSS = 50000;

/** GĐ1269 — ngưỡng rò trộm/ngày đáng nhắc khi thuê bảo vệ (tránh nhiễu ngày sạch). */
export const GUARD_MIN_SAVE = 10000;

const fmt = (n: number) => n.toLocaleString('vi-VN');

/**
 * GĐ1267 — lỗ cụ thể một ứng viên vai đang vá, theo sổ hôm nay.
 * THUẦN: nhận dữ liệu đo được (caller trích từ store) — không đổi state/kinh tế/save (Luật 5).
 */
export function hirePayoff(role: string, c: {
  /** Lương một ca của ứng viên này (đ) — chỉ để khớp tín hiệu, không thêm số ngoài. */
  wage: number;
  /** Khách bỏ về vì chờ quầy hôm nay (stats.missed.wait ?? 0). */
  waitMissed: number;
  /** Lãi bỏ lỡ vì KỆ TRỐNG mà KHO CÒN hôm nay (storeMissRevenue → rows inStorage>0). */
  shelfMissInStorageLoss: number;
  /** Độ bẩn sàn hiện tại (store.dirt 0–100). */
  dirt: number;
  /** Cấp — để dirtLoss ước khách/ngày. */
  level: number;
  /** Khách ghé hôm nay (stats.customers) — để dirtLoss tính doanh thu bình quân. */
  customers: number;
  /** Doanh thu hôm nay (stats.revenue) — để dirtLoss tính doanh thu bình quân. */
  revenue: number;
  /** GĐ1269 — bảo vệ: số bảo vệ đang có trong đội (0 mới đáng nói "thuê thêm"). Tùy chọn. */
  guardCount?: number;
  /** Có ai đứng quầy thanh toán không (ảnh hưởng P bắt trộm cơ sở). Tùy chọn. */
  cashierStaffed?: boolean;
  /** Có chó trông tiệm đang hoạt động hôm nay không (petActive). Tùy chọn. */
  hasDog?: boolean;
  /** Đã lắp camera an ninh chưa (biz.upgrades). Tùy chọn. */
  hasCamera?: boolean;
  /** Có kỹ năng Mắt tinh chưa (skills). Tùy chọn. */
  hasSharpEye?: boolean;
}): HirePayoff {
  switch (role) {
    case 'cashier': {
      if (c.waitMissed > 0) {
        return { ok: true, line: `💡 Hôm nay ${c.waitMissed} khách bỏ vì chờ quầy — thêm thu ngân giữ gần hết.` };
      }
      return { ok: false, line: '' };
    }
    case 'customer_care': {
      if (c.waitMissed > 0) {
        return { ok: true, line: `💡 Hôm nay ${c.waitMissed} khách bỏ vì chờ quầy — thêm người hỏi thăm để họ chờ được lâu hơn.` };
      }
      return { ok: false, line: '' };
    }
    case 'stocker': {
      if (c.shelfMissInStorageLoss >= HIRE_SHELF_MIN_LOSS) {
        return { ok: true, line: `💡 Hôm nay lỡ ~${fmt(c.shelfMissInStorageLoss)}đ vì kệ trống dù kho còn — thêm người xếp bày kịp.` };
      }
      return { ok: false, line: '' };
    }
    case 'cleaner': {
      const dl = dirtLoss({ dirt: c.dirt, level: c.level, customers: c.customers, revenue: c.revenue });
      if (dl.lostKhachPerDay >= DIRT_LOSS_WARN_KHACH && dl.moneyLostPerDay > 0) {
        return { ok: true, line: `💡 Sàn bẩn đang mất ~${dl.lostKhachPerDay} khách (~${fmt(Math.round(dl.moneyLostPerDay))}đ/ngày) — thêm lao công giữ sạch.` };
      }
      return { ok: false, line: '' };
    }
    case 'guard': {
      // GĐ1269 — giá trị TRUNG THỰC của bảo vệ: bảo vệ nâng P(bắt trộm) lên GUARD_DETECT (0.92)
      // (theftCatchChance), nên giá trị = số vụ trộm kỳ vọng đang LỌT × P lọt chênh × giỏ bán lẻ.
      // Chỉ ra khi: chưa có bảo vệ + có phơi nhiễm trộm THẬT + phòng thủ hiện tại còn cách bảo vệ
      // đáng kể (nếu chó/camera/quầy/Mắt tinh đã bắt gần chắc thì bảo vệ thêm 0 → không nói quá).
      if ((c.guardCount ?? 0) > 0) return { ok: false, line: '' };
      const hasDog = !!c.hasDog, hasCamera = !!c.hasCamera, cashierStaffed = !!c.cashierStaffed, hasSharpEye = !!c.hasSharpEye;
      const spawn = theftSpawnChance({ isNight: false, hasNightUpgrade: false, hasDog, hasCamera });
      const catchBase = theftCatchChance({ hasDog, hasCamera, guardOnDuty: false, cashierStaffed, hasSharpEye });
      const catchGuard = theftCatchChance({ hasDog, hasCamera, guardOnDuty: true, cashierStaffed, hasSharpEye });
      const marginal = Math.min(1, catchGuard) - Math.min(1, catchBase);
      const expectedThieves = c.customers * spawn;
      const avgBasket = c.customers > 0 ? c.revenue / c.customers : 0;
      const savedPerDay = expectedThieves * marginal * avgBasket;
      if (savedPerDay < GUARD_MIN_SAVE || marginal <= 0) return { ok: false, line: '' };
      const thieves = expectedThieves * marginal;
      const n = thieves >= 1 ? String(Math.round(thieves)) : '<1';
      const s = fmt(Math.round(savedPerDay));
      return {
        ok: true,
        line: savedPerDay >= c.wage
          ? `💡 Không bảo vệ: ~${n} vụ lọt (~${s}đ/ngày) — thuê giữ gần chắc chắn, đáng hơn lương.`
          : `💡 Không bảo vệ: ~${n} vụ lọt (~${s}đ/ngày) — thuê để giữ gần chắc chắn.`,
      };
    }
    default:
      return { ok: false, line: '' };
  }
}
