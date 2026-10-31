import { describe, expect, it } from 'vitest';
import { productById } from '../data/products';
import {
  newTiemXoi, tiemXoiCapacity, tiemXoiDay, tiemXoiIds, tiemXoiSaved,
  TIEM_XOI_COST_MUL, TIEM_XOI_PER_COOK, TIEM_XOI_TARGET, TIEM_XOI_UNLOCK, TIEM_XOI_WAGE,
} from '../data/tiemXoi';

/** GĐ410 — Tiệm xôi: nấu bù kho chung theo ngày, xác định, giá vốn rẻ hơn nhập lẻ. */

const run = (staff: number, storage: Record<string, number> = {}) => {
  const put: Record<string, number> = {};
  const r = tiemXoiDay({ open: true, staff }, TIEM_XOI_UNLOCK, storage, (id, q) => { put[id] = (put[id] ?? 0) + q; });
  return { r: r!, put };
};

describe('tiemXoi', () => {
  it('chưa mở: không nấu', () => {
    expect(tiemXoiDay(newTiemXoi(), TIEM_XOI_UNLOCK, {}, () => { throw new Error('không được cất'); })).toBeNull();
  });

  it('chỉ món xôi lẻ, không combo', () => {
    const ids = tiemXoiIds(TIEM_XOI_UNLOCK);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain('combo_xoi_doi');
  });

  it('kho trống: dùng hết sức nấu, chia đều các món, cất đúng số đã nấu', () => {
    const { r, put } = run(1);
    expect(r.total).toBe(tiemXoiCapacity(1));
    expect(put).toEqual(r.made);
    const qs = Object.values(r.made);
    expect(Math.max(...qs) - Math.min(...qs)).toBeLessThanOrEqual(1);
    expect(r.wages).toBe(TIEM_XOI_WAGE);
    expect(r.full).toBe(false);
  });

  it('chỉ nấu bù tới mức tồn mục tiêu; kho đủ thì rảnh', () => {
    const full = Object.fromEntries(tiemXoiIds(TIEM_XOI_UNLOCK).map((id) => [id, TIEM_XOI_TARGET]));
    const { r } = run(3, full);
    expect(r.total).toBe(0);
    expect(r.full).toBe(true);
    const one = run(3, { ...full, xoi_dua: TIEM_XOI_TARGET - 5 });
    expect(one.r.made).toEqual({ xoi_dua: 5 });
  });

  it('món thiếu nhiều nhất được nấu trước', () => {
    const ids = tiemXoiIds(TIEM_XOI_UNLOCK);
    const storage = Object.fromEntries(ids.map((id) => [id, TIEM_XOI_TARGET - 10]));
    storage.xoi_man = 0;
    const { r } = run(0, storage);
    expect(r.total).toBe(TIEM_XOI_PER_COOK);
    expect(r.made).toEqual({ xoi_man: TIEM_XOI_PER_COOK });
  });

  it('giá vốn rẻ hơn nhập lẻ đúng tỉ lệ; phần tiết kiệm cộng lại bằng giá lẻ', () => {
    const { r } = run(2);
    const retail = Object.entries(r.made).reduce((n, [id, q]) => n + q * productById(id).buy, 0);
    expect(r.cost).toBe(Math.round(retail * TIEM_XOI_COST_MUL));
    expect(Math.abs(r.cost + tiemXoiSaved(r.made) - retail)).toBeLessThanOrEqual(1);
  });

  it('xác định: chạy hai lần cùng đầu vào ra cùng kết quả', () => {
    expect(run(2, { xoi_bap: 30 }).r).toEqual(run(2, { xoi_bap: 30 }).r);
  });
});
