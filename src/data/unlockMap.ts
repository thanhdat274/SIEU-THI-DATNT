import type { Panel } from '../core/gameTypes';
import { FEATURES } from './levels';
import { xpToNext } from './levels';
import { COMBO_UNLOCK } from './combos';
import { GARDEN_UNLOCK, LAND_TIERS } from './garden';
import { SOCIAL_UNLOCK } from './social';
import { ONLINE_UNLOCK } from './online';
import { CONVENIENCE } from './branches';
import { INSPECTION_UNLOCK } from './biz';
import { COOK_UNLOCK } from './recipes';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';
import { SHOP_TIERS } from './shopTiers';

/** GĐ81 — "🗺️ Phía trước": bản đồ toàn ván các HỆ + MỐC LỚN mở khóa theo cấp.
 *  `unlocksAt` (levels.ts) chỉ liệt kê món/kệ/tier/thuộc tính theo cấp và bỏ sót hầu hết hệ lớn
 *  (combo/social/online/chi nhánh/giấy phép/sổ nấu). Panel này gộp toàn bộ hệ lớn level-gated
 *  thành một trình tự trước–sau + khoảng cách XP. Thuần đọc level/xp — không state, không đổi kinh tế.
 *  Mỗi hệ mở khóa đúng lúc cấp hiện tại ≥ atLevel (khớp hằng số thật đã verify).
 *  GĐ168: nạp các mốc lớn còn lại (bậc tiệm/đất trại/chương truyện/Tái sinh) — bản đồ không rỗng
 *  tới cấp 75, hết đoạn khô 31–44 (audit tiến trình 29/10, backlog mục 5). */

export interface SystemUnlock {
  id: string;
  icon: string;
  name: string;
  desc: string;
  atLevel: number;
  /** Bảng mở nhanh liên quan. Mốc tự vận hành (chương truyện tự phát trên HUD) bỏ trống — UI ẩn nút "Xem". */
  panel?: () => Panel;
}

/** Định dạng tiền Việt cho mô tả mốc (7.000.000đ) — chỉ để hiện, không phải logic kinh tế. */
const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
/** Tra bậc theo tên thật trong data — đổi tên/di giá data sẽ vỡ test (cố ý), không vỡ im lặng. */
const shopTier = (name: string) => SHOP_TIERS.find((t) => t.name === name)!;
const landTier = (name: string) => LAND_TIERS.find((t) => t.name === name)!;

/** Các hệ lớn + mốc lớn mở khóa theo cấp — nguồn dùng đúng hằng số từ data (không import store).
 *  GĐ168 nạp lại bản đồ cho cấp 30+ (audit tiến trình 29/10, backlog mục 5): trước đây dừng ở cấp 29
 *  (Quán Nước) → từ cấp 30 badge 🗺️ = 0 và panel rỗng, đúng lúc vào đoạn khô 31–44. Các MỐC LỚN dưới
 *  đây lấy đúng tên + điều kiện thật: bậc tiệm (SHOP_TIERS), đất trại (LAND_TIERS), chương truyện
 *  (CHAPTERS), Tái sinh (PRESTIGE_MIN_LEVEL — core/prestige.ts, test khớp hằng số thật). Mốc cần cả
 *  tiền + cấp thì desc ghi kèm tiền (điều kiện phụ); thứ tự bản đồ vẫn xếp theo cấp. */
