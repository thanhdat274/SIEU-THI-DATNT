import type { Panel } from '../core/gameTypes';
import { FEATURES } from './levels';
import { xpToNext } from './levels';
import { COMBO_UNLOCK } from './combos';
import { GARDEN_UNLOCK } from './garden';
import { SOCIAL_UNLOCK } from './social';
import { ONLINE_UNLOCK } from './online';
import { CONVENIENCE } from './branches';
import { INSPECTION_UNLOCK } from './biz';
import { COOK_UNLOCK } from './recipes';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';

/** GĐ81 — "🗺️ Phía trước": bản đồ toàn ván các HỆ mở khóa theo cấp.
 *  `unlocksAt` (levels.ts) chỉ liệt kê món/kệ/tier/thuộc tính theo cấp và bỏ sót hầu hết hệ lớn
 *  (combo/social/online/chi nhánh/giấy phép/sổ nấu). Panel này gộp toàn bộ hệ lớn level-gated
 *  thành một trình tự trước–sau + khoảng cách XP. Thuần đọc level/xp — không state, không đổi kinh tế.
 *  Mỗi hệ mở khóa đúng lúc cấp hiện tại ≥ atLevel (khớp hằng số thật đã verify). */

export interface SystemUnlock {
  id: string;
  icon: string;
  name: string;
  desc: string;
  atLevel: number;
  panel: () => Panel;
}

/** Các hệ lớn mở khóa theo cấp — nguồn dùng đúng hằng số từ data (không import store). */
export const SYSTEM_UNLOCKS: SystemUnlock[] = [
  { id: 'prices', icon: '💲', name: 'Bảng giá', desc: 'Tự chỉnh giá bán từng món — khách nhạy giá sẽ chê nếu quá đắt.', atLevel: FEATURES.prices, panel: () => ({ type: 'prices' }) },
  { id: 'staff', icon: '👥', name: 'Thuê nhân viên', desc: 'Tuyển người đứng quầy/trông tiệm để mình lo việc khác.', atLevel: FEATURES.staff, panel: () => ({ type: 'staff' }) },
  { id: 'combos', icon: '🎁', name: 'Combo khuyến mãi', desc: 'Ghép món thành combo — khách mua chung, tiệm bán được nhiều hơn.', atLevel: COMBO_UNLOCK, panel: () => ({ type: 'combos' }) },
  { id: 'garden', icon: '🚜', name: 'Trang trại', desc: 'Trồng rau/quả nuôi gà — hàng nhà làm bán được giá hơn.', atLevel: GARDEN_UNLOCK, panel: () => ({ type: 'garden' }) },
  { id: 'social', icon: '📢', name: 'Mạng xã hội', desc: 'Đăng bài kéo khách, có chỉ số ảnh hưởng (social).', atLevel: SOCIAL_UNLOCK, panel: () => ({ type: 'social' }) },
  { id: 'online', icon: '🛵', name: 'Bán online', desc: 'Gian hàng trên app nhận đơn giao tận nhà — thêm kênh doanh thu.', atLevel: ONLINE_UNLOCK, panel: () => ({ type: 'online' }) },
  { id: 'branch', icon: '🏪', name: 'Chi nhánh 24/7', desc: 'Mua mặt bằng mở cửa hàng tiện lợi — cơ sở doanh thu lớn.', atLevel: CONVENIENCE.unlock, panel: () => ({ type: 'branch' }) },
  { id: 'licenses', icon: '🧾', name: 'Giấy phép & thanh tra', desc: 'Giữ giấy phép hợp lệ tránh bị phạt, mở khóa mặt hàng có điều kiện.', atLevel: INSPECTION_UNLOCK, panel: () => ({ type: 'licenses' }) },
  { id: 'cook', icon: '🍳', name: 'Nấu món nhà làm', desc: 'Chế biến món nóng từ nguyên liệu — món nhà làm hút khách.', atLevel: COOK_UNLOCK, panel: () => ({ type: 'cook' }) },
  { id: 'quannuoc', icon: '🧋', name: 'Quán nước đầu ngõ', desc: 'Mở quán nước chuyên đồ uống lấy nguyên liệu từ kho.', atLevel: QUAN_NUOC_UNLOCK, panel: () => ({ type: 'quannuoc' }) },
];

export interface RoadmapItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  atLevel: number;
  /** XP tích lũy còn thiếu từ cấp hiện tại tới khi đủ cấp mở khóa hệ này. */
  xpAway: number;
  panel: () => Panel;
}

/** XP còn thiếu từ `level`/`xp` hiện tại tới khi lên `atLevel` (giống phép LevelPanel). */
export function xpAwayTo(level: number, xp: number, atLevel: number): number {
  if (atLevel <= level) return 0;
  let away = xpToNext(level) - xp;
  for (let k = level + 1; k < atLevel; k++) away += xpToNext(k);
  return away;
}

/** Các hệ lớn CHƯA mở khóa (atLevel > level), xếp theo thứ tự trước→sau kèm khoảng cách XP. */
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
