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

// ============ MỐC SỔ GÓP XÓM (OpenSpec `civic-city-goals`, Giai đoạn 5) ============

/** Mốc sổ góp lưu trong `cityProgress.milestones` (đi cùng save → không ghi trùng khi nạp lại). */
export interface CivicMilestone {
  day: number;
  type: 'bundle_completed' | 'civic_opened';
  bundleId: string;
  qolGain?: number;
}

/** Thêm mốc nếu CHƯA có mốc cùng loại + cùng sổ (replay / nạp lại save không ghi trùng). Trả mảng mới. */
export function addCivicMilestoneOnce<T extends { type: string; bundleId?: string }>(
  milestones: readonly T[],
  milestone: T,
): T[] {
  const exists = milestones.some((m) => m.type === milestone.type && m.bundleId === milestone.bundleId);
  return exists ? [...milestones] : [...milestones, milestone];
}

/**
 * Câu nhật ký tiếng Việt cho mốc sổ góp:
 * "Ngày N — Xóm góp đủ sổ <công trình> (<tên>)" / "Ngày N — Khánh thành <công trình>".
 */
export function civicMilestoneLine(m: CivicMilestone, buildingName: string, bundleLabel = ''): string {
  return m.type === 'bundle_completed'
    ? `Ngày ${m.day} — Xóm góp đủ sổ ${buildingName}${bundleLabel ? ` (${bundleLabel})` : ''}`
    : `Ngày ${m.day} — Khánh thành ${buildingName}`;
}

/** Dòng bản tin sáng ngày `day`: công trình khánh thành hôm qua → "<công trình> mở cửa: chỉ số sống khu +X". */
export function civicOpeningBriefLines(
  milestones: readonly { day: number; type: string; bundleId?: string; qolGain?: number }[],
  day: number,
  nameOf: (bundleId: string) => string,
): string[] {
  return milestones
    .filter((m) => m.type === 'civic_opened' && m.bundleId && m.day === day - 1)
    .map((m) => {
      const gain = Math.round(m.qolGain ?? 0);
      return gain > 0
        ? `${nameOf(m.bundleId as string)} mở cửa: chỉ số sống khu +${gain}`
        : `${nameOf(m.bundleId as string)} mở cửa: nằm ngoài bán kính nên chưa tăng chỉ số sống khu`;
    });
}

/** Tất cả dòng nhật ký sổ góp (mới nhất trước) cho tab Sổ góp. `nameOf(bundleId)` → tên công trình. */
export function civicJournalLines(
  milestones: readonly { day: number; type: string; bundleId?: string; qolGain?: number }[],
  nameOf: (bundleId: string) => string,
): string[] {
  return milestones
    .filter((m): m is { day: number; type: 'bundle_completed' | 'civic_opened'; bundleId: string; qolGain?: number } =>
      (m.type === 'bundle_completed' || m.type === 'civic_opened') && !!m.bundleId)
    .map((m) => civicMilestoneLine(m, nameOf(m.bundleId)))
    .reverse();
}
