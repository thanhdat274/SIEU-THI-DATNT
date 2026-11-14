import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fmtDate, fmtNum, locale } from '../core/format';
import { toUsdText } from '../core/currency';

/** Liệt kê file nguồn (bỏ test) — để chặn định dạng số/ngày viết cứng 'vi-VN'. */
function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe('định dạng số/ngày theo ngôn ngữ (i18n bước 2)', () => {
  it('fmtNum: vi chấm, en phẩy; mặc định vi', () => {
    expect(fmtNum(1234567)).toBe('1.234.567');
    expect(fmtNum(1234567, undefined, 'en')).toBe('1,234,567');
    expect(locale('en')).toBe('en-US');
  });

  it('fmtDate theo ngôn ngữ', () => {
    const d = new Date(2026, 10, 14);
    const o = { day: '2-digit', month: '2-digit' } as const;
    expect(fmtDate(d, o, 'vi')).toBe(d.toLocaleDateString('vi-VN', o)); // dấu ngăn tùy ICU (14/11 hoặc 14-11)
    expect(fmtDate(d, o, 'en')).toBe('11/14');
  });

  it('đổi đô la hiểu cả số kiểu Anh, không nhầm phần thập phân', () => {
    expect(toUsdText('Thu 12,000đ')).toBe('Thu $0.48');
    expect(toUsdText('chi 1,500,000 đ')).toBe('chi $60.00');
    expect(toUsdText('Thu 12.000đ')).toBe('Thu $0.48');
  });

  it("không còn toLocaleString/toLocaleDateString('vi-VN') viết cứng trong src", () => {
    const root = path.resolve(__dirname, '..');
    const hits = sources(root)
      .filter((f) => !f.endsWith(path.join('core', 'format.ts')))
      .filter((f) => /toLocale(Date|Time)?String\(\s*'vi-VN'/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });
});
