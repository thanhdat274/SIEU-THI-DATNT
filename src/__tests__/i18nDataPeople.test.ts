import { describe, it, expect } from 'vitest';
import { REGULARS } from '../data/regularsList';
import { RANDOM_EVENTS } from '../data/events';
import { EN_REGULARS } from '../i18n/en/data/regulars';
import { EN_EVENTS } from '../i18n/en/data/events';
import { localizeFields } from '../i18n/dataLang';

describe('i18n bước 5e — khách quen và sự kiện tiếng Anh', () => {
  it('mọi khách quen có bản Anh, đủ số đặc quyền', () => {
    for (const r of REGULARS) {
      const e = EN_REGULARS[r.id];
      expect(e, r.id).toBeTruthy();
      expect(e.perks.length, r.id).toBe(r.perks.length);
    }
    expect(Object.keys(EN_REGULARS).length).toBe(REGULARS.length);
  });

  it('mọi sự kiện ngẫu nhiên có bản Anh', () => {
    expect(RANDOM_EVENTS.filter((e) => !EN_EVENTS[e.id]).map((e) => e.id)).toEqual([]);
  });

  it('tiếng Việt (mặc định) giữ nguyên chữ', () => {
    expect(REGULARS[0].name).toBe('Bà Năm bán xôi');
    expect(RANDOM_EVENTS[0].title).toBe('Sóng nhiệt');
  });

  it('localizeFields đổi trường theo id ở chế độ Anh', () => {
    const rows = [{ id: 'heatwave', title: 'Sóng nhiệt', blurb: 'x' }];
    localizeFields(rows, EN_EVENTS, 'en');
    expect(rows[0].title).toBe('Heatwave');
  });
});
