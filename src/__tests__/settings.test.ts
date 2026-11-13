import { describe, expect, it } from 'vitest';
import { sanitize, SETTINGS_DEFAULT } from '../core/settings';

describe('cài đặt người chơi', () => {
  it('dữ liệu rác về mặc định', () => {
    expect(sanitize(null)).toEqual(SETTINGS_DEFAULT);
    expect(sanitize({ fpsCap: 77, fontSize: 'huge', autosave: 'x', uiScale: NaN })).toEqual(SETTINGS_DEFAULT);
  });
  it('kẹp giá trị trong khoảng', () => {
    const s = sanitize({ renderScale: 9, brightness: 0, uiScale: 3, fpsCap: 60, reduceMotion: true });
    expect(s.renderScale).toBe(1);
    expect(s.brightness).toBe(0.7);
    expect(s.uiScale).toBe(1.4);
    expect(s.fpsCap).toBe(60);
    expect(s.reduceMotion).toBe(true);
  });
  it('mục mới: rác về mặc định, giá trị hợp lệ giữ nguyên', () => {
    expect(sanitize({ autosaveEvery: 7, colorblind: 'x', noFlash: 1 })).toEqual(SETTINGS_DEFAULT);
    const s = sanitize({ autosaveEvery: 180, colorblind: 'deutan', noFlash: true, autoSlow: true, confirmEndDay: true, showPatience: false });
    expect([s.autosaveEvery, s.colorblind, s.noFlash, s.autoSlow, s.confirmEndDay, s.showPatience]).toEqual([180, 'deutan', true, true, true, false]);
  });
});
