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

  it('pool đủ rộng cho lăn sự kiện dài hạn: tổng số mẫu ≥ 30 (GĐ164: 4 def chuyển thành arc 2–3 ngày; GĐ165: bổ sung 5 def; GĐ283: cam_do_mo chuyển thành arc thứ 5)', () => {
    // SURPRISES −1 (cam_do_mo) + SURPRISE_ARCS +1 (arc E) → tổng pool 35 giữ nguyên
    expect(SURPRISES.length).toBeGreaterThanOrEqual(30);
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

// GĐ165 — 5 def một-phát cấp thấp bổ sung (chuot_kho · tre_dau_cau · ban_ghe_hong · mat_dien_trua · xe_khach_do)
describe('GĐ165 — 5 def một-phát cấp thấp mới', () => {
  const NEW_IDS = ['chuot_kho', 'tre_dau_cau', 'ban_ghe_hong', 'mat_dien_trua', 'xe_khach_do'];
  const news = SURPRISES.filter((e) => NEW_IDS.includes(e.id));

  it('đủ 5 def GĐ165, id duy nhất, unlock trong [1, 8] đúng band cấp thấp', () => {
    expect(news.map((e) => e.id).sort()).toEqual([...NEW_IDS].sort());
    for (const e of news) {
      expect(e.unlock).toBeGreaterThanOrEqual(1);
      expect(e.unlock).toBeLessThanOrEqual(8);
    }
  });

  it('mỗi def mới 2–3 lựa chọn, text ≤ 160 ký tự (nhịp câu gọn như def cũ)', () => {
    for (const e of news) {
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.length).toBeLessThanOrEqual(3);
      expect(e.text.length).toBeLessThanOrEqual(160);
    }
  });

  it('quy mô thưởng một-phát: money |≤100k|, xp ≤ 60; không dùng rating/good/needStock (các field arc/đại trà)', () => {
    for (const e of news) {
      for (const c of e.choices) {
        if (c.money !== undefined) expect(Math.abs(c.money), `${e.id} money ${c.money}`).toBeLessThanOrEqual(100000);
        if (c.xp !== undefined) expect(c.xp, `${e.id} xp ${c.xp}`).toBeLessThanOrEqual(60);
        expect(c.rating, `${e.id} phải không có rating`).toBeUndefined();
        expect(c.good, `${e.id} phải không có good (field arc GĐ164)`).toBeUndefined();
        expect(c.needStock, `${e.id} phải không có needStock (field arc GĐ164)`).toBeUndefined();
      }
    }
  });

  it('friendship là +1 với khách quen thật (bac_tam/be_na/chu_ba)', () => {
    for (const e of news) {
      for (const c of e.choices) {
        if (c.friendship) {
          expect(['bac_tam', 'be_na', 'chu_ba'], `${e.id} friendship id lạ`).toContain(c.friendship.id);
          expect(c.friendship.delta).toBe(1);
        }
      }
    }
  });
});
