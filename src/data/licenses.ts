/**
 * Giấy phép của tiệm: kinh doanh, an toàn thực phẩm (khi có bếp hoặc bán đồ tươi), bán rượu bia.
 * Phép có hạn, hết hạn phải gia hạn. Thanh tra (định kỳ và đột xuất) kiểm cả giấy phép: thiếu phép bắt buộc
 * là phạt riêng từng tờ. Trượt thanh tra mấy lần liền thì bị đình chỉ kinh doanh một ngày.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/endDay` và `core/slices/licenses`.
 */
import { productById } from './products';

export type LicenseId = 'business' | 'food' | 'alcohol';

export interface LicenseDef {
  id: LicenseId;
  icon: string;
  name: string;
  desc: string;
  /** Bắt buộc từ cấp này (trước đó thanh tra không hỏi). */
  unlock: number;
  cost: number;
  /** Số ngày hiệu lực mỗi lần cấp/gia hạn. */
  days: number;
}

export const LICENSES: LicenseDef[] = [
  { id: 'business', icon: '📜', name: 'Giấy phép kinh doanh', desc: 'Bắt buộc với mọi tiệm', unlock: 12, cost: 300000, days: 60 },
  { id: 'food', icon: '🥗', name: 'Chứng nhận an toàn thực phẩm', desc: 'Bắt buộc khi có trạm nấu hoặc bày bán đồ tươi', unlock: 14, cost: 500000, days: 45 },
  { id: 'alcohol', icon: '🍺', name: 'Giấy phép bán rượu bia', desc: 'Bắt buộc khi bày bán bia, rượu', unlock: 16, cost: 400000, days: 60 },
];

export const licenseById = (id: LicenseId) => LICENSES.find((l) => l.id === id)!;

/** Phạt mỗi giấy phép bắt buộc mà không có / đã hết hạn. */
export const LICENSE_FINE = 200000;
/** Còn chừng này ngày thì nhắc gia hạn. */
export const RENEW_WARN_DAYS = 5;
/** Lần đầu phải có một giấy phép thì được chừng này ngày ân hạn trước khi bị phạt. */
export const LICENSE_GRACE = 5;
/** Thanh tra đột xuất khi có khách phản ánh (từng này lời chê ≤2★ trong ngày) hoặc tiệm đang có lần trượt: xác suất mỗi ngày. */
export const COMPLAINTS_FOR_SURPRISE = 3;
export const SURPRISE_INSPECTION = 0.35;
/** Trượt thanh tra liền chừng này lần thì bị đình chỉ một ngày. */
export const SUSPEND_AFTER = 3;

const ALCOHOL = new Set(['bia', 'bia_chai', 'ruou', 'ruou_gao']);
export const isAlcohol = (id: string) => ALCOHOL.has(id) || /^(bia|ruou)/.test(id);

export type LicenseStatus = 'none' | 'valid' | 'expiring' | 'expired';

/** `licenses` lưu ngày hết hạn của từng phép. */
export function licenseStatus(licenses: Partial<Record<LicenseId, number>>, id: LicenseId, day: number): LicenseStatus {
  const until = licenses[id];
  if (until === undefined) return 'none';
  if (until < day) return 'expired';
  return until - day < RENEW_WARN_DAYS ? 'expiring' : 'valid';
}

export interface LicenseNeedCtx {
  level: number;
  hasCookStation: boolean;
  /** Mã các món đang bày trên kệ. */
  shelved: string[];
}

/** Các giấy phép tiệm đang bắt buộc phải có. */
export function requiredLicenses(ctx: LicenseNeedCtx): LicenseId[] {
  const out: LicenseId[] = [];
  const fresh = ctx.shelved.some((id) => productById(id).category === 'fresh' || productById(id).category === 'meat');
  for (const l of LICENSES) {
    if (ctx.level < l.unlock) continue;
    if (l.id === 'business') out.push(l.id);
    if (l.id === 'food' && (ctx.hasCookStation || fresh)) out.push(l.id);
    if (l.id === 'alcohol' && ctx.shelved.some(isAlcohol)) out.push(l.id);
  }
  return out;
}

/** Giấy phép bắt buộc mà đang thiếu hoặc hết hạn. */
export const missingLicenses = (licenses: Partial<Record<LicenseId, number>>, need: LicenseId[], day: number) =>
  need.filter((id) => { const s = licenseStatus(licenses, id, day); return s === 'none' || s === 'expired'; });

export interface InspectionRecord {
  /** Số lần trượt liên tiếp. */
  strikes: number;
  /** Bị đình chỉ: không được mở cửa trong ngày này. */
  suspendedDay?: number;
  /** Ngày thanh tra gần nhất và kết quả, để hiện ở bảng. */
  lastDay?: number;
  lastPass?: boolean;
  /** Ngày đầu tiên tiệm được nhắc phải có từng giấy phép (tính ân hạn). */
  noticed?: Partial<Record<LicenseId, number>>;
}

export const newInspection = (): InspectionRecord => ({ strikes: 0 });
