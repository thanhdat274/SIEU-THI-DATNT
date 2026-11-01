import type { Panel } from '../core/gameTypes';

/** GĐ64 — mồi "Thử ngay" khi một hệ CHÍNH mở khóa sau ngày 1 (onboarding mid-game).
 *  Mỗi hệ mở khóa ở một cấp; người chơi thấy banner CTA một lần, đánh dấu `biz.unlockActs` khi xem/đóng.
 *  Bản lưu cũ thiếu `biz.unlockActs` → tự bù [] qua MERGE_DEEP (NO SAVE_VERSION). */
export interface UnlockActDef {
  id: string;
  level: number;
  icon: string;
  title: string;
  hint: string;
  panel: () => Panel;
}

export const UNLOCK_ACTS: UnlockActDef[] = [
  { id: 'prices', level: 3, icon: '💲', title: 'Bảng giá', hint: 'Tự chỉnh giá bán từng món — khách nhạy giá sẽ chê nếu quá đắt.', panel: () => ({ type: 'prices' }) },
  { id: 'staff', level: 4, icon: '👥', title: 'Thuê nhân viên', hint: 'Tuyển người đứng quầy/trông tiệm để mình lo việc khác.', panel: () => ({ type: 'staff' }) },
  { id: 'combos', level: 6, icon: '🎁', title: 'Combo khuyến mãi', hint: 'Ghép món thành combo — khách mua chung, tiệm bán được nhiều hơn.', panel: () => ({ type: 'combos' }) },
  { id: 'garden', level: 8, icon: '🚜', title: 'Trang trại', hint: 'Trồng rau/quả nuôi gà — hàng nhà làm bán được giá hơn.', panel: () => ({ type: 'garden' }) },
  { id: 'online', level: 10, icon: '🛵', title: 'Bán online', hint: 'Mở gian hàng trên app nhận đơn giao tận nhà — thêm kênh doanh thu.', panel: () => ({ type: 'online' }) },
  { id: 'branch', level: 10, icon: '🏪', title: 'Mặt bằng chi nhánh', hint: 'Mua chỗ mở cửa hàng 24/7 — cơ sở doanh thu lớn.', panel: () => ({ type: 'branch' }) },
  { id: 'cook', level: 21, icon: '🍳', title: 'Nấu món nhà làm', hint: 'Chế biến món nóng từ nguyên liệu — món nhà làm hút khách.', panel: () => ({ type: 'cook' }) },
  { id: 'quannuoc', level: 29, icon: '🧋', title: 'Quán nước đầu ngõ', hint: 'Mở quán nước chuyên đồ uống lấy nguyên liệu từ kho.', panel: () => ({ type: 'quannuoc' }) },
];

/** Act mở khóa (≤ level hiện tại) đầu tiên mà người chơi chưa xem — mồi tuần tự thấp→cao. Null khi chưa đạt/hết. */
export function pendingUnlockAct(biz: { unlockActs?: string[] } | undefined, level: number): UnlockActDef | null {
  const done = new Set(biz?.unlockActs ?? []);
  return UNLOCK_ACTS.find((a) => a.level <= level && !done.has(a.id)) ?? null;
}
