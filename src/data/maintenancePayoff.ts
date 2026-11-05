/**
 * GĐ1190 "Hợp đồng bảo trì (1.8tr) có đáng? — soi rủi ro tiền sửa kệ mỗi đêm + hoàn vốn".
 *
 * Món nâng cấp ĐẮT nhất dòng thiết bị một lần (1.8tr) mà chưa có cái nhìn LOI/hoàn vốn nào — khác hẳn
 * camera có thẻ rò/hoàn vốn (GĐ236). Người chơi chỉ thấy dòng sáng `🔧 N kệ bị hỏng, bấm để sửa` / `Thợ
 * bảo trì đã sửa N kệ (nửa giá X)` — không biết mỗi đêm tiệm đang "cháy" bao nhiêu tiền sửa kệ nếu
 * không có hợp đồng, nên không biết món 1.8tr bảo vệ được gì. Helper này đọc 100% THUẦN quan sát (không
 * đổi state/save/kinh tế/seed), dùng đúng cơ chế:
 *   - Kệ hao mòn mỗi đêm (RISK_RULES.wear), hỏng khi simRng() < (wear − breakFrom) × perPoint — khớp
 *     `wearRisk` (GĐ233) và endDay:250.
 *   - Chưa có hợp đồng: kệ hỏng phải trả đủ `repairCost` (25% giá mới, tối thiểu repairMin).
 *   - Có hợp đồng (endDay:257-268): kệ hỏng sửa NỬA giá VÀ mòn ≥ serviceFrom (40) được reset về 10 →
 *     kệ gần như không bao giờ chạm ngưỡng hỏng, tiền sửa/đêm ≈ 0.
 * Nên rủi ro tiền sửa/đêm HIỆN TẠI nếu không có hợp đồng = Σ breakChance × repairCost trên mọi đồ hao
 * mòn (chưa kể kệ hỏng làm lỡ bán) — đó là mức tiết kiệm ít nhất hợp đồng mang lại → hoàn vốn. Không
 * RNG/seed — con số kỳ vọng, ghi rõ "ước lượng (chưa tính lỡ bán khi kệ hỏng)".
 */
import { repairCost, RISK_RULES, wears } from './risks';
import { wearRisk } from './wearRisk';
import { UPGRADES } from './upgrades';
import type { FurnitureType } from './furniture';

/** Cấp mở khóa hợp đồng bảo trì (khớp UPGRADES.maintenance.unlock). */
export const MAINT_UNLOCK = UPGRADES.find((u) => u.id === 'maintenance')?.unlock ?? 18;
/** Giá hợp đồng bảo trì. */
export const MAINT_PRICE = UPGRADES.find((u) => u.id === 'maintenance')?.price ?? 1800000;

/** Ngưỡng phán đoán mức rủi ro tiền sửa/đêm (đồng, dùng chung thang rò trộm). */
export const MAINT_RISK_HIGH = 150000;
export const MAINT_RISK_MODERATE = 50000;

export interface MaintenancePayoff {
  verdict: 'locked' | 'low' | 'moderate' | 'high';
  /** Số đồ hao mòn (kệ/tủ chứa). */
  nbWearing: number;
  /** Số kệ kỳ vọng hỏng mỗi đêm (Σ breakChance). */
  expectedBreaksPerNight: number;
  /** Chi phí sửa kệ/đêm nếu KHÔNG có hợp đồng (rủi ro tiền bình quân). */
  nightlyRepairSpend: number;
  /** Hợp đồng tiết kiệm ước mỗi ngày (≈ nightlyRepairSpend khi chưa lắp; 0 khi đã lắp). */
  savingPerDay: number;
  /** Số ngày để hợp đồng hoàn vốn (null nếu đã lắp hoặc không tiết kiệm được gì). */
  paybackDays: number | null;
  hasContract: boolean;
}

export function maintenancePayoff(opts: {
  /** Cấp tiệm. */
  level: number;
  /** Danh sách đồ đạc hiện tại (state.furniture). */
  furniture: { type: FurnitureType; wear?: number; broken?: boolean }[];
  /** Đã ký hợp đồng bảo trì chưa. */
  hasContract: boolean;
}): MaintenancePayoff {
  const { level, furniture, hasContract } = opts;

  if (level < MAINT_UNLOCK) {
    return {
      verdict: 'locked', nbWearing: 0, expectedBreaksPerNight: 0, nightlyRepairSpend: 0,
      savingPerDay: 0, paybackDays: null, hasContract,
    };
  }

  let nbWearing = 0;
  let expectedBreaks = 0;
  let nightlySpend = 0;
  for (const f of furniture) {
    if (!wears(f.type) || f.broken) continue; // đang hỏng là tiền đã chìm, không phải rủi ro qua đêm
    const wr = wearRisk(f.type, f.wear ?? 0, false);
    nbWearing++;
    expectedBreaks += wr.breakChance;
    nightlySpend += wr.expectedRepairExposure; // breakChance × repairCost
  }

  // Có hợp đồng: mòn ≥ 40 được reset về 10 mỗi sáng → kệ gần như không bao giờ hỏng, tiền sửa/đêm ≈ 0.
  const savingPerDay = hasContract ? 0 : nightlySpend;
  const paybackDays = hasContract || savingPerDay <= 0 ? null : Math.ceil(MAINT_PRICE / savingPerDay);

  let verdict: MaintenancePayoff['verdict'];
  if (nightlySpend >= MAINT_RISK_HIGH) verdict = 'high';
  else if (nightlySpend >= MAINT_RISK_MODERATE) verdict = 'moderate';
  else verdict = 'low';

  return {
    verdict, nbWearing, expectedBreaksPerNight: expectedBreaks, nightlyRepairSpend: nightlySpend,
    savingPerDay, paybackDays, hasContract,
  };
}
