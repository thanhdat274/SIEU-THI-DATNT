import { describe, it, expect } from 'vitest';
import { planDay, planDoneRatio, DAYPLAN_CAP, type DayAction } from '../data/dayPlan';

const a = (t: string, danger = false, priority = 1, icon = '📦'): DayAction => ({ icon, text: t, panel: 'branch', danger, priority });

describe('GĐ76 — Việc hôm nay: một bảng đúng thứ tự (dayPlan)', () => {
  it('xếp việc danger trước việc thường', () => {
    const out = planDay([a('thường A'), a('bức thiết', true), a('thường B')]);
    expect(out[0].text).toBe('bức thiết');
    expect(out[0].danger).toBe(true);
  });
  it('trong cùng tầng danger, giữ thứ tự priority (nhỏ trước)', () => {
    const out = planDay([a('urg', true, 2), a('urg0', true, 0), a('urg1', true, 1)]);
    expect(out.map((x) => x.text)).toEqual(['urg0', 'urg1', 'urg']);
  });
  it('trong tầng thường, giữ thứ tự priority', () => {
    const out = planDay([a('p3', false, 3), a('p1', false, 1), a('p2', false, 2)]);
    expect(out.map((x) => x.text)).toEqual(['p1', 'p2', 'p3']);
  });
  it('khử trùng mục trùng text (giữ bản đầu)', () => {
    const out = planDay([a('nhắc hàng thiếu'), a('nhắc hàng thiếu'), a('khác')]);
    expect(out).toHaveLength(2);
    expect(out.filter((x) => x.text === 'nhắc hàng thiếu')).toHaveLength(1);
  });
  it('cap mặc định 7 (giữ ngữ cảnh top dù có nhiều việc)', () => {
    const many = Array.from({ length: 20 }, (_, i) => a(`việc ${i}`));
    const out = planDay(many);
    expect(out.length).toBe(DAYPLAN_CAP);
    expect(out.length).toBe(7);
  });
  it('nguồn rỗng → mảng rỗng', () => {
    expect(planDay([])).toEqual([]);
  });
  it('planDoneRatio trả chuỗi xong/tổng', () => {
    const out = planDay([a('a'), a('b'), a('c')]);
    expect(planDoneRatio(out, 2)).toBe('2/3');
  });
  it('định lực: cùng đầu vào cho kết quả giống nhau', () => {
    const cand = [a('x', true), a('y'), a('x', true)];
    expect(planDay(cand)).toEqual(planDay(cand));
  });
});
