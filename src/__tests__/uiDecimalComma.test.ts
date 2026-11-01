import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** GĐ537: chữ hiện cho người chơi viết hệ số kiểu Việt (×1,5), không ×1.5. Bỏ qua dòng chú thích. */
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
});

describe('UI dùng dấu phẩy thập phân cho hệ số', () => {
  it('không còn ×N.N trong chữ hiển thị', () => {
    const bad: string[] = [];
    for (const f of files(join(__dirname, '../ui'))) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*')) return;
        if (/×\d+\.\d/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('fmtMul (GĐ539)', () => {
  it('viết hệ số kiểu Việt, bỏ số 0 thừa', async () => {
    const { fmtMul } = await import('../data/products');
    expect(fmtMul(1.25)).toBe('1,25');
    expect(fmtMul(1.5)).toBe('1,5');
    expect(fmtMul(2)).toBe('2');
    expect(fmtMul(1.333)).toBe('1,33');
    expect(fmtMul(2.46, 1)).toBe('2,5');
  });
});

describe('chữ inline không quá nhỏ (GĐ546)', () => {
  it('không có fontSize < 11 trong src/ui', () => {
    const bad: string[] = [];
    for (const f of files(join(__dirname, '../ui'))) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/fontSize: (\d+)(?![.\d])/g)) if (Number(m[1]) < 11) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