export const SYSTEM_UNLOCKS: SystemUnlock[] = [
  { id: 'prices', icon: '💲', name: 'Bảng giá', desc: 'Tự chỉnh giá bán từng món — khách nhạy giá sẽ chê nếu quá đắt.', atLevel: FEATURES.prices, panel: () => ({ type: 'prices' }) },
  { id: 'staff', icon: '👥', name: 'Thuê nhân viên', desc: 'Tuyển người đứng quầy/trông tiệm để mình lo việc khác.', atLevel: FEATURES.staff, panel: () => ({ type: 'staff' }) },
  { id: 'combos', icon: '🎁', name: 'Combo khuyến mãi', desc: 'Ghép món thành combo — khách mua chung, tiệm bán được nhiều hơn.', atLevel: COMBO_UNLOCK, panel: () => ({ type: 'combos' }) },
  { id: 'garden', icon: '🚜', name: 'Trang trại', desc: 'Trồng rau/quả nuôi gà — hàng nhà làm bán được giá hơn.', atLevel: GARDEN_UNLOCK, panel: () => ({ type: 'garden' }) },
  { id: 'social', icon: '📢', name: 'Mạng xã hội', desc: 'Đăng bài kéo khách, có chỉ số ảnh hưởng (social).', atLevel: SOCIAL_UNLOCK, panel: () => ({ type: 'social' }) },
  { id: 'online', icon: '🛵', name: 'Bán online', desc: 'Gian hàng trên app nhận đơn giao tận nhà — thêm kênh doanh thu.', atLevel: ONLINE_UNLOCK, panel: () => ({ type: 'online' }) },
  { id: 'branch', icon: '🏪', name: 'Chi nhánh 24/7', desc: 'Mua mặt bằng mở cửa hàng tiện lợi — cơ sở doanh thu lớn.', atLevel: CONVENIENCE.unlock, panel: () => ({ type: 'branch' }) },
  { id: 'licenses', icon: '🧾', name: 'Giấy phép & thanh tra', desc: 'Giữ giấy phép hợp lệ tránh bị phạt, mở khóa mặt hàng có điều kiện.', atLevel: INSPECTION_UNLOCK, panel: () => ({ type: 'licenses' }) },
  { id: 'land_mua_dat', icon: '🌳', name: landTier('Mua thêm đất phía sau').name, desc: `Nông trại lên 8 luống, chuồng nuôi thêm vịt ngan — ${vnd(landTier('Mua thêm đất phía sau').cost)}.`, atLevel: landTier('Mua thêm đất phía sau').unlock, panel: () => ({ type: 'garden' }) },
  { id: 'cook', icon: '🍳', name: 'Nấu món nhà làm', desc: 'Chế biến món nóng từ nguyên liệu — món nhà làm hút khách.', atLevel: COOK_UNLOCK, panel: () => ({ type: 'cook' }) },
  { id: 'land_trai_dau_ngo', icon: '🌳', name: landTier('Trang trại đầu ngõ').name, desc: `12 luống + nuôi heo, bò, dê, đông tảo — ${vnd(landTier('Trang trại đầu ngõ').cost)}.`, atLevel: landTier('Trang trại đầu ngõ').unlock, panel: () => ({ type: 'garden' }) },
  { id: 'quannuoc', icon: '🧋', name: 'Quán nước đầu ngõ', desc: 'Mở quán nước chuyên đồ uống lấy nguyên liệu từ kho.', atLevel: QUAN_NUOC_UNLOCK, panel: () => ({ type: 'quannuoc' }) },
  { id: 'tier_mini_mart', icon: '🏪', name: shopTier('Mini mart').name, desc: `Nới tiệm ${shopTier('Mini mart').width}×${shopTier('Mini mart').depth} — đủ chỗ thêm kệ, tủ lạnh, quầy phụ — ${vnd(shopTier('Mini mart').price)}.`, atLevel: shopTier('Mini mart').unlock, panel: () => ({ type: 'build' }) },
  { id: 'ch10_mat_tien', icon: '📖', name: 'Chương 10 · Mặt tiền khang trang', desc: 'Cốt truyện tự mở khi đủ cấp (cần cả bậc tiệm Siêu thị tạp hóa) — thưởng 6.000.000đ.', atLevel: 40 },
  { id: 'tier_sieu_thi', icon: '🏪', name: shopTier('Siêu thị tạp hóa').name, desc: `Nới tiệm ${shopTier('Siêu thị tạp hóa').width}×${shopTier('Siêu thị tạp hóa').depth}, tiền nhà tăng theo bậc — ${vnd(shopTier('Siêu thị tạp hóa').price)}.`, atLevel: shopTier('Siêu thị tạp hóa').unlock, panel: () => ({ type: 'build' }) },
  { id: 'ch11_dem_den_sang', icon: '📖', name: 'Chương 11 · Đêm nào cũng đèn sáng', desc: 'Cốt truyện tự mở khi đủ cấp — thưởng 10.000.000đ.', atLevel: 55 },
  { id: 'tier_khang_trang', icon: '🏪', name: shopTier('Siêu thị khang trang').name, desc: `Nới tiệm ${shopTier('Siêu thị khang trang').width}×${shopTier('Siêu thị khang trang').depth} — mặt tiền lớn nhất hẻm — ${vnd(shopTier('Siêu thị khang trang').price)}.`, atLevel: shopTier('Siêu thị khang trang').unlock, panel: () => ({ type: 'build' }) },
  // Tái sinh: PRESTIGE_MIN_LEVEL / PRESTIGE_MIN_REVENUE (core/prestige.ts) — hardcode ở đây kèm comment,
  // test khớp hằng số thật để không kéo cả graph store vào file data thuần.
  { id: 'prestige_tai_sinh', icon: '🌟', name: 'Tái sinh (NG+)', desc: 'Làm lại từ cấp 1 giữ bộ sưu tập, doanh thu cả đời +8%/lần — cần cả doanh thu cả đời ≥ 100.000.000đ.', atLevel: 60, panel: () => ({ type: 'business' }) },
  { id: 'ch12_ngo_nho_thanh_danh', icon: '📖', name: 'Chương 12 · Ngõ nhỏ thành danh', desc: 'Chương cuối cốt truyện, tự mở khi đủ cấp — thưởng 20.000.000đ.', atLevel: 75 },
  { id: 'tier_dai_sieu_thi', icon: '🏪', name: shopTier('Đại siêu thị').name, desc: `Bậc mở rộng cuối cùng: ${shopTier('Đại siêu thị').width}×${shopTier('Đại siêu thị').depth} — ${vnd(shopTier('Đại siêu thị').price)}.`, atLevel: shopTier('Đại siêu thị').unlock, panel: () => ({ type: 'build' }) },
];

