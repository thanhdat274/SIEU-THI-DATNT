import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** GĐ843 — khoá hai sửa HUD mobile (GĐ836, GĐ838): đọc CSS, rẻ và tất định. */
const css = readFileSync(join(__dirname, '..', 'ui', 'hud.css'), 'utf8');

describe('HUD mobile (CSS)', () => {
  it('chip kế hoạch hôm nay cao ≥ 36px trên màn hẹp (cỡ chạm tối thiểu)', () => {
    const m = /#ui \.hud-agenda-chip \{[^}]*min-height:\s*(\d+)px/.exec(css.slice(css.indexOf('@media (max-width: 480px)')));
    expect(m, 'không thấy min-height của hud-agenda-chip trong @media 480px').not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(36);
  });

  it('dải cảnh báo trên màn dọc hẹp có trần chiều cao (không chiếm nửa màn hình)', () => {
    const block = /@media \(max-width: 600px\) \{[\s\S]*?\n\}/.exec(css.slice(css.indexOf('Màn dọc hẹp')));
    expect(block?.[0]).toMatch(/\.hud-alerts \{[^}]*max-height:\s*\d+vh/);
  });

  it('thẻ thông báo hud-alert luôn có max-width 100% và co gọn trên màn thấp (max-height: 480px)', () => {
    expect(css).toMatch(/#ui \.hud-alert \{[\s\S]*?max-width:\s*100%/);
    const lowBlock = /@media \(max-height: 480px\) \{[\s\S]*?\n\}/.exec(css);
    expect(lowBlock?.[0]).toMatch(/#ui \.hud-alert \{[^}]*max-width:\s*min\(100%/);
  });
});
