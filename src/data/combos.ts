import { productById } from './products';

/** Combo khuyến mãi: mua đủ các món trong combo thì giảm giá cả cặp; khách thấy biển combo hay mua kèm. */
export interface ComboDef {
  id: string;
  icon: string;
  name: string;
  items: [string, string];
  /** Phần giảm trên tổng giá hai món. */
  discount: number;
}

/** Cấp mở bảng combo. */
export const COMBO_UNLOCK = 6;
/** Số combo được chạy cùng lúc (ít thì mới phải chọn). */
export const MAX_ACTIVE_COMBOS = 3;
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
];

export const comboById = (id: string) => COMBOS.find((c) => c.id === id);

/** Combo đã mở: cả hai món đã mở khóa. */
export const unlockedCombos = (level: number) => COMBOS.filter((c) => c.items.every((id) => productById(id).unlock <= level));

/** Món đi kèm của `productId` trong các combo đang chạy. */
export function comboPartners(active: readonly string[], productId: string): string[] {
  return active.map(comboById).filter((c): c is ComboDef => !!c && c.items.includes(productId))
    .map((c) => c.items[0] === productId ? c.items[1] : c.items[0]);
}

/**
 * Giảm giá combo cho một giỏ: ghép từng cặp đủ món (mỗi món chỉ dùng cho một combo), giảm trên giá thực trả.
 * Trả về số tiền giảm và số combo đã ghép.
 */
export function comboDiscount(active: readonly string[], basket: readonly { id: string; price: number }[]) {
  const left = [...basket].sort((a, b) => b.price - a.price);
  let discount = 0;
  let count = 0;
  for (const c of active.map(comboById)) {
    if (!c) continue;
    for (;;) {
      const a = left.findIndex((it) => it.id === c.items[0]);
      const b = left.findIndex((it) => it.id === c.items[1]);
      if (a < 0 || b < 0) break;
      discount += Math.round(((left[a].price + left[b].price) * c.discount) / 100) * 100;
      count++;
      left.splice(Math.max(a, b), 1);
      left.splice(Math.min(a, b), 1);
    }
  }
  return { discount, count };
}
