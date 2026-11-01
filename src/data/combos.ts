import { productById } from './products';
import { COOK_UNLOCK } from './recipes';

/** Combo khuyến mãi: mua đủ các món trong combo thì giảm giá cả cặp; khách thấy biển combo hay mua kèm. */
export interface ComboDef {
  id: string;
  icon: string;
  name: string;
  items: [string, string];
  /** Phần giảm trên tổng giá hai món. */
  discount: number;
  /** Combo dùng món nhà làm: chỉ mở khi tiệm đã có bếp (COOK_UNLOCK), dù hai món đã mở khóa. */
  cook?: boolean;
}

/** Cấp mở bảng combo. */
export const COMBO_UNLOCK = 6;
/** Số combo được chạy cùng lúc lúc mới mở bảng (ít thì mới phải chọn). */
export const MAX_ACTIVE_COMBOS = 3;
/** Cấp mở thêm mỗi chỗ chạy combo: cấp 12 → 4, cấp 18 → 5, cấp 25 → 6 combo. */
export const COMBO_SLOT_LEVELS = [12, 18, 25];
/** Số combo được chạy cùng lúc ở cấp `level`. */
export const maxActiveCombos = (level: number) => MAX_ACTIVE_COMBOS + COMBO_SLOT_LEVELS.filter((l) => level >= l).length;
/** Cấp kế tiếp được mở thêm chỗ, hoặc undefined nếu đã đủ. */
export const nextComboSlotLevel = (level: number) => COMBO_SLOT_LEVELS.find((l) => level < l);
/** Khách lấy một món trong combo đang chạy thì có chừng này khả năng lấy thêm món kia. */
export const COMBO_PULL = 0.45;

export const COMBOS: ComboDef[] = [
  { id: 'mi_nuoc', icon: '🍜', name: 'Mì gói + nước suối', items: ['mi', 'nuoc'], discount: 0.1 },
  { id: 'banh_ngot', icon: '🍪', name: 'Bánh kẹo + nước ngọt', items: ['banh', 'ngot'], discount: 0.1 },
  { id: 'sua_banhmi', icon: '🥐', name: 'Bữa sáng: sữa + bánh mì', items: ['sua', 'banhmi'], discount: 0.12 },
  { id: 'mi_trung', icon: '🥚', name: 'Mì + trứng', items: ['mi', 'trung'], discount: 0.08 },
  { id: 'gao_dauan', icon: '🍚', name: 'Gạo + dầu ăn', items: ['gao', 'dauan'], discount: 0.06 },
  { id: 'giavi_dauan', icon: '🧂', name: 'Gia vị + dầu ăn', items: ['giavi', 'dauan'], discount: 0.08 },
  { id: 'snack_bia', icon: '🍺', name: 'Snack + bia', items: ['snack', 'bia'], discount: 0.1 },
  { id: 'caphe_sua', icon: '☕', name: 'Cà phê + sữa hộp', items: ['caphe', 'sua'], discount: 0.08 },
  { id: 'botgiat_daugoi', icon: '🧴', name: 'Bột giặt + dầu gội', items: ['botgiat', 'daugoi'], discount: 0.07 },
  { id: 'tangluc_mi', icon: '⚡', name: 'Tăng lực + mì (ca đêm)', items: ['tangluc', 'mi'], discount: 0.1 },
  { id: 'thit_rau', icon: '🥩', name: 'Thịt + rau củ', items: ['thit', 'rau'], discount: 0.08 },
  // Combo món nhà làm (mở khi đã có bếp, từ cấp 21)
  { id: 'comhop_nuoc', icon: '🍱', name: 'Cơm hộp gà + nước suối', items: ['com_hop_ga', 'nuoc'], discount: 0.1, cook: true },
  { id: 'banhmi_caphe', icon: '🥖', name: 'Bánh mì trứng + cà phê sữa đá', items: ['banh_mi_trung_nuong', 'ca_phe_sua_da'], discount: 0.08, cook: true },
  { id: 'trangtron_trasua', icon: '🧋', name: 'Bánh tráng trộn + trà sữa', items: ['banh_trang_tron', 'tra_sua'], discount: 0.1, cook: true },
  { id: 'anvat_chieu', icon: '🌽', name: 'Bắp xào + cá viên chiên', items: ['bap_xao', 'ca_vien_chien'], discount: 0.08, cook: true },
  { id: 'comga_sinhto', icon: '💪', name: 'Cơm gà + sinh tố', items: ['com_hop_ga', 'sinh_to_trai_cay'], discount: 0.1, cook: true },
];

