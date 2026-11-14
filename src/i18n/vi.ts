/**
 * Từ điển gốc (tiếng Việt). Khóa nào ở đây cũng phải có trong en.ts — `tsc` chặn thiếu khóa.
 * Chuỗi có biến dùng `{ten}`; số nhiều tiếng Anh dùng cặp `khóa_one` / `khóa_other` (xem tn()).
 */
import { viLogin } from './vi/login';
import { viSettings } from './vi/settings';
import { viHud } from './vi/hud';
import { viPanelsQuest } from './vi/panels_quest';
import { viPanelsStaff } from './vi/panels_staff';

export const vi = {
  ...viLogin,
  ...viSettings,
  ...viHud,
  ...viPanelsQuest,
  ...viPanelsStaff,
  'settings.title': '⚙️ Cài đặt',
  'settings.subtitle': 'Hình ảnh, âm thanh, cách chơi, trợ năng',
  'settings.tab.img': '👁 Hình ảnh',
  'settings.tab.gfx': '🎨 Đồ họa',
  'settings.tab.audio': '🔊 Âm thanh',
  'settings.tab.play': '🎮 Chơi',
  'settings.tab.a11y': '♿ Trợ năng',
  'settings.tab.data': '💾 Dữ liệu',
  'settings.tab.game': '🏠 Ván chơi',
  'settings.lang': 'Ngôn ngữ',
  'settings.lang.hint': 'Đổi xong game lưu và tải lại. Bản tiếng Anh đang dịch dần — chỗ chưa dịch vẫn hiện tiếng Việt',
  'common.close': 'Đóng',
  'common.opening': 'Đang mở…',
  'common.day_one': '{n} ngày',
  'common.day_other': '{n} ngày',
} as const;

export type I18nKey = keyof typeof vi;
