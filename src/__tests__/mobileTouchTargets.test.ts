import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GĐ1836 — chuẩn cảm ứng mobile (review đợt 2 R10 + đợt 4 R5): đo DOM 375×812 thấy nút dock
 * 35px, nhãn 9px, nút tốc độ 26px — dưới chuẩn "vùng bấm ≥44px" của chính docs/qa-guide.md;
 * tiêu đề panel Sổ đầu ngày bọc 3 dòng ở 375px. Khoá ở mức CSS/khung (không thêm nút — Luật 9).
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const css = () => read('src/ui/hud.css');

/** Khối "Màn hẹp" là occurrence ĐẦU của @media (max-width: 700px) (khối sau là màn ngang 812×375). */
const mqNarrow = () => {
  const start = css().indexOf('@media (max-width: 700px)');
  return css().slice(start, css().indexOf('@media (max-width: 700px)', start + 1));
};
const mqTablet = () => css().slice(css().indexOf('@media (min-width: 701px) and (max-width: 1000px)'), css().indexOf('/* (Màn rất hẹp'));

describe('cảm ứng mobile ≥44px, nhãn ≥11px (GĐ1836)', () => {
  it('màn hẹp ≤700px: nhãn dock 11px, nút dock + tốc độ ≥44px', () => {
    const mq = mqNarrow();
    expect(mq).toContain('font-size: 11px');
    expect(mq).not.toContain('font-size: 9px');
    expect(mq).toContain('min-width: 44px');
    expect(mq).toContain('min-height: 48px');
    expect(mq).toContain('min-height: 44px');
  });

  it('máy tính bảng 701–1000px: cùng chuẩn (điểm chạm cảm ứng, không phải chỉ điện thoại)', () => {
    const mq = mqTablet();
    expect(mq).toContain('font-size: 11px');
    expect(mq).not.toContain('font-size: 9px');
    expect(mq).toContain('min-width: 44px');
  });

  it('tiêu đề Sổ đầu ngày bản mobile rút gọn (IS_MOBILE dùng một nguồn chân lý từ shared)', () => {
    const panel = read('src/ui/panels/MorningPanel.tsx');
    expect(panel).toContain('IS_MOBILE');
    expect(panel).toContain('Sổ đầu ngày {day} ({today.day}/{today.month})');
    expect(read('src/ui/panels/shared.tsx')).toContain('export const IS_MOBILE');
  });
});