export const comboById = (id: string) => COMBOS.find((c) => c.id === id);

/** Combo đã mở: cả hai món đã mở khóa; combo món nhà làm cần tiệm đã có bếp. */
export const unlockedCombos = (level: number) =>
  COMBOS.filter((c) => (!c.cook || level >= COOK_UNLOCK) && c.items.every((id) => productById(id).unlock <= level));

/** Món đi kèm của `productId` trong các combo đang chạy. */
export function comboPartners(active: readonly string[], productId: string): string[] {
  return active.map(comboById).filter((c): c is ComboDef => !!c && c.items.includes(productId))
    .map((c) => c.items[0] === productId ? c.items[1] : c.items[0]);
}

// ───── Gợi ý combo nên bật khi còn slot (đóng vòng "có số kích hoạt → chọn combo nào") ─────

export interface ComboSuggestion {
  id: string;
  name: string;
  items: string[];
  reason: string;
}

/**
 * Gợi ý combo nên bật khi còn slot — ưu tiên combo gồm món đang bán chạy (top 6 của `sales`)
 * và món chưa bị combo nào đang chạy phủ; bỏ qua combo đang chạy. Chỉ gợi ý khi có dữ liệu bán
 * đủ ý nghĩa (≥2 món đã bán) và có ≥2 combo mở chưa chạy để tránh nhiễu. Lý do ghi theo dữ kiện, không đoán.
 */
export function comboSuggest(
  level: number,
  sales: Record<string, number>,
  activeCombos: readonly string[],
  n = 2,
): ComboSuggestion[] {
  const running = new Set(activeCombos);
  const topIds = Object.entries(sales).filter(([, q]) => q > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  if (topIds.length < 2) return [];
  const topSet = new Set(topIds);
  const partsOfRunning = new Set<string>();
  for (const cid of running) {
    const c = comboById(cid);
    if (c) c.items.forEach((id) => partsOfRunning.add(id));
  }
  const cands = unlockedCombos(level)
    .filter((c) => !running.has(c.id))
    .map((c) => {
      const top = c.items.filter((id) => topSet.has(id));
      const uncovered = c.items.filter((id) => !partsOfRunning.has(id));
      // Món mới mở (5 cấp gần nhất): khách lạ thích thử, chưa combo nào phủ
      const fresh = c.items.filter((id) => productById(id).unlock >= level - 5).length;
      const score = top.length * 10 + uncovered.length * 4 + fresh * 2;
      return { c, score, top, uncovered };
    })
    .sort((a, b) => b.score - a.score);
  if (!cands.length) return [];
  return cands.slice(0, n).map(({ c, top, uncovered }) => {
    const parts: string[] = [];
    if (top.length) parts.push(`gồm ${top.map((id) => productById(id).name).join(', ')} bán chạy của bạn`);
    if (uncovered.length) parts.push(`món ${uncovered.map((id) => productById(id).name).join(', ')} chưa combo nào phủ`);
    return { id: c.id, name: c.name, items: c.items, reason: parts.join(' · ') || 'combo mới cho tiệm' };
  });
}

/**
 * Giảm giá combo cho một giỏ: ghép từng cặp đủ món (mỗi món chỉ dùng cho một combo), giảm trên giá thực trả.
 * Trả về số tiền giảm và số combo đã ghép.
 */
export function comboDiscount(active: readonly string[], basket: readonly { id: string; price: number }[]) {
  const left = [...basket].sort((a, b) => b.price - a.price);
  let discount = 0;
  let count = 0;
  const byCombo: Record<string, number> = {};
  const byDiscount: Record<string, number> = {};
  for (const c of active.map(comboById)) {
    if (!c) continue;
    for (;;) {
      const a = left.findIndex((it) => it.id === c.items[0]);
      const b = left.findIndex((it) => it.id === c.items[1]);
      if (a < 0 || b < 0) break;
      const cut = Math.round(((left[a].price + left[b].price) * c.discount) / 100) * 100;
      discount += cut;
      count++;
      byCombo[c.id] = (byCombo[c.id] ?? 0) + 1;
      byDiscount[c.id] = (byDiscount[c.id] ?? 0) + cut;
      left.splice(Math.max(a, b), 1);
      left.splice(Math.min(a, b), 1);
    }
  }
  return { discount, count, byCombo, byDiscount };
}
