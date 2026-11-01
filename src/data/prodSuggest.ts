import { CROPS, inSeason } from './garden';
import { COOK_UNLOCK, COOKED_PRODUCT_IDS, RECIPES, type CookingStation } from './recipes';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';
import { HOT_FOOD_MUL, NIGHT_ITEMS, type BranchState } from './branches';
import { productById } from './products';

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
}

const MAX_EACH = 2;
const MAX_TOTAL = 5;
const BRANCH_MAX_EACH = 2;

export function prodSuggestToday(a: ProdSuggestArgs): ProdSugg[] {
  const out: ProdSugg[] = [];

  // ── 🌾 Nên trồng: cây đúng mùa (+50% năng suất) mà sản phẩm đang hot / kho thiếu ──
  if (a.level >= 8) {
    const low = (id: string) => (a.storage[id] ?? 0) < 8;
    for (const c of CROPS) {
      if (c.unlock > a.level) continue;
      if (!inSeason(c, a.day)) continue;
      const hot = a.hot.includes(c.productId);
      const missing = low(c.productId);
      if (!hot && !missing) continue;
      const season = c.season ? 'đang mùa +50%' : '';
      const why = [hot ? 'khách săn' : '', season, missing ? 'kệ thiếu' : ''].filter(Boolean).join(', ');
      out.push({ icon: '🌾', label: c.name, detail: `trồng ngay — ${why}`, panel: 'garden' });
      if (out.length >= MAX_EACH) break;
    }
  }

  // ── 🍲 Nên nấu: công thức trạm đã mở, đủ nguyên liệu, món ra đang hot ──
  if (a.level >= COOK_UNLOCK) {
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
  if (a.level >= QUAN_NUOC_UNLOCK && a.quanNuocOpen && a.quanNuocShort) {
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
