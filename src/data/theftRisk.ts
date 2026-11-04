/**
 * GĐ236 "Rò tiền vì trộm vặt — camera có đáng?" — soi giá trị thất thoát do kẻ trộm + hoàn vốn
 * nâng cấp camera (📹 800k, unlock 15).
 *
 * Trước GĐ236 chưa nơi nào cho con số "mỗi ngày trộm rút ~bao nhiêu hàng" — camera là món nâng cấp
 * đắt, nhưng người chơi không thấy nó bảo vệ được gì (chỉ thấy thỉnh thoảng 🚨/🦹). Helper này đọc
 * 100% thuần quan sát (không đổi state/save/kinh tế/SAVE_VERSION), dùng đúng hằng số của cơ chế:
 *   - `RISK_RULES.theft.chance` (0.015) — tỉ lệ khách vãng lai là kẻ trộm.
 *   - chó trông tiệm (`hasDog` → ×0.45, khớp `theftFactor` trong biz.ts).
 *   - camera (`hasCamera` → ×0.7, khớp `agents/customers.ts`).
 *   - `UPGRADES` camera giá 800k.
 * Trung bình mỗi khách rút ~giỏ bán lẻ (revenue / customers hôm nay) → trộm kỳ vọng/ngày × giá giỏ
 * = giá trị hàng "lộ ra" mỗi ngày; camera được ước lượng tiết kiệm phần bị kìm (×0.3) → hoàn vốn.
 * Không có RNG, không seed — con số kỳ vọng ước lượng, ghi rõ là "ước lượng".
 */
import { RISK_RULES } from './risks';
import { UPGRADES } from './upgrades';
import { GUARD_DETECT } from './staff';
import { NIGHT_THEFT_MUL } from './night';

/** Camera giảm P(trộm) xuống còn 70% (khớp hằng số trong agents/customers.ts). */
export const THEFT_CAMERA_RETAIN = 0.7;
/** Chó trông tiệm giảm P(trộm) xuống còn 45% (khớp theftFactor trong core/biz.ts). */
export const THEFT_DOG_RETAIN = 0.45;

/** Chó trông tiệm tăng P(bắt được kẻ trộm) (+0.25, khớp literal trong agents/customers.ts sneakOut). */
export const THEFT_DOG_CATCH = 0.25;
/** Camera ghi hình dọc quầy tăng P(bắt trộm) kể cả không ai đứng quầy (+0.3, khớp literal). */
export const THEFT_CAMERA_CATCH = 0.3;

/**
 * GĐ1211 — P(bắt được kẻ trộm khi nó lẻn ra): trích từ `agents/customers.ts` (sneakOut) thành
 * helper THUẦN, GIỮ NGUYÊN công thức/hằng (Luật 3 — hành vi y hệt) để logic này test được
 * và lộ con số thật cho nút rủi ro (bảo vệ/Mắt tinh/camera — GĐ1206): trước đây nó chìm trong
 * store/THREE/NavGrid nên là "hộp đen", người chơi không thấy P(bắt) là bao nhiêu.
 *   dog + camera + (guard ? GUARD_DETECT : (cashier ? detectCashier : detectNobody) + sharpEye?)
 * Không clamp (giữ y hệt bản gốc): dog+camera+guard = 1.47 → luôn bắt (rng < 1.47 luôn đúng).
 */
export function theftCatchChance(opts: {
  /** Có chó trông tiệm không (+0.25). */
  hasDog: boolean;
  /** Đã lắp camera quầy chưa (+0.3, bắt được kể cả không ai đứng). */
  hasCamera: boolean;
  /** Có bảo vệ trực không (→ GUARD_DETECT 0.92, thay cả cashier/sharpEye). */
  guardOnDuty: boolean;
  /** Có ai đang đứng quầy thanh toán không (0.55 so với không người 0.1). */
  cashierStaffed: boolean;
  /** Nhân viên có kỹ năng Mắt tinh không (+0.3, chỉ khi KHÔNG có bảo vệ). */
  hasSharpEye: boolean;
}): number {
  const dog = opts.hasDog ? THEFT_DOG_CATCH : 0;
  const camera = opts.hasCamera ? THEFT_CAMERA_CATCH : 0;
  const base = opts.guardOnDuty
    ? GUARD_DETECT
    : (opts.cashierStaffed ? RISK_RULES.theft.detectCashier : RISK_RULES.theft.detectNobody)
      + (opts.hasSharpEye ? RISK_RULES.theft.sharpEyeBonus : 0);
  return dog + camera + base;
}

/**
 * GĐ1212 — P(một khách vãng lai LÀ kẻ trộm) khi vào tiệm: trích từ `agents/customers.ts` (dòng
 * gán `c.thief`) thành helper THUẦN, GIỮ NGUYÊN công thức/hằng (Luật 3 — hành vi y hệt). Là đầu
 * kia của mạch trộm (GĐ1211 khóa P bắt; đây khóa P sinh trộm): khép đủ hai phía để báo cáo rủi ro
 * có thể soi sau. Cũng thay literal 0.7 (camera) bằng hằng THEFT_CAMERA_RETAIN cho khớp hằng nơi khác.
 *   chance × (mở tiệm đêm && đang đêm ? NIGHT_THEFT_MUL(2) : 1) × (chó ? THEFT_DOG_RETAIN(0.45) : 1) × (camera ? THEFT_CAMERA_RETAIN(0.7) : 1)
 */
