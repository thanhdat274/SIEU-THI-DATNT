/**
 * Công thức pha chế quán nước (GĐ415): quán không chỉ bán lại nước đóng chai mà PHA từ nguyên liệu
 * trong kho chung (trà, cà phê, sữa đặc, đá, trái cây…). Người chơi chọn tối đa QUAN_MENU_SLOTS món lên
 * thực đơn; thực đơn càng đa dạng khách càng đông. Món pha lời hơn nước chai nhiều nhưng phải nhập đủ
 * từng nguyên liệu — thiếu một thứ là món đó ngừng bán. Hoàn toàn xác định (không Math.random).
 */
import { productById } from './products';

export interface QuanRecipe {
  id: string;
  name: string;
  icon: string;
  /** Cấp mở công thức (quán nước mở ở cấp 29). */
  unlock: number;
  /** Giá một ly ở mức giá "vừa phải". */
  price: number;
  /** Mỗi nguyên liệu: một đơn vị trong kho pha được bao nhiêu ly. */
  uses: { id: string; cups: number }[];
}

export const QUAN_RECIPES: QuanRecipe[] = [
  { id: 'tra_da', name: 'Trà đá', icon: '🧊', unlock: 29, price: 5_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_den', name: 'Cà phê đen đá', icon: '☕', unlock: 29, price: 15_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'nuoc_chanh', name: 'Nước chanh', icon: '🍋', unlock: 29, price: 12_000, uses: [{ id: 'x_chanh_khong_hat', cups: 8 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'nuoc_mia', name: 'Nước mía', icon: '🎋', unlock: 29, price: 12_000, uses: [{ id: 'mia', cups: 4 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_sua', name: 'Cà phê sữa đá', icon: '🥛', unlock: 30, price: 20_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'cam_vat', name: 'Cam vắt', icon: '🍊', unlock: 31, price: 22_000, uses: [{ id: 'x_cam', cups: 3 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'chanh_day', name: 'Chanh dây đá', icon: '💛', unlock: 32, price: 18_000, uses: [{ id: 'x_chanh_day', cups: 6 }, { id: 'x_duong', cups: 30 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'bac_xiu', name: 'Bạc xỉu', icon: '🤎', unlock: 33, price: 25_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 25 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_cao_sua', name: 'Ca cao sữa', icon: '🍫', unlock: 34, price: 22_000, uses: [{ id: 'x_bot_cacao', cups: 10 }, { id: 'sua_tuoi', cups: 6 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to', name: 'Sinh tố trái cây', icon: '🍓', unlock: 35, price: 28_000, uses: [{ id: 'traicay', cups: 3 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'tra_sua_dua', name: 'Trà sữa cốt dừa', icon: '🥥', unlock: 38, price: 25_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_dua_cot_hop', cups: 8 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'sinh_to_xoai', name: 'Sinh tố xoài', icon: '🥭', unlock: 39, price: 30_000, uses: [{ id: 'x_xoai', cups: 3 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'ca_phe_muoi', name: 'Cà phê muối', icon: '🧂', unlock: 40, price: 28_000, uses: [{ id: 'x_ca_phe_hoa_tan', cups: 15 }, { id: 'x_sua_dac', cups: 10 }, { id: 'x_muoi', cups: 60 }, { id: 'x_nuoc_da', cups: 10 }] },
  { id: 'tra_gung', name: 'Trà gừng nóng', icon: '🫚', unlock: 36, price: 15_000, uses: [{ id: 'tra', cups: 40 }, { id: 'x_gung', cups: 12 }, { id: 'x_duong', cups: 30 }] },
];

/** Số món tối đa trên thực đơn. */
export const QUAN_MENU_SLOTS = 4;
/** Mỗi món thêm trên thực đơn (từ món thứ hai) kéo thêm 8% khách. */
export const QUAN_VARIETY_BONUS = 0.08;

export const quanRecipeById = (id: string) => QUAN_RECIPES.find((r) => r.id === id);
export const quanRecipesAt = (level: number) => QUAN_RECIPES.filter((r) => level >= r.unlock);

/** Thực đơn hợp lệ: bỏ id lạ / chưa mở / trùng, cắt theo số ô. */
export function cleanMenu(menu: readonly string[] | undefined, level: number, slots = QUAN_MENU_SLOTS): string[] {
  const out: string[] = [];
  for (const id of menu ?? []) {
    const r = quanRecipeById(id);
    if (r && level >= r.unlock && !out.includes(id)) out.push(id);
  }
  return out.slice(0, slots);
}

/** Dòng chữ bảng phấn trên quầy 3D (GĐ416): tên món + giá nghìn đồng; chưa chọn món = nước chai. */
export const menuBoardLines = (menu: readonly string[] | undefined): string[] => {
  const rs = (menu ?? []).map(quanRecipeById).filter((r): r is QuanRecipe => !!r);
  return rs.length ? rs.map((r) => `${r.name} ${r.price / 1000}k`) : ['Nước giải khát chai'];
};

/** Hệ số khách theo độ đa dạng thực đơn: 1 món ×1, 4 món ×1.24. */
export const varietyMul = (menuSize: number) => 1 + QUAN_VARIETY_BONUS * Math.max(0, menuSize - 1);

/** Số ly tối đa pha được của một công thức với kho hiện có (thiếu một nguyên liệu = 0). */
export function recipeCapacity(r: QuanRecipe, storage: Record<string, number>): number {
  return Math.min(...r.uses.map((u) => Math.floor((storage[u.id] ?? 0) * u.cups)));
}

/** Giá vốn nguyên liệu một ly (để người chơi so lời với nước chai). */
export const recipeCupCost = (r: QuanRecipe) => r.uses.reduce((n, u) => n + productById(u.id).buy / u.cups, 0);

export interface BrewResult { cups: Record<string, number>; total: number; revenue: number; short: string[] }

/**
 * Pha `wanted` ly chia đều cho các món trên thực đơn (dư thì món đứng trước nhận trước). Mỗi món pha
 * tối đa tới sức chứa nguyên liệu, rút kho qua `take` (làm tròn LÊN số đơn vị nguyên liệu đã mở).
 * Món thiếu nguyên liệu ghi vào `short`; phần khách không được phục vụ trả về cho nước chai lo.
 * Tính trên bản sao `storage` để các món sau thấy kho còn lại (đá, đường dùng chung); kho thật chỉ đổi qua `take`.
 */
export function brewMenu(
  menu: readonly string[], storage: Record<string, number>, wanted: number, priceMul: number,
  take: (id: string, qty: number) => void,
): BrewResult {
  const left = { ...storage };
  const cups: Record<string, number> = {};
  const short: string[] = [];
  let total = 0;
  let revenue = 0;
  const recipes = menu.map(quanRecipeById).filter((r): r is QuanRecipe => !!r);
  recipes.forEach((r, i) => {
    const want = Math.floor(wanted / recipes.length) + (i < wanted % recipes.length ? 1 : 0);
    const n = Math.min(want, recipeCapacity(r, left));
    if (n < want) short.push(r.id);
    if (n <= 0) return;
    for (const u of r.uses) {
      const units = Math.min(left[u.id] ?? 0, Math.ceil(n / u.cups));
      left[u.id] = (left[u.id] ?? 0) - units;
      take(u.id, units);
    }
    cups[r.id] = n;
    total += n;
    revenue += n * r.price * priceMul;
  });
  return { cups, total, revenue: Math.round(revenue), short };
}
