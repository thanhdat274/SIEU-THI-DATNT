/**
 * Lớp dịch tối giản (không thư viện ngoài). Chỉ đổi CHỮ HIỂN THỊ — không đụng mô phỏng/save/golden.
 * Ngôn ngữ lấy từ Settings.lang; đổi ngôn ngữ thì lưu + reload (xem SettingsPanel), nên t() không cần re-render.
 */
import { vi, type I18nKey } from '../i18n/vi';
import { en } from '../i18n/en';
import { getSettings, type Settings } from './settings';

export type Lang = Settings['lang'];
export type { I18nKey };
const DICTS: Record<Lang, Record<I18nKey, string>> = { vi, en };

export const LANG_OPTIONS: [Lang, string][] = [['vi', 'Tiếng Việt'], ['en', 'English']];

export const getLang = (): Lang => getSettings().lang;

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

/** Chuỗi theo ngôn ngữ hiện tại; thiếu bản dịch thì rơi về tiếng Việt. */
export function t(key: I18nKey, vars?: Record<string, string | number>, lang: Lang = getLang()): string {
  return fill(DICTS[lang][key] ?? vi[key] ?? key, vars);
}

/** Số nhiều: dùng cặp khóa `<base>_one` / `<base>_other`; biến `{n}` tự điền. */
export function tn(n: number, base: string, vars?: Record<string, string | number>, lang: Lang = getLang()): string {
  const key = `${base}_${n === 1 ? 'one' : 'other'}` as I18nKey;
  return t(key, { n, ...vars }, lang);
}

/** Đoán ngôn ngữ lần đầu theo trình duyệt: không phải tiếng Việt → tiếng Anh. */
export function guessLang(nav: string | undefined): Lang {
  return !nav || nav.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}
