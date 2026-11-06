import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Playtest P1 M7: màn ngang thấp — ô đồng hồ chỉ còn 1 dòng. */
describe('HUD màn ngang thấp', () => {
  const css = readFileSync(resolve(__dirname, '../ui/hud.css'), 'utf8');
  it('khối max-height:480px ẩn các dòng phụ của ô đồng hồ', () => {
    const block = css.slice(css.indexOf('@media (max-height: 480px)'));
    expect(block.slice(0, 600)).toContain('.hud-time > span > small ~ small { display: none; }');
  });
});
