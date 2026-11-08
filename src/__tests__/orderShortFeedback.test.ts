import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GĐ1834 — cụm phản hồi nhập hàng (review đợt 3 R4 + đợt 4 R2):
 * (1) hết tiền thì nút "+1 thùng" / "+" / "📦 Nhập ngay" phải nói "Thiếu X₫" theo chuẩn shortLabel
 *     đã dùng khắp panels — không còn nút câm;
 * (2) "✨ Điền theo gợi ý" phải điền đúng NÚT THẮT panel đang nêu (quán nước thiếu ly) trước,
 *     ngân sách dư mới chia cho gợi ý thường — lời khuyên và nút hành động không đi hai đường.
 * Panel là React nên khoá ở mức cấu trúc + hành vi thuần (suggestBudget ngày đầu không đổi —
 * "Đừng phá": case minTotal đã có test riêng trong suggestBudget.test.ts).
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const src = () => read('src/ui/OrderPanel.tsx');

describe('nhập hàng phản hồi thiếu tiền (GĐ1834)', () => {
  it('nút "+1 thùng" ngày đầu và nút đặt hàng dùng nhãn "Thiếu X₫" khi hết tiền', () => {
    expect(src()).toContain('`Thiếu ${formatMoney(caseCost - moneyLeft)}`');
    expect(src()).toContain("shortLabel('📦 Nhập ngay', total, money)");
    expect(src()).toContain("shortLabel('🚚 Đặt giao sáng mai', total, money)");
  });

  it('dòng hàng: bấm + không thêm được thì hiện chip Thiếu X₫ / Hết chỗ cạnh ô số thùng', () => {
    const s = src();
    expect(s).toContain('Thiếu {formatMoney(r.cost * r.size - moneyLeft)}');
    expect(s).toContain('Hết chỗ</span>');
  });

  it('fillSuggest điền nút thắt quán nước TRƯỚC khi chia gợi ý thường (chỉ từ ngày 2)', () => {
    const s = src();
    // nút thắt được tính trước vòng gợi ý thường trong fillSuggest
    const fn = s.slice(s.indexOf('const fillSuggest'), s.indexOf('const fillBranchSheet'));
    expect(fn).toContain('restockTip && restockTip.shortfall > 0');
    expect(fn).toContain('teahouseFillPlan');
    expect(fn.indexOf('teahouseFillPlan')).toBeLessThan(fn.indexOf('for (const r of cand)'));
    // ngày đầu không đụng: bộ 3 món hướng dẫn giữ nguyên
    expect(fn).toContain('g.day > 1');
  });
});
