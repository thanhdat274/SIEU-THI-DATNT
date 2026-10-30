/**
 * GĐ221 "Lô chợ phiên đáng múc không?" — định giá QUYẾT ĐỊNH mua lô thương lái (GĐ68).
 * Banner chợ phiên (OrderPanel) đã cho biết tiết kiệm được bao nhiêu so với mua lẻ; chưa cho biết
 * lô có đáng MÚC theo tồn kho hiện tại hay không — mua lô toàn món bạn đã có đủ nhiều ngày là
 * CHÔN thêm vốn (nối GĐ213 stockCapital). Helper này THUẦN ĐỌC: đối chiếu từng món trong lô với
 * sức tiêu thụ hôm nay (`itemHealthList.dailyQty`) + hàng đang cầm → bán nhanh thì múc, đã dư thì
 * chờ. Không đổi state/kinh tế.
 */

import type { FairOffer } from './fairmerchant';
import type { ItemHealth } from './analytics';
import { productById, WEEKEND_SNACKS } from './products';
import { isWeekend } from './calendar';

/** Món trong lô đang cầm dưới ngưỡng ngày này → lô là "cần" (bán nhanh, thêm là hợp). */
const BENEFIT_DAYS = 3;
/** Món đang cầm đủ trên ngưỡng ngày này → lô sẽ chôn thêm vốn. */
const OVERSTOCK_DAYS = 7;

export interface FairLotLine {
  id: string;
  name: string;
  qty: number;
  /** Đang có (kho + kệ) trước khi nhận lô. */
  have: number;
  /** Sức bán/ngày (0 nếu không rõ/chưa bán). */
  dailyQty: number;
  /** Đang cầm đủ cho bao nhiêu ngày theo nhịp hôm nay (null nếu không bán). */
  daysOfStock: number | null;
  /** Lô giúp món bán nhanh (đang thiếu theo nhịp). */
  beneficial: boolean;
  /** Lô chồng lên món đã dư → chôn vốn. */
  overstock: boolean;
}

export type FairLotVerdict = 'grab' | 'maybe' | 'hold';

export interface FairLotValue {
  /** Tiết kiệm so với mua lẻ (đ). */
  savings: number;
  /** Tỉ lệ tiết kiệm (0–1) so với giá mua lẻ. */
  savePct: number;
  /** Giá thực trả cho lô. */
  dealPrice: number;
  lines: FairLotLine[];
  /** Số món trong lô "cần" (bán nhanh). */
  beneficialCount: number;
  /** Số món trong lô đã dư (chôn vốn). */
  overstockCount: number;
  /** Số món trong lô thuộc nhóm ăn vặt cuối tuần (GĐ255/GĐ291). */
  weekendSnacksCount: number;
  /** Phiên chợ rơi vào cuối tuần (Thứ 7 / CN) hay không. */
  isWeekendFair: boolean;
  verdict: FairLotVerdict;
}

/** Đánh giá lô chợ phiên theo tồn kho + sức bán. `health` rỗng → vẫn tính tiết kiệm, verdict maybe. */
export function fairLotValue(
  offer: FairOffer,
  storage: Record<string, number>,
  onShelf: Record<string, number>,
  health: ItemHealth[],
  day: number = 1,
): FairLotValue {
  const daily = new Map<string, number>();
  for (const h of health) daily.set(h.id, h.dailyQty);

  const lines: FairLotLine[] = offer.lines.map((l) => {
    const have = (storage[l.id] ?? 0) + (onShelf[l.id] ?? 0);
    const q = daily.get(l.id) ?? 0;
    const daysOfStock = q > 0 ? have / q : null;
    return {
      id: l.id,
      name: productById(l.id)?.name ?? l.id,
      qty: l.qty,
      have,
      dailyQty: q,
      daysOfStock,
      beneficial: daysOfStock !== null && daysOfStock < BENEFIT_DAYS,
      overstock: daysOfStock !== null && daysOfStock > OVERSTOCK_DAYS,
    };
  });

  const beneficialCount = lines.filter((l) => l.beneficial).length;
  const overstockCount = lines.filter((l) => l.overstock).length;
  const savings = Math.max(0, offer.totalBuy - offer.dealPrice);
  const savePct = offer.totalBuy > 0 ? savings / offer.totalBuy : 0;
  const weekendSnacksCount = lines.filter((l) => WEEKEND_SNACKS.includes(l.id)).length;
  const isWeekendFair = isWeekend(day);

  // Verdict: chủ yếu hàng đã dư → không múc; có món bán nhanh + có lời → múc; còn lại cân nhắc.
  let verdict: FairLotVerdict = 'maybe';
  if (lines.length && overstockCount > lines.length / 2) verdict = 'hold';
  else if (beneficialCount > 0 && savings > 0) verdict = 'grab';

  return { savings, savePct, dealPrice: offer.dealPrice, lines, beneficialCount, overstockCount, weekendSnacksCount, isWeekendFair, verdict };
}
