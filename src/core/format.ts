/**
 * Định dạng số / ngày theo ngôn ngữ đang chọn (Settings.lang) — một chỗ duy nhất.
 * vi: 12.000 · 14/11/2026   en: 12,000 · 11/14/2026
 * KHÔNG gọi `toLocaleString('vi-VN')` trực tiếp nữa (test formatLocale.test.ts chặn) — dùng fmtNum/fmtDate.
 * Tiền vẫn là đồng, hậu tố "đ" giữ nguyên ở cả hai ngôn ngữ; đổi sang đô la là việc của core/currency.ts.
 */
import { getSettings, type Settings } from './settings';

const LOCALE: Record<Settings['lang'], string> = { vi: 'vi-VN', en: 'en-US' };
export const locale = (lang: Settings['lang'] = getSettings().lang): string => LOCALE[lang];

/** Số có ngăn nghìn theo ngôn ngữ (thay cho `n.toLocaleString('vi-VN')`). */
export function fmtNum(n: number, opts?: Intl.NumberFormatOptions, lang?: Settings['lang']): string {
  return n.toLocaleString(locale(lang), opts);
}

/** Ngày theo ngôn ngữ (thay cho `d.toLocaleDateString('vi-VN', …)`). */
export function fmtDate(d: Date | number, opts?: Intl.DateTimeFormatOptions, lang?: Settings['lang']): string {
  return (typeof d === 'number' ? new Date(d) : d).toLocaleDateString(locale(lang), opts);
}
