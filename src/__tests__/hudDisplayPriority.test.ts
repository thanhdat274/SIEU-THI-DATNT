import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GĐ1835 — cụm hiển thị (review đợt 2 R5 + đợt 3 R6 + đợt 4 R4):
 * (1) dải mẹo "Bạn có biết?" nhường đỉnh màn cho banner lễ hội — không gối nhau;
 * (2) toast phát khi thoại chương đang mở được GIỮ (armMessage) — bấm xong thoại mới đếm 3 giây,
 *     hết cảnh "ăn sáng trừ 20k mà không thấy tin" (bản chất Đ1-R7 tái hiện qua lớp hiển thị);
 * (3) toast nổi trên backdrop panel/card thoại (z-index).
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('thứ tự hiển thị HUD (GĐ1835)', () => {
  it('mẹo "Bạn có biết" ẩn khi đang có banner lễ hội', () => {
    const hud = read('src/ui/Hud.tsx');
    const tip = hud.slice(hud.indexOf('function TipStrip'), hud.indexOf('function TipStrip') + 1200);
    expect(tip).toContain('festival');
    expect(tip).toContain("festival.traffic >= 1.2 || !!festival.pull");
  });

  it('toast phát lúc thoại mở bị giữ tới khi bấm xong thoại (armMessage)', () => {
    const clock = read('src/core/slices/clock.ts');
    expect(clock).toContain('if (get().biz.chapterPending) return;');
    expect(clock).toContain('armMessage: () => {');
    const story = read('src/core/bizStory.ts');
    expect(story).toContain('S().armMessage();');
  });

  it('toast nổi trên backdrop panel/card thoại nhưng dưới tour/hộp xác nhận', () => {
    const css = read('src/ui/hud.css');
    const toast = css.slice(css.indexOf('#ui .hud-toast'), css.indexOf('#ui .hud-toast-btn'));
    expect(toast).toContain('z-index: 55;');
  });
});
