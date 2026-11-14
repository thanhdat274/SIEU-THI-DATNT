import { CONVENIENCE } from '../data/branches';
import { QUAN_NUOC_UNLOCK } from '../data/quanNuoc';
import { SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { INSPECTION_UNLOCK } from '../data/biz';
import { t } from '../core/i18n';

/**
 * Nút HUD gom nhiều bảng cùng chủ đề thành MỘT nút + thanh tab (chống phình HUD).
 * Mỗi tab là một bảng cũ giữ nguyên; `lock` = cấp mở khóa (tab chưa mở thì ẩn khỏi thanh tab).
 */
export type HubTab = readonly [id: string, label: string, lock: number];
export const HUBS: Record<string, readonly HubTab[]> = {
  sosach: [
    ['history', t('hud.theo_doi'), 0],
    ['records', t('hud.ky_luc'), 0],
    ['analytics', t('hud.suc_khoe_mon'), 0],
    ['dossier', t('hud.ho_so'), 0],
    ['roadmap', t('hud.mo_khoa'), 0],
    ['discovery', t('hud.so_tay'), 0],
  ],
  danhtieng: [
    ['reviews', t('hud.danh_gia'), 0],
    ['regulars', t('hud.khach_quen'), 0],
    ['skills', t('hud.danh_hieu'), 0],
    ['licenses', t('hud.giay_phep'), INSPECTION_UNLOCK],
  ],
  morong: [
    ['garden', t('hud.trang_trai'), 8],
    ['quannuoc', t('hud.quan_nuoc'), QUAN_NUOC_UNLOCK],
    ['landmark', t('hud.san_choi'), 0],
    ['branch', t('hud.tien_loi'), CONVENIENCE.unlock],
    ['social', '📱 MXH', SOCIAL_UNLOCK],
    ['online', '📲 Online', ONLINE_UNLOCK],
    ['community', t('hud.cong_dong'), 0],
  ],
};

export const hubOf = (panelType: string): string | undefined =>
  Object.keys(HUBS).find((h) => HUBS[h].some(([id]) => id === panelType));

/** Các tab đã mở khóa ở cấp `level` (cộng tab đang mở dù chưa mở khóa), đúng dạng cho thanh `Tabs`. */
export const hubTabs = (hub: string, level: number, current?: string): [string, string][] =>
  HUBS[hub].filter(([id, , lock]) => level >= lock || id === current).map(([id, label]) => [id, label]);

/** Tab mở đầu tiên khi bấm nút HUD. */
export const hubFirst = (hub: string, level: number): string => hubTabs(hub, level)[0][0];
