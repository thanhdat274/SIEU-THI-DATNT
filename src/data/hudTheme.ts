import { festivalOn } from './calendar';

// GĐ1521 — Theme HUD theo dịp lễ (mục F2 TONG-HOP: theme HUD mở theo sự kiện chỉ bằng CSS variables).
// Chỉ đổi màu nhấn/nền, thuần hiển thị: không đụng kinh tế, save hay co-op.
export type HudTheme = 'tet' | 'trung_thu' | 'giang_sinh';
const MAP: Record<string, HudTheme> = { tet: 'tet', tet_duong: 'tet', trung_thu: 'trung_thu', giang_sinh: 'giang_sinh' };
export const HUD_THEMES: readonly HudTheme[] = ['tet', 'trung_thu', 'giang_sinh'];

/** Theme đang áp dụng cho ngày này (null = theme mặc định). */
export function hudThemeOn(day: number): HudTheme | null {
  const f = festivalOn(day);
  return f ? MAP[f.id] ?? null : null;
}
