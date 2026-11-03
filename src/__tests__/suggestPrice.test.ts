import { describe, expect, it } from 'vitest';
import { suggestPrice } from '../data/pricing';

describe('suggestPrice — gợi ý giá mỗi ngày (lõi bán hàng)', () => {
  // gao: sell 100000, buy 80000 → ref mặc định (marketIndex=1) = 100000, margin tại 100000 = 0.2 > 0.15
  it('chưa đủ dữ liệu (cả sold lẫn wanted undefined) → giữ giá', () => {
    expect(suggestPrice('gao', 100000, undefined, undefined)).toEqual({ action: 'hold', price: 100000, reason: 'Chưa đủ dữ liệu bán, giữ giá.' });
  });

  it('khách hỏi nhiều mà chê đắt (turnedAway) → hạ giá về mức gợi ý', () => {
    // wanted 6, sold 2 < 6×0.5, giá 110000 > ref 100000
    expect(suggestPrice('gao', 110000, 2, 6)).toEqual({ action: 'cut', price: 100000, reason: 'Khách hỏi nhiều mà chê đắt, nên hạ giá.' });
  });

  it('bán chạy + giá dưới trần → tăng giá (bước 500)', () => {
    const r = suggestPrice('gao', 110000, 6, 6);
    expect(r.action).toBe('raise');
    expect(r.price).toBe(126500); // 110000 × 1.15 làm tròn bước 500
  });

  it('bán chậm + lời còn đủ → hạ giá nhẹ kích cầu (không xuống dưới sàn lãi 5%)', () => {
    const r = suggestPrice('gao', 100000, 0, 0);
    expect(r).toEqual({ action: 'cut', price: 84000, reason: 'Bán chậm, hạ giá nhẹ để kích cầu.' });
  });

  it('bán ổn (không quá nhanh/quá chậm, không bị chê) → giữ giá', () => {
    expect(suggestPrice('gao', 100000, 2, 2).action).toBe('hold');
    expect(suggestPrice('gao', 100000, 2, 2).reason).toBe('Bán ổn, giữ giá.');
  });

  it('hết hàng (bán 0 mà có người hỏi) — không bị coi là "chậm" → giữ, không hạ', () => {
    // sold 0, wanted 2: chờ cấp hàng, CHƯA nên hạ giá vì hạ cũng không bán được
    expect(suggestPrice('gao', 100000, 0, 2)).toEqual({ action: 'hold', price: 100000, reason: 'Bán ổn, giữ giá.' });
  });

  it('cùng suy luận có tolerance hợp lệ (0..1): tolerance ≥1 coi như 1', () => {
    // tolerance 2 bị kẹp về 1 → kết quả như mặc định
    expect(suggestPrice('gao', 110000, 2, 6, 2)).toEqual(suggestPrice('gao', 110000, 2, 6));
  });
});
