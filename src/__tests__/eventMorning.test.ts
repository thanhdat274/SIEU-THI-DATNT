import { describe, expect, it } from 'vitest';
import { eventMorning, eventOn } from '../data/events';

describe('eventMorning — câu báo sáng khi hôm nay có sự kiện (Sổ đầu ngày)', () => {
  it('không có sự kiện → null (khớp hẳn eventOn)', () => {
    // sweep tất định tìm ngày không có sự kiện — eventMorning phải về null đúng lúc đó
    let foundNone = false;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        if (!eventOn(seed, day, 40)) {
          expect(eventMorning(seed, day, 40)).toBeNull();
          foundNone = true;
          break;
        }
      }
      if (foundNone) break;
    }
    expect(foundNone).toBe(true);
  });

  it('có sự kiện → tiền tố đúng kind (Tin vui / Cẩn thận) và đủ icon-tên-tin', () => {
    let good = 0;
    let bad = 0;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        const e = eventOn(seed, day, 40);
        if (!e) continue;
        const msg = eventMorning(seed, day, 40)!;
        expect(msg).toContain(`${e.icon} ${e.title} — ${e.blurb}`);
        if (e.kind === 'good') {
          expect(msg.startsWith('Tin vui: ')).toBe(true);
          good++;
        } else {
          expect(msg.startsWith('Cẩn thận: ')).toBe(true);
          bad++;
        }
      }
    }
    // Cả hai loại sự kiện đều xuất hiện trong sweep → cả hai nhánh tiền tố được chạm
    expect(good).toBeGreaterThan(0);
    expect(bad).toBeGreaterThan(0);
  });

  it('xác định theo seed/day: cùng đối số ra cùng câu (hai máy nhìn chung 1 tin)', () => {
    for (let seed = 0; seed < 5; seed++) {
      for (let day = 2; day <= 60; day++) {
        expect(eventMorning(seed, day, 40)).toBe(eventMorning(seed, day, 40));
      }
    }
  });
});
