import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// GĐ1648 — nút "Nhắc nợ" đã bấm thì ghi "Đã nhắc", không mờ câm.
describe('GĐ1648 — nhãn nhắc nợ', () => {
  it('sổ nợ đổi nhãn khi đã nhắc', () => {
    expect(readFileSync('src/ui/panels/DebtBook.tsx', 'utf8')).toContain('d.reminded ? "✅ Đã nhắc" : "Nhắc nợ"');
  });
});
