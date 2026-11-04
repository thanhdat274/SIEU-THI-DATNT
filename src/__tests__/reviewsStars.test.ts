import { describe, it, expect } from 'vitest';
import { starRuleText } from '../data/reviews';

/**
 * GĐ1218 — lời giải thích CÁCH CHẤM SAO trên thẻ "Danh tiếng": bảng sao đã bày tổng + lý do, nhưng
 * không nói vì sao bị TRỪ (món hỏng −1 / chờ nửa patience −1 / đáy 1) để người chơi biết sửa nắm nào.
 * `starRuleText` là helper THUẦN ghép đúng luật `reviewStars` (GĐ1216) từ hằng — test khóa nội dung.
 */
describe('starRuleText — lời giải thích cách chấm sao (THUẦN, không đụng state/save)', () => {
  it('nêu đúng luật reviewStars: nền 5 sao, món hỏng −1, chờ quá nửa patience −1, đáy 1 sao', () => {
    const t = starRuleText();
    expect(t).toContain('5 sao');
    expect(t).toContain('−1');
    expect(t).toContain('1 sao');
    expect(t).toContain('nửa thời gian chịu đựng');
  });
  it('liệt kê đủ 4 nguồn chê thường gặp (stock/price/wait/expired) để người chơi biết nắm nào cần vặn', () => {
    const t = starRuleText();
    for (const cause of ['hết hàng', 'giá cao', 'chờ lâu', 'hàng cận hạn']) {
      expect(t).toContain(cause);
    }
  });
  it('helper thuần: cùng bản chạy nào cũng ra cùng chuỗi (không đổi theo trạng thái)', () => {
    expect(starRuleText()).toBe(starRuleText());
  });
});
