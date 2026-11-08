import { formatMoney } from '../data/products';

/** GĐ1631: nút mua bị khóa vì thiếu tiền → ghi luôn số thiếu thay vì nút xám câm. */
export const shortLabel = (label: string, price: number, money: number) =>
  money >= price ? label : `Thiếu ${formatMoney(price - money)}`;
