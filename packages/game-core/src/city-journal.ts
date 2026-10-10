/**
 * Nhật ký thành phố — module THUẦN (open-world-coop-land, D4/D5).
 *
 * Liệt kê sự kiện đất kèm TÊN người thực hiện để hiển thị trong bảng "Thành phố"
 * (Bước 4). Phần này chỉ xử lý dữ liệu (chuỗi sự kiện + lọc theo người); việc nối
 * hiển thị bảng/t toast là phần sau chờ máy thật.
 *
 * Immutable: mọi hàm trả về mảng mới, không sửa tham số đầu vào.
 */

/** Loại sự kiện đất ghi vào nhật ký thành phố. */
export type CityJournalKind =
  | 'land_bought'
  | 'wave_opened'
  | 'building_placed'
  | 'building_relocated'
  | 'expanded'
  | 'vote_rejected';

/** Một dòng nhật ký thành phố. */
export interface CityJournalEntry {
  day: number;
  /** Dấu thời gian dạng chuỗi (format giao diện), ví dụ '08:24'. */
  at: string;
  kind: CityJournalKind;
  /** Người thực hiện ('local' khi chơi một mình). */
  accountId: string;
  /** Tên hiển thị của người thực hiện (tùy chọn, để hiện trong bảng Thành phố). */
  name?: string;
  /** Chi tiết tự do, ví dụ vị trí lô / loại công trình. */
  detail?: string;
}

/**
 * Nối một sự kiện vào cuối nhật ký (bản mới nhất ở cuối) và giữ tối đa `cap`
 * dòng mới nhất (cắt bỏ các dòng cũ ở đầu khi vượt quá giới hạn).
 */
export function appendJournal(
  entries: readonly CityJournalEntry[],
  entry: CityJournalEntry,
  cap = 200,
): CityJournalEntry[] {
  const next = [...entries, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Lọc nhật ký theo người thực hiện (giữ nguyên thứ tự thời gian). */
export function filterJournalByAccount(
  entries: readonly CityJournalEntry[],
  accountId: string,
): CityJournalEntry[] {
  return entries.filter((entry) => entry.accountId === accountId);
}
