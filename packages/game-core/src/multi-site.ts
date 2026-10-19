/**
 * Nhiều cơ sở trên lô đất thuê (OpenSpec `multi-site-parcel-lease`): hằng số tạm + nhật ký.
 * PROVISIONAL: sức chứa kho đệm và số cơ sở tối đa là số tạm, chốt bằng mô phỏng sau.
 */
import type { SiteLogEntry } from '@game/shared';

/** PROVISIONAL: sức chứa kho đệm mỗi cơ sở (đơn vị hàng, tính cả hàng đang chuyển tới). */
export const SITE_BUFFER_CAPACITY = 60;
/** PROVISIONAL: số cơ sở tối đa (ngoài 4 tòa trên lô tiệm chính). */
export const MAX_SITES = 3;
/** D5: giữ 200 dòng nhật ký gần nhất mỗi cơ sở. */
export const SITE_LOG_LIMIT = 200;

export function appendSiteLog(logs: SiteLogEntry[] | undefined, entry: SiteLogEntry): SiteLogEntry[] {
  const next = [...(logs ?? []), entry];
  return next.length > SITE_LOG_LIMIT ? next.slice(next.length - SITE_LOG_LIMIT) : next;
}
