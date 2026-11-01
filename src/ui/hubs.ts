import { CONVENIENCE } from '../data/branches';
import { QUAN_NUOC_UNLOCK } from '../data/quanNuoc';
import { SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { INSPECTION_UNLOCK } from '../data/biz';

/**
 * Nút HUD gom nhiều bảng cùng chủ đề thành MỘT nút + thanh tab (chống phình HUD).
 * Mỗi tab là một bảng cũ giữ nguyên; `lock` = cấp mở khóa (tab chưa mở thì ẩn khỏi thanh tab).
 */
export type HubTab = readonly [id: string, label: string, lock: number];
export const HUBS: Record<string, readonly HubTab[]> = {
  sosach: [
    ['history', '📊 Theo dõi', 0],
    ['records', '🏆 Kỷ lục', 0],
    ['analytics', '🩺 Sức khoẻ món', 0],
    ['dossier', '📖 Hồ sơ', 0],
    ['roadmap', '🗺️ Mở khóa', 0],
    ['discovery', '🔍 Sổ tay', 0],
  ],
  danhtieng: [
    ['reviews', '💬 Đánh giá', 0],
    ['regulars', '💛 Khách quen', 0],
    ['skills', '🏅 Danh hiệu', 0],
    ['licenses', '📜 Giấy phép', INSPECTION_UNLOCK],
  ],
  morong: [
    ['garden', '🚜 Trang trại', 8],
    ['quannuoc', '🧋 Quán nước', QUAN_NUOC_UNLOCK],
    ['landmark', '🏗️ Sân chơi', 0],
    ['branch', '🏪 Tiện lợi', CONVENIENCE.unlock],
    ['social', '📱 MXH', SOCIAL_UNLOCK],
    ['online', '📲 Online', ONLINE_UNLOCK],
  ],
};

export const hubOf = (panelType: string): string | undefined =>
  Object.keys(HUBS).find((h) => HUBS[h].some(([id]) => id === panelType));

/** Các tab đã mở khóa ở cấp `level` (cộng tab đang mở dù chưa mở khóa), đúng dạng cho thanh `Tabs`. */
export const hubTabs = (hub: string, level: number, current?: string): [string, string][] =>
  HUBS[hub].filter(([id, , lock]) => level >= lock || id === current).map(([id, label]) => [id, label]);

/** Tab mở đầu tiên khi bấm nút HUD. */
export const hubFirst = (hub: string, level: number): string => hubTabs(hub, level)[0][0];
