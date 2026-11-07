import { festivalOn } from './calendar';
import { TRAIN_EXP } from './staffTraits';

// GĐ1520 — 🧧 Mừng tuổi nhân viên dịp Tết (Việt hoá cơ chế "bàn lì xì" trong tài liệu tham khảo;
// bỏ phần chia ngẫu nhiên: chủ tiệm lì xì đều tay, mỗi Tết một lần). Đổi tiền lấy kinh nghiệm
// bằng đúng 1 buổi đào tạo cho MỌI người, rẻ hơn đào tạo từng người — phần thưởng ngày lễ, không phá kinh tế.
export const LIXI_PER_STAFF = 100000;
export const LIXI_EXP = TRAIN_EXP;
/** Hai lần cách nhau ít nhất chừng này ngày → không lì xì 2 lần trong cùng một kỳ Tết. */
export const LIXI_GAP_DAYS = 30;

export const lixiCost = (staffCount: number) => staffCount * LIXI_PER_STAFF;

export type LixiBlock = 'not-tet' | 'given' | 'no-staff' | 'money';
export function lixiBlock(day: number, lixiDay: number, staffCount: number, money: number): LixiBlock | null {
  if (festivalOn(day)?.id !== 'tet') return 'not-tet';
  if (lixiDay > 0 && day - lixiDay < LIXI_GAP_DAYS) return 'given';
  if (staffCount <= 0) return 'no-staff';
  if (money < lixiCost(staffCount)) return 'money';
  return null;
}
