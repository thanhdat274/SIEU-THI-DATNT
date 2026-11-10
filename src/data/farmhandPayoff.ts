// ============================================================================
// Data: Phụ trại — giá trị TỰ ĐỘNG LO TRẠI của nhân công (GĐ2222)
// ----------------------------------------------------------------------------
// Phụ trại (farmhand) là vai TỰ ĐỘNG QUYẾT ĐỊNH một việc lặp mỗi tối: tưới luống còn khô,
// đổ cám kho cho chuồng đang đói, gom trứng/vỉ + sữa về kho và thu hoạch luống đã chín
// (src/data/garden.ts farmhandChores — chạy ở cuối ngày, endDay.ts:99). Trước GĐ2222, người
// chơi chỉ thấy dòng 🧑🌾 "<tên> lo trại hộ: …" trộn lẫn mô tả việc mà KHÔNG biết tự động hóa
// này "đáng bao nhiêu mỗi tối" — không thể quyết thuê/giữ phụ trại có đáng hay nếu không chủ
// phải bỏ công như thế nào. Helper này THUẦN (không đổi state/save/kinh tế — Luật 5): đọc
// CHÍNH trạng thái trại hiện tại (garden) + kho (storage) mà đêm qua endDay sẽ dùng, và quy ra:
//   - watered     : số luống đang khô (crop && wateredDay ≠ day) phụ trại sẽ tưới.
//   - fedPens     : số chuồng đang đói (hôm nay chưa cho ăn + máng thiếu) vừa đủ cám trong kho
//                   để phụ trại đổ tối nay — để chuồng khỏi "đói không ra sản phẩm".
//   - gatheredQty / gatheredValue : nông sản phụ trại gom (trứng đủ vỉ, sữa) + thu hoạch luống
//                   chín tối nay, định giá ĐÚNG chuẩn trang trại nhà trồng `homegrownSell`
//                   (bán lẻ ×1,2 nhãn nhà trồng — farmValue GĐ146) — số THẬT từ trạng thái đang có,
//                   không bịa. fed không đổi RNG nên tất định cho test.
// Chỉ nêu dòng khi CÓ phụ trại trong đội và tối nay có việc thật để lo. Không đổi công thức nào.
// ============================================================================

import {
  ANIMALS, ANIMAL_ORDER, cropById, EGG_PER_TRAY, farmGrazeDiscount, harvestYield, plotReady,
  type GardenState,
} from './garden';
import { homegrownSell } from './farmValue';

export interface FarmhandPayoff {
  /** Có phụ trại + tối nay có việc thật để lo không. */
  ok: boolean;
  /** Số luống khô phụ trại sẽ tưới tối nay. */
  watered: number;
  /** Số chuồng đói (kho vừa đủ cám) phụ trại sẽ cho ăn tối nay. */
  fedPens: number;
  /** Số món nông sản (trứng vỉ / sữa / thu hoạch) phụ trại gom về tối nay. */
  gatheredQty: number;
  /** Giá trị bán lẻ nhà trồng của số gom/thu (homegrownSell) — số thật, không bịa. */
  gatheredValue: number;
  /** Một dòng tiếng Việt (≤90 ký tự) — rỗng khi !ok. */
  line: string;
}

const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Ngưỡng giá trị nông sản gom/thu đủ đáng nhắc (tránh nhiễu ngày trại an nhàn). */
export const FARMHAND_GATHER_MIN = 15000;

/**
 * GĐ2222 — phụ trại tự lo trại tối nay đáng bao nhiêu: đọc trạng thái trại THẬT hiện tại.
 * THUẦN: nhận garden + storage + day — không đổi state/sim/save, không dùng RNG (tất định).
 */
export function farmhandPayoff(
  g: GardenState,
  storage: Record<string, number>,
  day: number,
): FarmhandPayoff {
  // Tưới: luống có cây nhưng chưa tưới hôm nay (đêm nay cần nước để không lớn chậm 60%).
  const watered = g.plots.filter((p) => p.crop && p.wateredDay !== day).length;

  // Cho ăn: chuồng hôm nay chưa được cho ăn + máng thiếu hôm nay, và kho có đủ cám để đổ.
  const graze = 1 - farmGrazeDiscount(g);
  let fedPens = 0;
  for (const kind of ANIMAL_ORDER) {
    const pen = g.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    const need = pen.count * def.feedKgPerDay * graze;
    if (pen.fedDay === day) continue; // hôm nay đã cho ăn rồi, không phải việc tối nay
    if (pen.feedKg >= need) continue; // máng còn đủ, chưa đói
    const bagsNeeded = Math.ceil((need - pen.feedKg) / def.feedBagKg - 1e-9);
    if ((storage[def.feedProduct] ?? 0) >= bagsNeeded) fedPens++;
  }

  // Gom/thu: trứng đủ vỉ + sữa đang chờ + luống đã chín — số THẬT, định giá nhà trồng.
  let gatheredQty = 0;
  let gatheredValue = 0;
  const addGathered = (pid: string, qty: number) => {
    if (qty <= 0) return;
    gatheredQty += qty;
    gatheredValue += Math.round(homegrownSell(pid) * qty);
  };
  for (const kind of ANIMAL_ORDER) {
    const pen = g.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    if (def.layChance !== undefined) {
      const trays = Math.floor(pen.pending / EGG_PER_TRAY);
      if (trays > 0) addGathered(def.productId, trays);
    } else if (def.outputPerDay !== undefined && pen.pending > 0) {
      addGathered(def.productId, pen.pending);
    }
  }
  for (const p of g.plots) {
    if (!p.crop || !plotReady(p)) continue;
    const def = cropById(p.crop);
    const qty = harvestYield(def, day, p.ripeDay);
    addGathered(def.productId, qty);
  }

  const anyWork = watered > 0 || fedPens > 0;
  if (gatheredValue < FARMHAND_GATHER_MIN && !anyWork) {
    return { ok: false, watered, fedPens, gatheredQty, gatheredValue: 0, line: '' };
  }

  const parts: string[] = [];
  if (watered) parts.push(`tưới ${watered} luống`);
  if (fedPens) parts.push(`cho ăn ${fedPens} chuồng`);
  if (gatheredQty) parts.push(`gom/thu ${gatheredQty} món`);
  const work = parts.join(', ');
  const line = gatheredValue >= FARMHAND_GATHER_MIN
    ? `🧑‍🌾 Phụ trại lo trại hộ: ${work} ≈ ${fmt(gatheredValue)}đ.`
    : `🧑‍🌾 Phụ trại lo trại hộ: ${work} — khỏi canh trại mỗi tối.`;

  return { ok: true, watered, fedPens, gatheredQty, gatheredValue, line };
}
