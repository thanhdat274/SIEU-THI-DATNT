import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoanNoteCard, EveningPrepCallout, MorningNewsCard } from '../ui/panels/MorningNotes';

describe('GĐ938 — MorningNotes', () => {
  it('nợ sắp hạn: viền đỏ; còn xa: không viền', () => {
    const r = (dueDay: number) => renderToStaticMarkup(createElement(LoanNoteCard, { loan: { principal: 100000, dueDay }, day: 10 }));
    expect(r(12)).toContain('Đang nợ ngân hàng'); expect(r(12)).toContain('#e74c3c'); expect(r(12)).toContain('còn 2 ngày');
    expect(r(30)).not.toContain('#e74c3c');
  });
  it('gợi ý nấu tối: có tên món', () => {
    expect(renderToStaticMarkup(createElement(EveningPrepCallout, { name: 'Phở', startBy: 15 * 60 }))).toContain('Phở');
  });
  it('tin sáng: rỗng thì không dựng, có tin thì liệt kê', () => {
    expect(renderToStaticMarkup(createElement(MorningNewsCard, { news: [] }))).toBe('');
    const h = renderToStaticMarkup(createElement(MorningNewsCard, { news: ['A', 'B'] }));
    expect(h).toContain('Tin sáng nay'); expect(h).toContain('>A<'); expect(h).toContain('>B<');
  });
});
