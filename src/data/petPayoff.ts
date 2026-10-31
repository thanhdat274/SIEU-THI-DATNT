/**
 * GĐ157 — 🐱 "Con này đáng bữa cơm không?": quy lợi ích thú cưng ra TIỀN, đối chiếu tiền thức ăn.
 * Mèo: giảm hỏng hàng (spoilFactor 0.8, src/core/biz.ts); chó: giảm trộm/tiền giả (theftFactor 0.45).
 * THUẦN ĐỌC từ sổ đã có (analytics GĐ133 + riskTrend GĐ58) — không đổi kinh tế/save.
 *
 * Đại số 0.25 của mèo: số hỏng QUAN SÁT = số hỏng-KHÔNG-mèo × 0.8 (hệ số spoilFactor khi mèo
 * đang làm việc) → số hỏng-KHÔNG-mèo = quan sát / 0.8 → mèo CỨU = quan sát × (1/0.8 − 1) = × 0.25.
 */
import { spoilNightReport } from './advice';
import type { AnalyticsState } from './analytics';
import { petActive, petDef, type PetKind, type PetState } from './biz';
import { productById } from './products';
import { riskTrendSummary, type RiskDay } from './risk';

export type PetMap = Partial<Record<PetKind, PetState>>;

export type CatVerdict = 'saved' | 'breakeven' | 'losing' | 'nothing-spoiled';

/** Ngưỡng "hỏng đáng kể" mới góp ý nuôi mèo (≈ hơn 4 ngày tiền thức ăn mèo) — tránh nhiễu tuần sạch. */
export const CAT_PITCH_MIN = 100000;

export interface CatPayoff {
  owned: boolean;
  /** Tổng tiền hàng hỏng 7 ngày gần nhất (quan sát, ĐÃ gồm hệ số mèo nếu mèo làm việc) — ước. */
  weekSpoilCost: number;
  savedYesterday: number;
  savedWeek: number;
  /** Ước tiền cho ăn HÔM NAY: kho còn gói → giá thùng; hết kho → mua lẻ ×2 (cơ chế feedPet, mọi cấp). */
  foodCostToday: number;
  /** foodPrice × 7 — ước trạng thái đều tay (kho luôn còn gói mua giá thùng), chưa tính ngày hết kho phải mua lẻ. */
  foodWeek: number;
  verdict: CatVerdict;
  /** Mèo đang đói (hệ số 0.8 không áp dụng) — số vẫn tính theo ngày nó ĐÃ làm việc, UI thêm dòng nhắc cho ăn. */
  hungry: boolean;
}

/** Tiền hàng hỏng 1 ngày (quan sát) — tái dùng nguyên văn logic kê hỏng GĐ133, thiếu ngày trả 0. */
const spoilCostOfDay = (analytics: AnalyticsState | undefined, d: number): number =>
  spoilNightReport(analytics, d)?.totalCost ?? 0;

/**
 * Kinh tế con mèo trên cửa sổ 7 ngày đã chốt (day−1 … day−7, không tính hôm nay — hôm qua là ngày
 * gần nhất có số). Chỉ cộng công cứu vào những ngày mèo ĐANG làm việc (petActive): ngày đói hệ số
 * 0.8 không hề áp dụng, cộng vào là gán công oan cho con đói.
 * Chi phí thức ăn theo cơ chế feedPet thật: kho còn gói → ăn gói đã mua giá thùng; hết kho →
 * mua lẻ giá gấp đôi (mọi cấp, không theo level).
 */
export function catPayoff(
  analytics: AnalyticsState | undefined,
  pets: PetMap | undefined,
  day: number,
  storage?: Record<string, number>,
): CatPayoff {
  const pet = pets?.cat;
  const cat = petDef('cat');
  const foodPrice = productById(cat.food).buy;
  const inStock = (storage?.[cat.food] ?? 0) > 0;
  // Chưa nuôi: ước theo trạng thái đều tay (giá thùng) cho câu pitch; nuôi: theo thực tế kho hôm nay.
  const foodCostToday = pet ? foodPrice * (inStock ? 1 : 2) : foodPrice;
  const foodWeek = foodPrice * 7;
  if (!pet) {
    // Chưa nuôi: chỉ trả tổng hỏng 7 ngày để ước "nuôi mèo cứu được ~1/4" ở UI.
    let weekSpoilCost = 0;
    for (let d = day - 1; d >= day - 7; d--) weekSpoilCost += spoilCostOfDay(analytics, d);
    return { owned: false, weekSpoilCost, savedYesterday: 0, savedWeek: 0, foodCostToday, foodWeek, verdict: 'nothing-spoiled', hungry: false };
  }
  const activeOn = (d: number) => petActive(pet, d);
  let savedWeek = 0;
  let weekSpoilCost = 0;
  for (let d = day - 1; d >= day - 7; d--) {
    const obs = spoilCostOfDay(analytics, d);
    weekSpoilCost += obs;
    if (activeOn(d)) savedWeek += Math.round(obs * 0.25);
  }
  const savedYesterday = activeOn(day - 1) ? Math.round(spoilCostOfDay(analytics, day - 1) * 0.25) : 0;
  const verdict: CatVerdict =
    weekSpoilCost <= 0 ? 'nothing-spoiled'
      : savedWeek >= foodWeek * 0.85 && savedWeek <= foodWeek * 1.15 ? 'breakeven'
        : savedWeek > foodWeek ? 'saved' : 'losing';
  return { owned: true, weekSpoilCost, savedYesterday, savedWeek, foodCostToday, foodWeek, verdict, hungry: !petActive(pet, day) };
}

export interface DogPayoff {
  /** Tổng giá trị CHẶN/thu lại 7 ngày gần nhất (sổ rủi ro CHUNG cả tiệm: chó + camera + mắt tinh...). */
  weekBlocked: number;
  /** Tổng lọt 7 ngày gần nhất. */
  weekLeak: number;
  /** Số ngày có dữ liệu trong sổ rủi ro. */
  days: number;
}

/**
 * Bối cảnh con chó: dữ liệu trộm/tiền giả KHÔNG tách được ra riêng con chó (theftFactor đè lên cả
 * camera/mắt tinh) nên chỉ báo tuần chung, không verdict cứng — nói đúng đừng nói quá.
 */
export function dogPayoff(riskTrend: RiskDay[] | undefined): DogPayoff {
  const s = riskTrendSummary(riskTrend ?? []);
  return { weekBlocked: s.weekBlocked, weekLeak: s.weekLeak, days: s.days };
}
