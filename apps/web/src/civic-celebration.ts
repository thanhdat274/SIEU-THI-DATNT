/**
 * Quyết định mốc sổ góp nào cần báo (toast + popup "Sổ góp hoàn thành") — hàm thuần để test được.
 * Nhận diện mốc theo (loại, sổ), không theo số lượng: nạp lại save/snapshot trùng không báo lại,
 * lần đọc đầu của hẻm chỉ lập mốc nền (không bật popup cho mốc cũ).
 */
import type { CityProgressState } from '@game/shared';

export type CivicMilestone = CityProgressState['milestones'][number] & { type: 'bundle_completed' | 'civic_opened'; bundleId: string };

export function isCivicMilestone(m: CityProgressState['milestones'][number]): m is CivicMilestone {
  return (m.type === 'bundle_completed' || m.type === 'civic_opened') && !!m.bundleId;
}

export function civicMilestoneKey(m: Pick<CivicMilestone, 'type' | 'bundleId'>): string {
  return `${m.type}:${m.bundleId}`;
}

/**
 * `seen === null`: chưa có nền (lần đọc đầu) → trả nền, không báo gì.
 * Ngược lại: trả các mốc chưa có trong `seen` (theo thứ tự trong save) và tập `seen` mới.
 */
export function newCivicMilestones(
  milestones: readonly CityProgressState['milestones'][number][],
  seen: ReadonlySet<string> | null,
): { fresh: CivicMilestone[]; seen: Set<string> } {
  const civic = milestones.filter(isCivicMilestone);
  const next = new Set(seen ?? []);
  const fresh: CivicMilestone[] = [];
  for (const m of civic) {
    const key = civicMilestoneKey(m);
    if (!next.has(key)) {
      next.add(key);
      if (seen !== null) fresh.push(m);
    }
  }
  return { fresh, seen: next };
}

/**
 * Chơi một mình: không có mốc qua save chung, popup "Sổ góp hoàn thành" dựng từ kết quả lệnh góp (`completedBundleId`).
 * Online: trả null — popup do mốc `bundle_completed` (`newCivicMilestones`) lo cho cả hai máy, tránh báo trùng.
 */
export function soloCompletedBundleId(res: { success?: boolean; completedBundleId?: string } | null | undefined, isOnline: boolean): string | null {
  return !isOnline && res?.success && res.completedBundleId ? res.completedBundleId : null;
}
