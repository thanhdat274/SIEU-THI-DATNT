import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ngân sách chống phình (luật cứng trong promt_game.md): mỗi giai đoạn tự chủ dễ thêm "một nút nhỏ",
 * cộng dồn thành menu 30 nút người chơi mới không biết bấm gì. Test đọc source — rẻ, tất định.
 * Trần là mức đo ngày 2026-10-31; muốn thêm nút thì GỘP vào bảng có sẵn hoặc BỎ một nút cũ.
 * Rút gọn được thì HẠ trần theo số mới — không bao giờ nâng lên.
 */
const HUD_TOOLS_CEILING = { total: 33, dock: 10, more: 23 };
/** Mục tiêu dài hạn (rà soát mỗi 10 GĐ): tổng ≤ 20 nút. */
export const HUD_TOOLS_TARGET = 20;

const root = join(__dirname, '..');

function hudTools(): { label: string; more: boolean }[] {
  const src = readFileSync(join(root, 'ui', 'Hud.tsx'), 'utf8');
  const start = src.indexOf('const tools: Tool[] = [');
  const end = src.indexOf('\n  ];', start);
  expect(start, 'không tìm thấy mảng tools trong Hud.tsx — sửa test cho khớp').toBeGreaterThan(0);
  const body = src.slice(start, end);
  // Mỗi nút là một object bắt đầu bằng `icon:`; nhãn động (atHome ? 'Ra tiệm' : 'Về nhà') vẫn là 1 nút
  return body.split(/\{\s*\n?\s*icon:/).slice(1).map((chunk) => ({
    label: /label:\s*([^,]+),/.exec(chunk)?.[1]?.trim() ?? '?',
    more: /\bmore:\s*true/.test(chunk.split(/\n\s{4}\{/)[0]),
  }));
}

describe('ngân sách chống phình tính năng', () => {
  it('số nút HUD không vượt trần (dock + menu Thêm)', () => {
    const tools = hudTools();
    const more = tools.filter((t) => t.more).length;
    const dock = tools.length - more;
    const msg = `HUD đang có ${tools.length} nút (dock ${dock}, Thêm ${more}). Thêm tính năng thì gộp vào bảng có sẵn hoặc bỏ nút cũ.`;
    expect(tools.length, msg).toBeLessThanOrEqual(HUD_TOOLS_CEILING.total);
    expect(dock, msg).toBeLessThanOrEqual(HUD_TOOLS_CEILING.dock);
    expect(more, msg).toBeLessThanOrEqual(HUD_TOOLS_CEILING.more);
  });

  it('không có hai nút trùng nhãn tĩnh (dấu hiệu tính năng chồng nhau)', () => {
    const labels = hudTools().map((t) => t.label).filter((l) => /^'[^']+'$/.test(l));
    expect(labels.length - new Set(labels).size).toBe(0);
  });
});

/**
 * Thông báo (`notify`) ngắn gọn: người chơi đọc lướt trong 2–3 giây. Quét chuỗi literal trong source;
 * phần nội suy `${...}` tính là 6 ký tự. Trần dài = mức dài nhất hiện có (khoá không dài thêm); số
 * thông báo vượt mục tiêu 90 ký tự cũng khoá ở mức hiện tại và chỉ được giảm.
 */
const NOTIFY_TARGET = 90;
const NOTIFY_CEILING = { maxLen: 90, overTarget: 0 };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === '__tests__' || n === 'dev') return [];
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

export function notifyTexts(): { file: string; text: string; len: number }[] {
  const out: { file: string; text: string; len: number }[] = [];
  const re = /notify\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  for (const f of sourceFiles(root)) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      const text = m[1].slice(1, -1);
      const len = [...text.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, 'xxxxxx')].length;
      out.push({ file: f.slice(root.length + 1), text, len });
    }
  }
  return out;
}

describe('thông báo ngắn gọn', () => {
  it('không thông báo nào dài thêm, số thông báo dài không tăng', () => {
    const all = notifyTexts();
    expect(all.length).toBeGreaterThan(50); // regex còn bắt được thật
    const longest = Math.max(...all.map((t) => t.len));
    const over = all.filter((t) => t.len > NOTIFY_TARGET);
    const worst = [...all].sort((a, b) => b.len - a.len).slice(0, 3).map((t) => `${t.file}: ${t.len}`).join(' · ');
    expect(longest, `thông báo dài nhất ${longest} ký tự (${worst})`).toBeLessThanOrEqual(NOTIFY_CEILING.maxLen);
    expect(over.length, `${over.length} thông báo dài hơn ${NOTIFY_TARGET} ký tự — rút gọn, đừng thêm`).toBeLessThanOrEqual(NOTIFY_CEILING.overTarget);
  });
});
