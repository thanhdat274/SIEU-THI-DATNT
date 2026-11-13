import { describe, expect, it } from 'vitest';
import { moneyShown, toUsdText, usdText } from '../core/currency';
import { formatMoney } from '../data/products';
import { sanitize } from '../core/settings';

describe('tiền tệ hiển thị', () => {
  it('formatMoney luôn là đồng', () => {
    expect(formatMoney(12000)).toBe('12.000đ');
  });
  it('đổi đô la: số nhỏ 2 chữ số, số lớn làm tròn', () => {
    expect(usdText(12000)).toBe('$0.48');
    expect(usdText(25000)).toBe('$1.00');
    expect(usdText(5_000_000)).toBe('$200');
    expect(usdText(-12500)).toBe('-$0.50');
  });
  it('đổi mọi kiểu viết đồng trong một đoạn chữ', () => {
    expect(toUsdText('Thu 12.000đ, chi 1.500.000 đ, lãi 25000₫')).toBe('Thu $0.48, chi $60.00, lãi $1.00');
    expect(toUsdText('+50.000đ/ngày')).toBe('+$2.00/ngày');
  });
  it('không đụng chữ thường có chữ đ', () => {
    for (const t of ['10 đơn hàng', 'Ngày 5 đi chợ', '3 đồng đội', 'đ', 'Mở lúc 6h']) expect(toUsdText(t)).toBe(t);
  });
  it('chữ vẽ lên canvas theo tiền tệ chọn', () => {
    expect(moneyShown(12000, 'vnd')).toBe('12.000đ');
    expect(moneyShown(12000, 'usd')).toBe('$0.48');
  });
  it('độ phân giải: rác về auto', () => {
    expect(sanitize({ resolution: '4k' }).resolution).toBe('auto');
    expect(sanitize({ resolution: '720' }).resolution).toBe('720');
  });
});
