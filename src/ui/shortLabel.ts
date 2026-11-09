import { formatMoney } from '../data/products';

/** GĐ1631: nút mua bị khóa vì thiếu tiền → ghi luôn số thiếu thay vì nút xám câm. */
export const shortLabel = (label: string, price: number, money: number) =>
  money >= price ? label : `Thiếu ${formatMoney(price - money)}`;

/** GĐ1958: nút khóa vì lý do khác tiền (đã học hôm nay, đủ thợ…) → ghi lý do thay vì vẫn ghi giá. */
export const blockedLabel = (reason: string | null, label: string, price: number, money: number) =>
  reason ?? shortLabel(label, price, money);
