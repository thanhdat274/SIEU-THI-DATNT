import type { I18nKey } from './vi';
import { enLogin } from './en/login';
import { enSettings } from './en/settings';
import { enHud } from './en/hud';
import { enPanelsQuest } from './en/panels_quest';
import { enPanelsStaff } from './en/panels_staff';
import { enPanelsReport } from './en/panels_report';
import { enPanelsStock } from './en/panels_stock';
import { enPlanogram } from './en/planogram';
import { enPanelsPeople } from './en/panels_people';
import { enPanelsQuan } from './en/panels_quan';
import { enPanelsXoi } from './en/panels_xoi';

/** English. `Record<I18nKey, string>` → thiếu khóa nào `tsc` báo ngay. */
export const en: Record<I18nKey, string> = {
  ...enLogin,
  ...enSettings,
  ...enHud,
  ...enPanelsQuest,
  ...enPanelsStaff,
  ...enPanelsReport,
  ...enPanelsStock,
  ...enPlanogram,
  ...enPanelsPeople,
  ...enPanelsQuan,
  ...enPanelsXoi,
  'settings.title': '⚙️ Settings',
  'settings.subtitle': 'Display, sound, gameplay, accessibility',
  'settings.tab.img': '👁 Display',
  'settings.tab.gfx': '🎨 Graphics',
  'settings.tab.audio': '🔊 Sound',
  'settings.tab.play': '🎮 Play',
  'settings.tab.a11y': '♿ Access',
  'settings.tab.data': '💾 Data',
  'settings.tab.game': '🏠 Game',
  'settings.lang': 'Language',
  'settings.lang.hint': 'The game saves and reloads after switching. English is still being translated — untranslated text stays in Vietnamese',
  'common.close': 'Close',
  'common.opening': 'Opening…',
  'common.day_one': '{n} day',
  'common.day_other': '{n} days',
};