export function theftSpawnChance(opts: {
  /** Đang là giờ đêm (isNight — khuya tối kẻ trộm hoạt động mạnh). */
  isNight: boolean;
  /** Đã mở nâng cấp tiệm đêm chưa (chỉ nhân ×2 khi có ca đêm). */
  hasNightUpgrade: boolean;
  /** Có chó trông tiệm (giảm P trộm xuống 45%). */
  hasDog: boolean;
  /** Đã lắp camera (giảm P trộm xuống 70%). */
  hasCamera: boolean;
}): number {
  return RISK_RULES.theft.chance
    * (opts.hasNightUpgrade && opts.isNight ? NIGHT_THEFT_MUL : 1)
    * (opts.hasDog ? THEFT_DOG_RETAIN : 1)
    * (opts.hasCamera ? THEFT_CAMERA_RETAIN : 1);
}

export interface TheftRisk {
  /** P một khách vãng lai là kẻ trộm (đã trừ chó/camera). */
  chance: number;
  /** Số kẻ trộm kỳ vọng trong ngày (khách vãng lai × chance). */
  expectedThievesToday: number;
  /** Giỏ bán lẻ trung bình một khách trả tiền hôm nay (revenue / customers). */
  avgBasketRetail: number;
  /** Giá bán lẻ hàng trộm "lộ ra" kỳ vọng mỗi ngày (trước hiệu ứng bắt). */
  leakExposureToday: number;
  /** Camera tiết kiệm ước lượng mỗi ngày (0 nếu đã lắp). */
  cameraSavesPerDay: number;
  /** Số ngày để camera hoàn vốn (null nếu đã lắp hoặc không tiết kiệm được gì). */
  cameraPaybackDays: number | null;
  hasCamera: boolean;
  verdict: 'locked' | 'low' | 'moderate' | 'high';
}

/** Ngưỡng phán đoán mức rò rỉ/ngày (đồng bán lẻ). */
export const THEFT_LEAK_HIGH = 150000;
export const THEFT_LEAK_MODERATE = 50000;

/** Cấp mở khóa màn trộm (khớp RISK_RULES.theft.unlock). */
export const THEFT_UNLOCK = RISK_RULES.theft.unlock;

/** Camera nâng cấp (giá / veto). */
export const THEFT_CAMERA_UNLOCK = UPGRADES.find((u) => u.id === 'camera')?.unlock ?? 15;
export const THEFT_CAMERA_PRICE = UPGRADES.find((u) => u.id === 'camera')?.price ?? 800000;

export function theftRisk(opts: {
  /** Cấp tiệm. */
  level: number;
  /** Khách vãng lai hôm nay (stats.customers). */
  customers: number;
  /** Doanh thu hôm nay (stats.revenue). */
  revenue: number;
  /** Đã lắp camera chưa. */
  hasCamera: boolean;
  /** Có chó trông tiệm không (giảm trộm). */
  hasDog: boolean;
}): TheftRisk {
  const { level, customers, revenue, hasCamera, hasDog } = opts;

  if (level < THEFT_UNLOCK) {
    return {
      chance: 0, expectedThievesToday: 0, avgBasketRetail: 0, leakExposureToday: 0,
      cameraSavesPerDay: 0, cameraPaybackDays: null, hasCamera, verdict: 'locked',
    };
  }

  const baseChance = RISK_RULES.theft.chance * (hasDog ? THEFT_DOG_RETAIN : 1) * (hasCamera ? THEFT_CAMERA_RETAIN : 1);
  const avgBasketRetail = customers > 0 ? revenue / customers : 0;
  const expectedThievesToday = customers * baseChance;
  const leakExposureToday = expectedThievesToday * avgBasketRetail;

  // Camera kìm P(trộm) xuống 70% → tiết kiệm ≈ 30% mức lộ ra hiện tại (nếu chưa lắp).
  const cameraSavesPerDay = hasCamera ? 0 : leakExposureToday * (1 - THEFT_CAMERA_RETAIN);
  const cameraPaybackDays = hasCamera || cameraSavesPerDay <= 0 ? null : Math.ceil(THEFT_CAMERA_PRICE / cameraSavesPerDay);

  let verdict: TheftRisk['verdict'];
  if (leakExposureToday >= THEFT_LEAK_HIGH) verdict = 'high';
  else if (leakExposureToday >= THEFT_LEAK_MODERATE) verdict = 'moderate';
  else verdict = 'low';

  return {
    chance: baseChance, expectedThievesToday, avgBasketRetail, leakExposureToday,
    cameraSavesPerDay, cameraPaybackDays, hasCamera, verdict,
  };
}
