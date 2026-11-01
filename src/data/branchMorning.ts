import type { BranchState } from './branches';
import { nightNeed, onShift, shelfTotal, hasAlcohol } from './branches';
import { licenseStatus, type LicenseId } from './licenses';

// ───── Tiện lợi 24/7: việc hôm nay (GĐ72) ─────
// Sổ đầu ngày thiếu mọi hướng dẫn chủ động cho chi nhánh (tài sản doanh thu lớn nhất ~45%)
// — trước giờ chỉ có alert reactive trên HUD khi vấn đề ĐANG xảy ra. Helper này liệt kê
// việc SÁNG cần làm cho chi nhánh hôm nay, THUẦN ĐỌC (không tự quyết, không đổi state/kinh tế).
// Có manager thì manager tự xếp ca / che nên im bớt nhân sự, chỉ giữ giấy phép + châm hàng.

export interface BranchChore { icon: string; text: string; danger: boolean }

export function branchMorningPlan(
  branch: BranchState | null,
  storageCases: number,
  licenses: Partial<Record<LicenseId, number>>,
  day: number,
): BranchChore[] {
  if (!branch?.open) return [];
  const items: BranchChore[] = [];
  const manager = branch.staff.some((s) => s.role === 'manager');
  const cashierNight = branch.staff.some((s) => s.role === 'cashier' && onShift(s, 22 * 60));
  const guardNight = branch.staff.some((s) => s.role === 'guard' && onShift(s, 22 * 60));
  const alcohol = hasAlcohol(branch.shelf);

  if (!manager) {
    if (!cashierNight) {
      items.push({ icon: '🌙', text: 'Đêm nay 22h–6h chưa có thu ngân — xếp ca / thuê thêm kẻo mất khách đêm', danger: true });
    }
    if (alcohol && !guardNight) {
      items.push({ icon: '🍺', text: 'Kệ có rượu bia mà đêm chưa có bảo vệ — dễ mất trộm ca đêm', danger: true });
    }
  }
  if (alcohol) {
    const st = licenseStatus(licenses, 'alcohol', day);
    if (st !== 'valid') {
      const word = st === 'none' ? 'chưa có' : st === 'expired' ? 'đã hết hạn' : 'sắp hết hạn';
      items.push({ icon: '🧾', text: `Kệ có rượu bia nhưng giấy phép "Bán rượu bia" ${word} — gia hạn ngay kẻo bị tuần tra xử`, danger: st !== 'expiring' });
    }
  }
  const need = nightNeed();
  if (shelfTotal(branch.shelf) + storageCases < need) {
    items.push({ icon: '🕳️', text: `Kệ ${shelfTotal(branch.shelf)} món + kho chung ${storageCases} thùng < nhu cầu đêm (~${need}) — châm hàng hôm nay kẻo đêm hết`, danger: false });
  }
  return items;
}
