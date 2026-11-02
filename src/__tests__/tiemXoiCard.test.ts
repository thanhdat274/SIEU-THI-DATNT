import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TiemXoiCard } from '../ui/panels/TiemXoiCard';

/** GĐ924 — TiemXoiCard tách khỏi MorningPanel: dựng được (SSR) khi mới mở. */
describe('GĐ924 — TiemXoiCard', () => {
  it('mới mở: báo kết quả có sau đêm đầu', () => {
    const html = renderToStaticMarkup(createElement(TiemXoiCard, { tiemXoi: { open: true, staff: 1 } as never, last: undefined as never }));
    expect(html).toContain('Tiệm xôi');
    expect(html).toContain('Mới mở');
  });
});
