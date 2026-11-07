import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { festivalOn } from '../data/calendar';
import { HUD_THEMES, hudThemeOn } from '../data/hudTheme';

/** GĐ1521 — theme HUD theo dịp lễ: Tết/Trung thu/Giáng sinh, ngày thường giữ theme mặc định. */
const days = Array.from({ length: 400 }, (_, i) => i + 1);
describe('hudTheme (GĐ1521)', () => {
  it('Tết, Trung thu, Giáng sinh có theme; ngày không lễ thì null', () => {
    for (const [fid, th] of [['tet', 'tet'], ['trung_thu', 'trung_thu'], ['giang_sinh', 'giang_sinh']]) {
      const d = days.find((x) => festivalOn(x)?.id === fid)!;
      expect(hudThemeOn(d)).toBe(th);
    }
    expect(hudThemeOn(days.find((x) => !festivalOn(x))!)).toBeNull();
  });
  it('mỗi theme có khối CSS đổi màu nhấn', () => {
    const css = readFileSync('src/ui/hud.css', 'utf8');
    for (const t of HUD_THEMES) expect(css).toMatch(new RegExp(`data-hud-theme='${t}'\][^}]*--hud-accent`));
  });
});
