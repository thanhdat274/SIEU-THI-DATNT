import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Chuẩn hoá xuống dòng LF: git lưu các file này LF, nhưng trên checkout Windows chúng
// materialized thành CRLF — assertion vốn ghép chuỗi bằng `\n` nên lệch môi trường, không
// phải lệch nội dung. Đọc `\r\n`→`\n` để test bất biến dù checkout ở hệ điều hành nào.
const text = (p: string) => readFileSync(join(__dirname, p), 'utf-8').replace(/\r\n/g, '\n');
const fontsCss = text('../../src/ui/fonts.css');
const indexHtml = text('../../index.html');

describe('font tự host (GĐ1259 — hết phụ thuộc CDN Google Fonts)', () => {
  it('fonts.css khai báo @font-face cục bộ (/fonts/...) cho đủ bộ', () => {
    for (const needle of [
      "font-family: 'Be Vietnam Pro';\n  font-style: normal;\n  font-weight: 400;",
      "font-family: 'Be Vietnam Pro';\n  font-style: normal;\n  font-weight: 600;",
      "font-family: 'Be Vietnam Pro';\n  font-style: normal;\n  font-weight: 700;",
      "font-family: 'Paytone One';",
      "font-family: 'Baloo 2';",
    ]) {
      expect(fontsCss).toContain(needle);
    }
    expect(fontsCss).not.toContain('https://fonts.gstatic.com');
    expect((fontsCss.match(/url\('\/fonts\//g) ?? []).length).toBeGreaterThanOrEqual(14);
  });

  it('index.html không còn nạp font từ CDN (offline vẫn giữ đúng chữ Việt)', () => {
    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
  });

  it('tít thương hiệu dùng Baloo 2 (giờ HUD, tiêu đề panel, biển hiệu đăng nhập)', () => {
    const hud = text('../../src/ui/hud.css');
    expect(hud).toContain("#ui .hud-time b, .panel h2, .login-sign h1 {\n  font-family: 'Baloo 2'");
  });
});
