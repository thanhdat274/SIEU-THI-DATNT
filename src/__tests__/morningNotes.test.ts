import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoanNoteCard, EveningPrepCallout } from '../ui/panels/MorningNotes';

describe('GĐ938 — MorningNotes', () => {
  it('nợ sắp hạn: viền đỏ; còn xa: không viền', () => {
    const r = (dueDay: number) => renderToStaticMarkup(createElement(LoanNoteCard, { loan: { principal: 100000, dueDay }, day: 10 }));
    expect(r(12)).toContain('Đang nợ ngân hàng'); expect(r(12)).toContain('#e74c3c'); expect(r(12)).toContain('còn 2 ngày');
    expect(r(30)).not.toContain('#e74c3c');
  });
  it('gợi ý nấu tối: có tên món', () => {
    expect(renderToStaticMarkup(createElement(EveningPrepCallout, { name: 'Phở', startBy: 15 * 60 }))).toContain('Phở');
  });
});
