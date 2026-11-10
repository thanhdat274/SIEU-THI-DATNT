import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';

/** Hệ 7-L2 — scoreFestivalMini (SPEC-CHIEU-RONG §7.7): thưởng 1 lần/ngày lễ (R7), kẹp điểm, cộng miniBonus/flair. */

const prep = (day: number, level = 32) => {
  const toasts: string[] = [];
  useGame.setState({ ...newGameData(), level, day, notify: (m: string) => void toasts.push(m) });
  return toasts;
};

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('scoreFestivalMini — gio_qua (mẻ giỏ quà)', () => {
  it('đúng dịp Tết, đủ cấp: ghi đã chơi + cộng bonus vào mẻ kế tiếp của công thức giỏ Tết', () => {
    const toasts = prep(32); // dayOfYear 31 — dịp Tết (doy 27..38)
    useGame.getState().scoreFestivalMini('gio_qua', 100, 'fast');
    const b = useGame.getState().biz;
    expect(b.miniPlayed?.gio_qua).toBe(32);
    expect(b.miniBonus?.['recipe_gio_tet']).toBe(1); // trần +1 giỏ
    expect(toasts.some((t) => t.includes('recipe_gio_tet') || t.includes('Giỏ quà Tết') || t.includes('+1'))).toBe(true);
  });

  it('chơi lại cùng ngày: không thưởng thêm (R7)', () => {
    prep(32);
    useGame.getState().scoreFestivalMini('gio_qua', 100, 'fast');
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().scoreFestivalMini('gio_qua', 100, 'fast');
    expect(useGame.getState().biz.miniBonus?.['recipe_gio_tet']).toBe(1); // không + thêm
    expect(toasts.some((t) => t.includes('đã nhận thưởng') || t.includes('chơi lại'))).toBe(true);
  });

  it('ngoài dịp (day 11, không lễ): không thưởng', () => {
    const toasts = prep(11);
    useGame.getState().scoreFestivalMini('gio_qua', 100, 'fast');
    expect(useGame.getState().biz.miniPlayed?.gio_qua).toBeUndefined();
    expect(toasts.some((t) => t.includes('đúng dịp'))).toBe(true);
  });

  it('chưa đủ cấp (30 < 32): không thưởng (không đụng golden cấp 30)', () => {
    const toasts = prep(32, 30);
    useGame.getState().scoreFestivalMini('gio_qua', 100, 'fast');
    expect(useGame.getState().biz.miniPlayed?.gio_qua).toBeUndefined();
    expect(toasts.some((t) => t.includes('cấp'))).toBe(true);
  });

  it('điểm âm/quá 100 bị kẹp về 0–100 (chỉ được trần nhỏ, không gian lận được gì)', () => {
    prep(32);
    useGame.getState().scoreFestivalMini('gio_qua', 9999, 'fast');
    expect(useGame.getState().biz.miniBonus?.['recipe_gio_tet']).toBe(1); // trần +1 giỏ
  });
});

describe('scoreFestivalMini — decor (mam_ngu_qua, lát L4 chuẩn bị state)', () => {
  it('đúng dịp Tết: cộng flair 2–6 vào festivalFlair, hạn tới hết dịp', () => {
    prep(32);
    useGame.getState().scoreFestivalMini('mam_ngu_qua', 100, 'fast');
    const fl = useGame.getState().biz.festivalFlair ?? [];
    expect(fl.length).toBe(1);
    expect(fl[0].furniture).toBe('mam_ngu_qua');
    expect(fl[0].bonus).toBe(6);
  });
});
