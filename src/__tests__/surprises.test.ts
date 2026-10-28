import { describe, it, expect } from 'vitest';
import { SURPRISES } from '../data/biz';

describe('SURPRISES — dữ liệu sự kiện bất ngờ nhất quán', () => {
  it('id không trùng lặp và mỗi sự kiện có đầy đủ tiêu đề, mô tả, ít nhất 2 lựa chọn', () => {
    const ids = SURPRISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of SURPRISES) {
      expect(e.title).toBeTruthy();
      expect(e.text).toBeTruthy();
      expect(e.unlock).toBeGreaterThanOrEqual(0);
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('mọi lựa chọn đều có nhãn + kết quả, và phần thưởng/chip phí hợp lý', () => {
    for (const e of SURPRISES) {
      for (const c of e.choices) {
        expect(c.label).toBeTruthy();
        expect(c.result).toBeTruthy();
        if (c.money !== undefined) expect(Math.abs(c.money)).toBeGreaterThan(0);
        if (c.xp !== undefined) expect(c.xp).toBeGreaterThan(0);
        if (c.rating !== undefined) expect(c.rating).toBeGreaterThan(0);
        // Chi phí không được quá lớn so với phần thưởng khả dĩ, tránh phá cân bằng sớm
        if (c.money !== undefined && c.money < 0) expect(c.money).toBeGreaterThanOrEqual(-100000);
      }
    }
  });

  it('pool đủ rộng cho lăn sự kiện dài hạn: tổng số mẫu ≥ 26 (GĐ164: 4 def chuyển thành arc 2–3 ngày — surpriseArcs.ts)', () => {
    expect(SURPRISES.length).toBeGreaterThanOrEqual(26);
  });

  it('mọi lựa chọn nằm trong biên cân bằng: money [-200000, 200000], xp [-80, 80], nhãn không rỗng', () => {
    for (const e of SURPRISES) {
      for (const c of e.choices) {
        expect(c.label.trim().length).toBeGreaterThan(0);
        if (c.money !== undefined) {
          expect(c.money).toBeGreaterThanOrEqual(-200000);
          expect(c.money).toBeLessThanOrEqual(200000);
        }
        if (c.xp !== undefined) {
          expect(c.xp).toBeGreaterThanOrEqual(-80);
          expect(c.xp).toBeLessThanOrEqual(80);
        }
      }
    }
  });

  it('mô tả sự kiện ngắn gọn dễ đọc: text ≤ 160 ký tự', () => {
    for (const e of SURPRISES) {
      expect(e.text.length).toBeLessThanOrEqual(160);
    }
  });
});
