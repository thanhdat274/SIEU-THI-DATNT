import { ageLots, spoilRate } from './freshness';
import { isMeat } from './meat';
import { productById } from './products';
import type { Weather } from './weather';

/**
 * GĐ-C — Trục "Siêu thị hóa sâu": CHUỖI LẠNH của ngành "Khu thịt cá tươi".
 *
 * GĐ-A khai báo ngành Khu thịt cá (keyFurniture `meat_counter`, bậc 3 — xem `departments.ts`), và
 * `freshness.ts` đã coi `meat_counter` là chỗ MÁT (COOLED ⇒ spoilRate = 1/đêm). Nhưng người chơi chưa
 * TRÔNG THẤY mềm của "kiểu để lạnh": thịt/cá để ngoài KỆ THƯỜNG hoặc NHÀ KHO thì ẤM
 * (WARM_PENALTY meat 2.5 × thời tiết) ⇒ hỏng nhanh gấp nhiều lần, mà chủ bày bừa thịt lên kệ thường
 * không biết đêm nay mất bao nhiêu vì nóng (hộp đen, Nguyên tắc a).
 *
 * Helper THUẦN này lượng hoá phần thịt/cá ĐANG ẤM sẽ hỏng qua một đêm (dùng ĐÚNG công thức freshness:
 * `spoilRate(pid, 'storage', weather)` cho nơi ấm + `ageLots` qua một đêm) cùng trị giá bán lẻ của phần
 * ấy — đó là giá trị chuỗi lạnh giữ lại được nếu dọn sang quầy thịt cá / tủ mát / tủ đông / kho lạnh.
 *
 * THUẦN — không import store, không đổi state/save/kinh tế/seed; chỉ soi (Nguyên tắc a). Chỉ tính quy về
 * thịt/cá (`isMeat`) để không gán doanh thu rau tươi/lạnh cho Khu thịt cá.
 */

/** Nơi thật đã quy về mát (rate 1/đêm) hay ấm (hỏng nhanh). */
export type ChainPlace = 'chilled' | 'warm';

/** Một lô thịt/cá đang bày/cất: caller quy nơi THẬT về `place` rồi truyền vào. */
export interface MeatChainLot {
  productId: string;
  qty: number;
  life: number;
  place: ChainPlace;
}

/** Loại nội thất có giữ mát (giảm hỏng nhanh) — khớp COOLED trong freshness.ts. */
const COOLED_TYPES = ['meat_counter', 'fridge', 'freezer', 'coldStorage'] as const;

/** Nội thất `furnitureType` có giữ mát không (giảm hỏng nhanh cho hàng cần lạnh). */
export function meatChainCooled(furnitureType: string): boolean {
  return (COOLED_TYPES as readonly string[]).includes(furnitureType);
}

export interface MeatCounterPayoff {
  /** Thịt/cá ĐANG ẤM sẽ hỏng đêm nay (con) — theo đúng công thức freshness. */
  warmSpoilQty: number;
  /** Trị giá bán lẻ (sell) của phần ấy — cận trên trung thực, chưa trừ lãi/nhập. */
  warmSpoilValue: number;
  /** Đã đặt quầy thịt cá chưa — để phân biệt nhắc "xây quầy" vs "dọn sang mát". */
  hasCounter: boolean;
  /** Dòng soi ngắn (≤90 code point) — null khi không có gì cần cảnh báo. */
  line: string | null;
}

/** Lượng hoá thịt/cá ấm sẽ hỏng qua một đêm với thời tiết `weather` — THUẦN. */
export function meatCounterPayoff(lots: readonly MeatChainLot[], weather: Weather, hasCounter: boolean): MeatCounterPayoff {
  let warmSpoilQty = 0;
  let warmSpoilValue = 0;
  for (const l of lots) {
    if (!isMeat(l.productId) || l.place === 'chilled') continue; // chỉ thịt/cá ẤM mới tính
    const rate = spoilRate(l.productId, 'storage', weather);
    const [, gone] = ageLots([{ qty: l.qty, life: l.life }], rate);
    if (gone > 0) {
      warmSpoilQty += gone;
      warmSpoilValue += gone * productById(l.productId).sell;
    }
  }
  if (warmSpoilQty <= 0) return { warmSpoilQty: 0, warmSpoilValue: 0, hasCounter, line: null };
  const v = formatMoney(warmSpoilValue);
  return {
    warmSpoilQty,
    warmSpoilValue,
    hasCounter,
    line: hasCounter
      ? `🥩 Thịt cá để ngoài ấm, đêm nay hỏng ~${warmSpoilQty} con (${v}) — dọn sang quầy thịt cá/tủ mát.`
      : `🥩 Thịt cá để ngoài hỏng ~${warmSpoilQty} con (${v})/đêm — đặt quầy thịt cá bậc 3 giữ mát.`,
  };
}

const formatMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;
