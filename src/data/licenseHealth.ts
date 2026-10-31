/**
 * GĐ243 "Giấy phép còn thiếu/đang phạt tiền?" — soi tình trạng giấy phép bắt buộc của tiệm.
 *
 * Tiệm từ cấp 12 cần giấy phép (business/food/alcohol); thiếu/hết hạn sẽ bị phạt từng tờ
 * (LICENSE_FINE = 200k), trượt thanh tra liền mấy lần còn đình chỉ một ngày (licenses.ts). Trước GĐ243
 * chưa có chỗ gộp "tiệm mình đang thiếu/hết hạn những phép nào và phạt bao nhiêu" — quyết định chi
 * tiền gia hạn rõ ràng. Helper này THUẦN ĐỌC (map `licenses` + danh sách `need` từ requiredLicenses +
 * `day`): liệt kê trạng thái từng phép bắt buộc, nhóm missing (thiếu/hết hạn → phạt) và expiring
 * (trong RENEW_WARN_DAYS → nên gia hạn). Không đổi state/save/kinh tế, không RNG.
 */
import {
  LICENSE_FINE, licenseById, licenseStatus, RENEW_WARN_DAYS,
  type LicenseId, type LicenseStatus,
} from './licenses';

export interface LicenseLine {
  id: LicenseId;
  icon: string;
  name: string;
  status: LicenseStatus;
  /** Số ngày còn hiệu lực (null khi chưa có hoặc đã hết hạn). */
  daysLeft: number | null;
  /** Chi phí cấp/gia hạn. */
  renewCost: number;
  /** Thiếu hoặc hết hạn → nguy cơ phạt. */
  missing: boolean;
  /** Còn trong RENEW_WARN_DAYS → nên gia hạn sớm. */
  expiring: boolean;
}

export interface LicenseHealth {
  /** Các phép bắt buộc đang cần, kèm trạng thái. */
  lines: LicenseLine[];
  /** Thiếu/hết hạn (sẽ bị phạt). */
  missing: LicenseLine[];
  /** Sắp hết hạn (trong RENEW_WARN_DAYS). */
  expiring: LicenseLine[];
  /** Tổng tiền phạt nếu bị thanh tra ngay: missing × LICENSE_FINE. */
  fineExposure: number;
  verdict: 'ok' | 'warn' | 'danger';
}

export function licenseHealth(licenses: Partial<Record<LicenseId, number>>, need: LicenseId[], day: number): LicenseHealth {
  const lines: LicenseLine[] = need.map((id) => {
    const def = licenseById(id);
    const status = licenseStatus(licenses, id, day);
    const daysLeft = status === 'valid' || status === 'expiring' ? (licenses[id] ?? 0) - day : null;
    const missing = status === 'none' || status === 'expired';
    const expiring = status === 'expiring';
    return { id, icon: def.icon, name: def.name, status, daysLeft, renewCost: def.cost, missing, expiring };
  }).sort((a, b) => Number(b.missing) - Number(a.missing) || Number(b.expiring) - Number(a.expiring));

  const missing = lines.filter((l) => l.missing);
  const expiring = lines.filter((l) => l.expiring);
  const fineExposure = missing.length * LICENSE_FINE;
  let verdict: LicenseHealth['verdict'];
  if (missing.length > 0) verdict = 'danger';
  else if (expiring.length > 0) verdict = 'warn';
  else verdict = 'ok';

  return { lines, missing, expiring, fineExposure, verdict };
}

/** Áp dụng độc lập: `need` mặc định mọi phép mở khóa theo cấp — dùng nếu caller chưa tự tính. */
export { RENEW_WARN_DAYS };
