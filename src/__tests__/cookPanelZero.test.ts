import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Playtest đợt 2 P0 M2: `{own && …}` với own = 0 (số) làm React in chữ "0" lạc ("/mẻ0").
describe('Sổ nấu không in số 0 lạc khi chưa có trạm', () => {
  it('không còn điều kiện JSX dạng {own && …} (own là số)', () => {
    const src = readFileSync(resolve(__dirname, '../ui/panels/CookPanel.tsx'), 'utf8');
    expect(src).not.toMatch(/\{own &&/);
  });
});
