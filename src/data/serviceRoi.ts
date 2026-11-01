/**
 * Hoàn vốn dịch vụ quầy (GĐ66 "Dịch vụ nào đáng"): dịch vụ là khoản mua MỘT LẦN (thiết bị/phí đăng ký,
 * giá từ price trong SERVICES) mà trước giờ chỉ thấy một tổng "lời hôm nay" (stats.services) — người chơi
 * không biết từng dịch vụ lấy lại vốn chưa. Helper này đọc hai sổ đã có:
 *   - biz.serviceLife  (tiền lời dịch vụ tích lũy cả ván, ghi ở earnService)  → "đã hoàn vốn chưa"
 *   - stats.byService  (tiền lời dịch vụ hôm nay)                            → ước "bao lâu nữa hoàn vốn"
 * THUẦN QUAN SÁT — không đổi giá dịch vụ/kinh tế/state. Chỉ import hằng số + type (không cycle).
 */
import { type ServiceDef } from './services';

export interface ServiceRoi {
  id: string;
  icon: string;
  name: string;
  /** Tiền lời dịch vụ này đã tích lũy cả ván (có thể âm nếu vé số trả thưởng nhiều). */
  life: number;
  /** Giá mua thiết bị/phí đăng ký. */
  price: number;
  /** Đã lấy lại đủ vốn chưa. */
  paidBack: boolean;
  /** Còn thiếu bao nhiêu nữa là hoàn vốn (≥0; 0 khi đã hoàn). */
  deficit: number;
  /** Tiền lời dịch vụ này hôm nay. */
  today: number;
  /** Ước ngày nữa hoàn vốn theo nhịp hôm nay (0 nếu đã hoàn / hôm nay không lời). */
  daysToRecoup: number;
}

/** Tóm tắt hoàn vốn một dịch vụ từ hai sổ (life = biz.serviceLife, today = stats.byService). */
export function roiOf(def: ServiceDef, life: Record<string, number> | undefined, today: Record<string, number> | undefined): ServiceRoi {
  const lifeAmt = life?.[def.id] ?? 0;
  const todayAmt = today?.[def.id] ?? 0;
  const deficit = Math.max(0, def.price - lifeAmt);
  const paidBack = lifeAmt >= def.price;
  const daysToRecoup = paidBack || todayAmt <= 0 ? 0 : Math.ceil(deficit / todayAmt);
  return { id: def.id, icon: def.icon, name: def.name, life: lifeAmt, price: def.price, paidBack, deficit, today: todayAmt, daysToRecoup };
}
