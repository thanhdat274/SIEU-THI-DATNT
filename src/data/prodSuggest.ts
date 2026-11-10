import { ANIMALS, CROPS, inSeason } from './garden';
import { COOKED_PRODUCT_IDS, RECIPES, type CookingStation } from './recipes';
import { QUAN_RECIPES, quanRecipeById } from './quanRecipes';
import { HOT_FOOD_MUL, NIGHT_ITEMS, type BranchState } from './branches';
import { productById } from './products';
import { hasFeature } from './features';

// ───── Nên hôm nay: chuỗi sản xuất hội tụ (GĐ73) ─────
// Trục MUA đã được soi (GĐ57 "Mua khi rẻ", GĐ22 "Nên nhập gấp") nhưng trục TỰ SẢN XUẤT
// (trồng → nấu → quán nước) chưa có một màn hình nào nối chúng với nhu cầu hôm nay
// (thị trường nóng + thời tiết + mùa vụ + kho thiếu). Helper này THUẦN ĐỌC: ghép
// data sẵn có (garden/recipes/quanNuoc) thành vài "mảnh ghép hôm nay" sắp theo tác động.
// Không import store → không đụng coopGuard; không đổi kinh tế/save.

export interface ProdSugg {
  icon: string;
  label: string;
  detail: string;
  panel: 'garden' | 'cook' | 'quannuoc' | 'order';
}

export interface ProdSuggestArgs {
  level: number;
  day: number;
  /** Id sản phẩm đang "khách săn" tuần này (trending). */
  hot: string[];
  storage: Record<string, number>;
  quanNuocOpen: boolean;
  /** Quán nước hôm qua thiếu đồ uống (wanted > served). */
  quanNuocShort: boolean;
  /** Trạm nấu nào đã mở (theo nội thất người chơi đã mua). */
  stationOpen: (st: CookingStation) => boolean;
  /** Chi nhánh tiện lợi (nếu đã mở) — để gợi ý nấu/chở hàng sang bán đêm. */
  branch?: BranchState | null;
  /** Thực đơn quán nước hiện tại (GĐ1101) — để biết trái cây nào đang bị pha mỗi ngày. */
  quanMenu?: readonly string[];
}

const MAX_EACH = 2;
const MAX_TOTAL = 5;
const BRANCH_MAX_EACH = 2;

/**
 * GĐ1101 — tập id GIỐNG mà thực đơn quán nước đang tiêu thụ nguyên liệu nhà trồng (món đã mở).
 * Thuần đọc: chỉ xem QUAN_RECIPES + CROPS, không đụng state.
 */
export function quanMenuCropNeeds(menu: readonly string[] | undefined, level: number): Set<string> {
  const out = new Set<string>();
  for (const id of menu ?? []) {
    const r = quanRecipeById(id);
    if (!r || r.unlock > level) continue;
    for (const u of r.uses) {
      const crop = CROPS.find((c) => c.productId === u.id);
      if (crop) out.add(crop.id);
    }
  }
  return out;
}

/**
 * GĐ1105/1110 — thực đơn quán có món dùng sản phẩm VẬT NUÔI (sữa tươi của bò) đã mở cấp không?
 * Thuần đọc — ghép QUAN_RECIPES với ANIMALS.
 */
export function quanMenuMilkNeed(menu: readonly string[] | undefined, level: number): boolean {
  return (menu ?? []).some((id) => {
    const r = quanRecipeById(id);
    return !!r && r.unlock <= level && r.uses.some((u) => Object.values(ANIMALS).some((a) => a.productId === u.id));
  });
}

