/**
 * Kệ đang mòn bao nhiêu nguy cơ, sửa có đáng (GĐ233)?
 *
 * Kệ hao mòn mỗi đêm (RISK_RULES.wear); từ mòn ≥ 60% mới có thể HỎNG, xác suất mỗi đêm
 * = (mòn − breakFrom) × perPoint (đúng công thức endDay), hỏng thì khách không lấy được hàng
 * đến khi sửa (25% giá mua mới, tối thiểu repairMin). WearRow chỉ hiện "Độ mòn X%" + nút Sửa/Bảo
 * trì — CHƯA nói XÁC SUẤT HỎNG ĐÊM NAY và rủi ro quy ra tiền. Helper này bóc tách: breakChance
 * (xác suất hỏng mỗi đêm ở mức mòn hiện tại), serviceable (đủ điều kiện bảo trì), repairCost và
 * expectedRepairExposure = breakChance × repairCost (rủi ro TIỀN sửa bình quân mỗi đêm). THUẦN ĐỌC:
 * chỉ tính từ RISK_RULES + furnitureDef — không đổi state/kinh tế.
 */
import { repairCost, RISK_RULES } from './risks';
import type { FurnitureType } from './furniture';

export type WearVerdict = 'broken' | 'danger' | 'watch' | 'ok';

export interface WearRisk {
  /** Mức mòn hiện tại (0–100). */
  wear: number;
  broken: boolean;
  /** Xác suất hỏng mỗi đêm ở mức mòn này (0–1; 1 nếu đã hỏng). */
  breakChance: number;
  /** Có thể bảo trì/sửa ngay (hỏng hoặc mòn ≥ serviceFrom). */
  serviceable: boolean;
  /** Phí sửa. */
  repairCost: number;
  /** Rủi ro tiền sửa bình quân mỗi đêm = breakChance × repairCost. */
  expectedRepairExposure: number;
  verdict: WearVerdict;
}

/** Mòn từ mức này trở lên coi là "gần nguy cơ" để hiện nhắc nhẹ. */
export const WEAR_WATCH_FROM = 40;
/** Nguy cơ hỏng ≥ 10%/đêm → cảnh báo xử lý. */
export const WEAR_DANGER_CHANCE = 0.1;

export function wearRisk(type: FurnitureType, wearInput: number, broken: boolean): WearRisk {
  const w = RISK_RULES.wear;
  const wear = Math.max(0, Math.min(100, wearInput));
  const rc = repairCost(type);
  const breakChance = broken ? 1 : Math.max(0, Math.min(1, (wear - w.breakFrom) * w.perPoint));
  const serviceable = broken || wear >= w.serviceFrom;
  let verdict: WearVerdict = 'ok';
  if (broken) verdict = 'broken';
  else if (breakChance >= WEAR_DANGER_CHANCE) verdict = 'danger';
  else if (serviceable) verdict = 'watch';
  return { wear, broken, breakChance, serviceable, repairCost: rc, expectedRepairExposure: breakChance * rc, verdict };
}
