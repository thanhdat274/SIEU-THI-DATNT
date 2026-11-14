/**
 * Dịch tên trong bảng dữ liệu game (i18n bước 5). Đổi ngôn ngữ = lưu + reload, nên chỉ cần đổi `name`
 * một lần lúc nạp module: mọi chỗ hiển thị (kệ, nhập hàng, thông báo…) tự ra tiếng Anh.
 * Mô phỏng/save/golden dùng `id`, không dùng `name` → không đổi. Thiếu bản dịch → giữ tiếng Việt.
 */
import { getSettings } from '../core/settings';

export function localizeNames<T extends { id: string; name: string }>(
  rows: T[], en: Record<string, string>, lang: string = getSettings().lang,
): T[] {
  if (lang !== 'en') return rows;
  for (const r of rows) r.name = en[r.id] ?? r.name;
  return rows;
}

export function localizeRecord(rec: Record<string, string>, en: Record<string, string>, lang: string = getSettings().lang) {
  if (lang !== 'en') return rec;
  for (const k of Object.keys(rec)) rec[k] = en[k] ?? rec[k];
  return rec;
}
