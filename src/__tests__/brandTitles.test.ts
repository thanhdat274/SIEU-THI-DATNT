import { describe, expect, it } from 'vitest';
import { TITLES, type TitleContext } from '../data/titles';

// Hệ4-L9 (SPEC §4.9) — danh hiệu nhãn riêng: uy tín 40/60/80 + chuỗi 3 nhượng quyền khỏe 30 ngày.

const title = (id: string) => TITLES.find((t) => t.id === id)!;
const ctx = (over: Partial<TitleContext> = {}): TitleContext => ({
  level: 1, day: 1, customers: 0, itemsSold: 0, revenue: 0, rating: 0, reviewCount: 0,
  closeRegulars: 0, ordersDone: 0, staffCount: 0, prestige: 0,
  ...over,
});

describe('Hệ4-L9 — danh hiệu nhãn riêng (SPEC §4.9)', () => {
  it('có 4 danh hiệu nhãn trong bảng, tên/icon riêng', () => {
    const ids = ['nhan_lang_nghe', 'dac_san_tinh', 'thuong_hieu_quoc_dan', 'nhan_hieu_tinh'];
    for (const id of ids) expect(title(id)).toBeTruthy();
  });
  it('mốc uy tín 40/60/80 — ranh giới đúng', () => {
    expect(title('nhan_lang_nghe').done(ctx({ brandRep: 39 }))).toBe(false);
    expect(title('nhan_lang_nghe').done(ctx({ brandRep: 40 }))).toBe(true);
    expect(title('dac_san_tinh').done(ctx({ brandRep: 59 }))).toBe(false);
    expect(title('dac_san_tinh').done(ctx({ brandRep: 60 }))).toBe(true);
    expect(title('thuong_hieu_quoc_dan').done(ctx({ brandRep: 79 }))).toBe(false);
    expect(title('thuong_hieu_quoc_dan').done(ctx({ brandRep: 80 }))).toBe(true);
  });
  it('nhan_hieu_tinh: cần 3 nhượng quyền khỏe đủ 30 ngày', () => {
    expect(title('nhan_hieu_tinh').done(ctx({ brandFranchiseStreak: 29 }))).toBe(false);
    expect(title('nhan_hieu_tinh').done(ctx({ brandFranchiseStreak: 30 }))).toBe(true);
  });
  it('chưa có nhãn (brandRep mặc định 0) → không mở danh hiệu nào', () => {
    expect(title('nhan_lang_nghe').done(ctx())).toBe(false);
    expect(title('dac_san_tinh').done(ctx())).toBe(false);
  });
});
