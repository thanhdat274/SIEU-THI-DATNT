import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/**
 * Bộ test GĐ1045 — `core/slices/orders.startCook` nhánh CHẶN MÓN LỄ NGOÀI DỊP (dòng 111 TRƯỚC
 * ĐÂY 0%: `s.notify('🎁 ... chỉ gói trong dịp ...')` khi recipe có `festival` mà hôm nay không
 * phải lễ đó — giỏ quà 8/3 không gói được ngày thường, giữ nguồn cung lễ hiếm + chống bán lệch).
 * Hai biến thể của nhánh 110–111: `now` undefined (' — chưa tới dịp') vs `now` là LỄ KHÁC
 * (' (đang là dịp khác)').
 *
 * Hợp đồng: startCook món lễ ngoài đúng dịp → false, KHÔNG tạo cookJobs, báo đúng chuỗi.
 * recipe_gio_83 festival 'quoc_te_phu_nu' (8/3, md(3,7..9) → dayOfYear 65–67 → game day 66–68),
 * unlock 31 (T3-L4 răng cưa dời 30→31), station gift_wrap.
 */

/** Dựng trạng thái ở `day`, bắt notify vào toasts[]. */
const prep = (day: number) => {
  const toasts: string[] = [];
  useGame.setState({
    ...newGameData(),
    level: 31, // recipe_gio_83 mở 31 — trên cấp này chỉ còn cổng lễ/trạm chặn
    day,
    notify: (m: string) => void toasts.push(m),
  });
  return toasts;
};

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('startCook — chặn món lễ ngoài dịp (orders 108–114)', () => {
  it('giỏ quà 8/3 gói ngày THƯỜNG (day 11, không lễ) → từ chối + báo "chỉ gói trong dịp … chưa tới dịp"', () => {
    const toasts = prep(11); // dayOfYear 10 — không lễ nào hoạt động
    expect(useGame.getState().startCook('recipe_gio_83')).toBe(false);
    expect(useGame.getState().cookJobs.length).toBe(0);
    expect(toasts.some((t) => t.includes('chỉ gói trong dịp'))).toBe(true);
    expect(toasts.some((t) => t.includes('chưa tới dịp'))).toBe(true);
  });

  it('đang là DỊP KHÁC (Tết, day 32) → từ chối + báo "(đang là dịp khác)"', () => {
    const toasts = prep(32); // dayOfYear 31 — Tết (md 1/28..2/8) đang hoạt động
    expect(useGame.getState().startCook('recipe_gio_83')).toBe(false);
    expect(useGame.getState().cookJobs.length).toBe(0);
    expect(toasts.some((t) => t.includes('chỉ gói trong dịp'))).toBe(true);
    expect(toasts.some((t) => t.includes('đang là dịp khác'))).toBe(true);
  });

  it('trong ĐÚNG dịp lễ (8/3, day 67) → qua cổng lễ, chặn ở bước TRẠM (chưa đặt gift_wrap) — không phải lỗi lễ', () => {
    const toasts = prep(67); // dayOfYear 66 — Quốc tế Phụ nữ đang hoạt động
    useGame.getState().startCook('recipe_gio_83');
    // Không báo lễ (đã qua cổng 108–114); báo thiếu trạm gift_wrap ở bước 116+
    expect(toasts.some((t) => t.includes('chỉ gói trong dịp'))).toBe(false);
    expect(toasts.some((t) => t.includes('Cần đặt trạm'))).toBe(true);
  });
});
