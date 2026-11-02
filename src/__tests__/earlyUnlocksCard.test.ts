import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EarlyUnlocksCard } from '../ui/panels/EarlyUnlocksCard';
import { earlyUnlockTeaser } from '../data/unlockMap';

/** GĐ922 — EarlyUnlocksCard tách khỏi MorningPanel: dựng được (SSR) từ dữ liệu teaser thật của ngày đầu. */
describe('GĐ922 — EarlyUnlocksCard', () => {
  it('dựng thẻ "Sắp mở khóa" từ earlyUnlockTeaser ngày 1', () => {
    const teaser = earlyUnlockTeaser({ level: 1, xp: 0, day: 1 });
    expect(teaser).not.toBeNull();
    const html = renderToStaticMarkup(createElement(EarlyUnlocksCard, { earlyUnlocks: teaser! }));
    expect(html).toContain('Sắp mở khóa');
    expect(html).toContain('XP');
  });
});
