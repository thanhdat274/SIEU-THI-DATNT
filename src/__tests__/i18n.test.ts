import { describe, expect, it } from 'vitest';
import { vi as viDict } from '../i18n/vi';
import { en } from '../i18n/en';
import { guessLang, t, tn } from '../core/i18n';
import { sanitize, SETTINGS_DEFAULT } from '../core/settings';

describe('i18n — khung dịch', () => {
  it('en có đúng bộ khóa của vi, không chuỗi rỗng', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(viDict).sort());
    for (const v of Object.values(en)) expect(v.trim()).not.toBe('');
  });

  it('giữ nguyên biến {x} giữa hai bản', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(viDict) as (keyof typeof viDict)[]) expect(vars(en[k])).toEqual(vars(viDict[k]));
  });

  it('t() theo ngôn ngữ, mặc định tiếng Việt', () => {
    expect(t('settings.lang')).toBe('Ngôn ngữ');
    expect(t('settings.lang', undefined, 'en')).toBe('Language');
  });

  it('tn() chia số nhiều tiếng Anh', () => {
    expect(tn(1, 'common.day', undefined, 'en')).toBe('1 day');
    expect(tn(3, 'common.day', undefined, 'en')).toBe('3 days');
    expect(tn(3, 'common.day', undefined, 'vi')).toBe('3 ngày');
  });

  it('Settings.lang: mặc định vi, giá trị lạ về vi', () => {
    expect(SETTINGS_DEFAULT.lang).toBe('vi');
    expect(sanitize({ lang: 'en' }).lang).toBe('en');
    expect(sanitize({ lang: 'fr' }).lang).toBe('vi');
  });

  it('đoán ngôn ngữ theo trình duyệt', () => {
    expect(guessLang('vi-VN')).toBe('vi');
    expect(guessLang('en-US')).toBe('en');
    expect(guessLang(undefined)).toBe('vi');
  });
});