export interface RoadmapItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  atLevel: number;
  /** XP tích lũy còn thiếu từ cấp hiện tại tới khi đủ cấp mở khóa hệ này. */
  xpAway: number;
  panel?: () => Panel;
}

/** XP còn thiếu từ `level`/`xp` hiện tại tới khi lên `atLevel` (giống phép LevelPanel). */
export function xpAwayTo(level: number, xp: number, atLevel: number): number {
  if (atLevel <= level) return 0;
  let away = xpToNext(level) - xp;
  for (let k = level + 1; k < atLevel; k++) away += xpToNext(k);
  return away;
}

/** Các hệ lớn + mốc lớn CHƯA mở khóa (atLevel > level), xếp theo thứ tự trước→sau kèm khoảng cách XP. */
export function roadmapAhead({ level, xp }: { level: number; xp: number }): RoadmapItem[] {
  return SYSTEM_UNLOCKS
    .filter((s) => s.atLevel > level)
    .map((s) => ({ id: s.id, icon: s.icon, name: s.name, desc: s.desc, atLevel: s.atLevel, xpAway: xpAwayTo(level, xp, s.atLevel), panel: s.panel }))
    .sort((a, b) => a.atLevel - b.atLevel);
}

/** Hệ lớn gần nhất sắp mở khóa (đầu roadmap), null khi đã mở hết. */
export function nextRoadmap(road: RoadmapItem[]): RoadmapItem | null {
  return road[0] ?? null;
}

// ───── GĐ132: mồi "🧭 Sắp mở khóa" cho người chơi MỚI — đưa tiến trình vào Sổ đầu ngày ─────
// Tuần đầu, Sổ đầu ngày (sáng) nhắc 1–2 hệ lớn sắp mở + còn bao nhiêu XP — đóng cảm giác "nhìn thấy
// cái sắp tới" cho người mới (GĐ126 chỉ nhắc "ngày mai có gì", chưa nhắc "mốc mở khóa"). THUẦN đọc.

/** Tuần đầu coi là giai đoạn onboarding để bật mồi mở khóa. */
export const ONBOARD_DAYS = 7;
/** Số hệ sắp mở tối đa nhắc trong Sổ đầu ngày (giữ gọn, không nhiễu). */
export const EARLY_TEASER_COUNT = 2;

/** NULL khi ngoài tuần đầu hoặc không còn hệ nào sắp mở — để ẩn thẻ. */
export type EarlyUnlockTeaser = RoadmapItem;
export function earlyUnlockTeaser({ level, xp, day }: { level: number; xp: number; day: number }): EarlyUnlockTeaser[] | null {
  if (day > ONBOARD_DAYS) return null;
  const road = roadmapAhead({ level, xp });
  if (!road.length) return null;
  return road.slice(0, EARLY_TEASER_COUNT);
}