export function prodSuggestToday(a: ProdSuggestArgs): ProdSugg[] {
  const out: ProdSugg[] = [];

  // ── 🌾 Nên trồng: cây đúng mùa (+50% năng suất) mà sản phẩm đang hot / kho thiếu /
  //     thực đơn quán nước đang pha (GĐ1101) ──
  if (a.level >= 8) {
    const low = (id: string) => (a.storage[id] ?? 0) < 8;
    const quanNeeds = quanMenuCropNeeds(a.quanMenu, a.level);
    // GĐ1137 — cây thuộc thực đơn quán đứng trước: không bị cây thường kèn hết 2 suất MAX_EACH
    const inList = CROPS.filter((c) => c.unlock <= a.level && inSeason(c, a.day));
    for (const c of [...inList.filter((c) => quanNeeds.has(c.id)), ...inList.filter((c) => !quanNeeds.has(c.id))]) {
      const hot = a.hot.includes(c.productId);
      const missing = low(c.productId);
      if (!hot && !missing) continue;
      const quanNeed = quanNeeds.has(c.id);
      // GĐ1175 — mùa vụ tính theo ngày CHÍN (`day + days`, khớp harvestYield ripenDay), không phải ngày trồng:
      // cây trồng cuối mùa nhưng chín sang mùa sau không được ghi "+50%".
      const season = c.season && inSeason(c, a.day + c.days) ? 'đang mùa +50%' : '';
      const why = [hot ? 'khách săn' : '', season, missing ? 'kệ thiếu' : '', quanNeed ? 'thực đơn quán cần để pha' : ''].filter(Boolean).join(', ');
      out.push({ icon: '🌾', label: c.name, detail: `trồng ngay — ${why}`, panel: 'garden' });
      if (out.length >= MAX_EACH) break;
    }
    // GĐ1110 — 🐄 Nên nuôi: thực đơn quán có món dùng sữa (Bạc xỉu/Ca cao…) mà kho sữa tươi cạn
    if (quanMenuMilkNeed(a.quanMenu, a.level) && low('sua_tuoi')) {
      out.push({ icon: '🐄', label: 'Bò sữa', detail: 'nuôi lấy sữa — thực đơn quán cần để pha', panel: 'garden' });
    }
    // GĐ1114 — 🧋 Nguyên liệu MUA NGOÀI của thực đơn quán (trà/sữa đặc/đá/cà phê…) cạn → nhập ngay
    // (cây/vật nuôi đã có gợi ý riêng GĐ1101/1110; khớp với "Nút thắt" GĐ1112 ở banner nạp kho)
    const homegrownIds = new Set([...CROPS.map((c) => c.productId), ...Object.values(ANIMALS).map((a2) => a2.productId)]);
    const pushed = new Set<string>();
    for (const id of a.quanMenu ?? []) {
      const r = quanRecipeById(id);
      if (!r || r.unlock > a.level) continue;
      for (const u of r.uses) {
        if (homegrownIds.has(u.id) || pushed.has(u.id) || !low(u.id)) continue;
        pushed.add(u.id);
        out.push({ icon: '🧋', label: productById(u.id).name, detail: 'nhập ngay — thực đơn quán cần để pha', panel: 'order' });
        if (out.length >= MAX_EACH) break;
      }
      if (out.length >= MAX_EACH) break;
    }
  }

  // ── 🍲 Nên nấu: công thức trạm đã mở, đủ nguyên liệu, món ra đang hot ──
  if (hasFeature(a, 'cook')) {
    for (const r of RECIPES) {
      if (r.unlock > a.level) continue;
      if (!a.stationOpen(r.station)) continue;
      if (r.festival) continue; // công thức theo dịp lễ: không nhắc thường nhật
      if (!a.hot.includes(r.outputId)) continue;
      const okInputs = r.inputs.every((ing) => (a.storage[ing.productId] ?? 0) >= ing.quantity);
      if (!okInputs) continue;
      out.push({ icon: '🍲', label: r.name, detail: 'khách săn & đủ nguyên liệu', panel: 'cook' });
      if (out.length >= MAX_TOTAL) break;
    }
  }

  // ── 🧋 Nạp quán nước: quán còn thiếu đồ uống ──
  if (hasFeature(a, 'quanNuoc') && a.quanNuocOpen && a.quanNuocShort) {
    out.push({ icon: '🧋', label: 'Nạp đồ uống cho quán nước', detail: 'hôm qua khách muốn nhiều hơn số bán được', panel: 'quannuoc' });
  }

  // ── Chi nhánh tiện lợi 24/7 (GĐ77): nấu/chở gì sang bán đêm ──
  out.push(...branchNightSuggest(a.branch, a.storage, a.level, a.stationOpen));

  return out.slice(0, MAX_TOTAL);
}

/**
 * Gợi ý riêng cho chi nhánh tiện lợi (GĐ77): tài sản doanh thu xa tiệm chính vốn vắng bóng
 * khỏi vòng "nên hôm nay" — giờ nói rõ (1) món nóng nên nấu ở bếp tiệm chính rồi chở sang
 * bán ×HOT_FOOD_MUL, (2) món đêm kệ lẫn kho đều cạn nên nhập để kệ đêm có hàng. Thuần đọc.
 */
export function branchNightSuggest(
  branch: BranchState | null | undefined,
  storage: Record<string, number>,
  level: number,
  stationOpen: (st: CookingStation) => boolean,
): ProdSugg[] {
  if (!branch?.open) return [];
  const out: ProdSugg[] = [];

  // 🍳 Món nóng: bếp tiệm chính nấu được & kệ chi nhánh cạn → chở sang bán đắt
  for (const r of RECIPES) {
    if (r.unlock > level) continue;
    if (r.festival) continue;
    if (!COOKED_PRODUCT_IDS.has(r.outputId)) continue;
    if (!stationOpen(r.station)) continue;
    if ((branch.shelf[r.outputId] ?? 0) > 0) continue; // kệ còn hàng → không gấp
    const okInputs = r.inputs.every((ing) => (storage[ing.productId] ?? 0) >= ing.quantity);
    if (!okInputs) continue;
    out.push({ icon: '🍳', label: r.name, detail: `nấu chở sang chi nhánh — đồ nóng bán ×${HOT_FOOD_MUL}`, panel: 'cook' });
    if (out.length >= BRANCH_MAX_EACH) break;
  }

  // 🕳️ Món đêm: kệ lẫn kho đều cạn → nhập để kệ đêm có hàng
  for (const id of NIGHT_ITEMS) {
    if (productById(id).unlock > level) continue;
    if ((branch.shelf[id] ?? 0) > 0) continue;
    if ((storage[id] ?? 0) > 0) continue;
    out.push({ icon: '🕳️', label: productById(id).name, detail: 'món đêm chi nhánh thiếu — nhập để kệ đêm có', panel: 'order' });
    if (out.length >= BRANCH_MAX_EACH * 2) break;
  }

  return out;
}
