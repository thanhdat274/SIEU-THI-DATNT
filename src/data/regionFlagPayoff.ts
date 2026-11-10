/**
 * GĐ2215 — "Bảng hiệu vinh danh đặc sản đáng bao nhiêu khách/đ mỗi ngày?"
 *
 * Bảng hiệu một miền (regionFlags GĐ1505) mang 2 lợi ích khi treo và bày đủ bộ đặc sản miền đó:
 *   (1) DECOR  — đủ bộ +4🩷, vinh danh +12🩷 (FLAG_TIER_DECOR). Lượng 🩷 này cộng vào decorScoreOf
 *       rồi chạy qua decorVisitBoost kéo khách (customers.ts:174) — ĐÚNG công thức decorPayoff
 *       (GĐ2214); decorBoost tuyến tính theo decor nên boost do riêng bảng hiệu = decorVisitBoost(delta, sao).
 *   (2) GIÁ    — đặc sản miền bán +2%/+5% giá (FLAG_TIER_PRICE qua regionPriceMul). Mỗi lượt bán
 *       một món đặc sản được premium = Math.round(sell × pct) (sales.ts:89) — lời THÊM mỗi lượt của
 *       riêng món đó, từ giá thật.
 * Helper THUẦN dùng đúng số thật của từng đặc sản: trả khách/ngày do decor và đ/ngày do giá (nếu
 * được kê số lượng bán/ngày từng món), để chủ tiệm thấy "bảng hiệu đang thêm ~X khách, đặc sản
 * miền lời thêm ~Yđ". KHÔNG đổi state/save/kinh tế/seed — bảng hiệu mở cấp 42 > mốc golden L30.
 */
import { FLAG_TIER_DECOR, FLAG_TIER_PRICE, type RegionFlag } from './regionFlags';
import { REGION_PRODUCTS, type RegionName } from './regionSpecialty';
import { decorVisitBoost } from './layout';
import { customersPerDay } from './levels';

/** Một đặc sản của miền: giá bán thật và lời thêm mỗi lượt bán nhờ +% giá bảng hiệu. */
export interface RegionPriceRow {
  id: string;
  name: string;
  sell: number;
  pct: number;
  /** Lời thêm mỗi lượt bán = Math.round(sell × pct), khớp premium sales.ts:89. */
  extraPerSale: number;
}

export interface RegionFlagPayoff {
  region: RegionName;
  tier: 0 | 1 | 2;
  /** Từng bậc bảng hiệu lợi ích decor (điểm 🩷 thưởng). */
  decorDelta: number;
  /** decorBoost riêng của bảng hiệu (cộng vào nền 0.5 lượt ghé như decorPayoff). */
  decorBoost: number;
  /** Khách THÊM mỗi ngày do decor của bảng hiệu. */
  extraKhach: number;
  /** Doanh thu kéo khách thêm mỗi ngày theo phí bình quân (avgPerVisit=0 nếu không kê). */
  moneyPerDay: number;
  /** Hệ số +% giá đặc sản miền theo bậc (0.02 / 0.05). */
  pricePct: number;
  /** Lời thêm mỗi lượt bán từng đặc sản miền (giá thật). */
  priceRows: RegionPriceRow[];
  /** Lời thêm đ/ngày từ giá nếu kê vol số lượt bán mỗi món (0 nếu không kê). */
  pricePerDay: number;
}

/**
 * Lượng hoá giá trị bảng hiệu vinh danh 1 miền ở bậc `tier`.
 * `vol` (số lượt bán/ngày từng đặc sản) chỉ là đầu vào tuỳ chọn để nhân ra đ/ngày cho phần giá.
 */
export function regionFlagPayoff(
  flag: RegionFlag,
  tier: 0 | 1 | 2,
  overallStars: number,
  level: number,
  avgPerVisit = 0,
  vol?: Record<string, number>,
): RegionFlagPayoff {
  const decorDelta = FLAG_TIER_DECOR[tier];
  const pricePct = FLAG_TIER_PRICE[tier];
  const decorBoost = decorVisitBoost(decorDelta, overallStars);
  const extraKhach = Math.round(decorBoost * customersPerDay(level));
  const priceRows: RegionPriceRow[] = [];
  let pricePerDay = 0;
  for (const id of flag.items) {
    const prod = REGION_PRODUCTS.find((p) => p.id === id);
    if (!prod) continue;
    const extraPerSale = Math.round(prod.sell * pricePct);
    priceRows.push({ id, name: prod.name, sell: prod.sell, pct: pricePct, extraPerSale });
    if (vol) pricePerDay += extraPerSale * (vol[id] ?? 0);
  }
  return {
    region: flag.name,
    tier,
    decorDelta,
    decorBoost,
    extraKhach,
    moneyPerDay: Math.round(extraKhach * avgPerVisit),
    pricePct,
    priceRows,
    pricePerDay,
  };
}

/** Dòng ngắn cho bề mặt sắp xếp: bảng hiệu đang thêm bao nhiêu khách, đặc sản miền lời thêm bao nhiêu/lần. */
export function regionFlagPayoffLine(p: RegionFlagPayoff): string {
  if (p.tier === 0) return `🚩 Bảng ${p.region}: chưa đủ bộ đặc sản miền — treo cũng chưa có tác dụng.`;
  const top = p.priceRows.slice().sort((a, b) => b.extraPerSale - a.extraPerSale)[0];
  const price = top
    ? `; đặc sản miền +${Math.round(p.pricePct * 100)}% giá (vd. ${top.name} +${top.extraPerSale.toLocaleString('vi-VN')}đ/lượt bán)`
    : '';
  const extra = p.extraKhach > 0 ? `; thêm ~${p.extraKhach} khách/ngày` : '';
  return `🚩 Bảng ${p.region} (${p.tier === 2 ? 'vinh danh' : 'đủ bộ'}): +${p.decorDelta}🩷${extra}${price}.`;
}
