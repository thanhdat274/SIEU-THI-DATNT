import type { SaveGameData } from '@game/shared';
import { MAX_PLAYER_LEVEL } from '@game/data';

/**
 * Hướng B của I-01: với lệnh server chưa phát lại được, client vẫn gửi save, nên server chỉ kiểm bất biến giữa save đã lưu
 * và save được gửi. Ngưỡng cố ý rộng để không từ chối người chơi thật; chỉ chặn gian lận lộ liễu, không phải chống gian lận triệt để.
 */
export const MAX_REVENUE_PER_GAME_MINUTE = 20_000;
/** Phần thưởng một lệnh nhận thưởng/đơn tiệc có thể cộng vào tiền ngoài doanh thu bán hàng. */
export const MAX_REWARD_PER_COMMAND = 1_000_000;
const REWARD_COMMANDS = new Set(['claim_quest', 'claim_goal', 'claim_weekly_quest', 'claim_festival_goal', 'fulfill_party_order', 'respond_party_order']);

const minutesOf = (save: SaveGameData) => save.worldTime.day * 1440 + save.worldTime.hour * 60 + save.worldTime.minute;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const superset = (prev: readonly string[] | undefined, next: readonly string[] | undefined) => {
  const have = new Set(next ?? []);
  return (prev ?? []).every((id) => have.has(id));
};

/** Trả về lý do từ chối, hoặc null nếu hợp lệ. */
export function checkSaveInvariants(prev: SaveGameData, next: SaveGameData, commandType: string, payload?: { isOpen?: unknown }): string | null {
  const money = next.player.money;
  if (!isNum(money) || money < 0) return 'Tiền không hợp lệ.';
  if (!isNum(next.statistics.totalRevenue) || !isNum(next.player.experience) || !isNum(next.player.level)) return 'Số liệu tiến độ không hợp lệ.';
  if (next.player.level < 1 || next.player.level > MAX_PLAYER_LEVEL) return 'Cấp độ ngoài phạm vi.';

  for (const item of next.inventory) {
    if (!isNum(item.quantity) || item.quantity < 0) return 'Số lượng kho không hợp lệ.';
  }

  if (next.statistics.totalRevenue < prev.statistics.totalRevenue) return 'Tổng doanh thu không được giảm.';
  if (next.statistics.totalCustomersServed < prev.statistics.totalCustomersServed) return 'Số khách đã phục vụ không được giảm.';
  if (next.player.level < prev.player.level || (next.player.level === prev.player.level && next.player.experience < prev.player.experience)) return 'Cấp/XP không được giảm.';
  for (const skill of Object.keys(prev.skills?.xp ?? {}) as Array<keyof NonNullable<SaveGameData['skills']>['xp']>) {
    if ((next.skills?.xp?.[skill] ?? 0) < (prev.skills?.xp?.[skill] ?? 0)) return 'XP kỹ năng không được giảm.';
    if ((next.skills?.levels?.[skill] ?? 0) < (prev.skills?.levels?.[skill] ?? 0)) return 'Cấp kỹ năng không được giảm.';
  }
  if (!superset(prev.skills?.chosenPerks, next.skills?.chosenPerks)) return 'Không được gỡ đặc quyền đã mở.';
  if (!superset(prev.player.unlockedTitles, next.player.unlockedTitles)) return 'Không được gỡ danh hiệu đã mở.';
  if (!superset(prev.goals?.claimedGoalIds, next.goals?.claimedGoalIds)) return 'Không được hủy mục tiêu đã nhận.';
  if (!superset(prev.goals?.claimedFestivalGoalKeys, next.goals?.claimedFestivalGoalKeys)) return 'Không được hủy mục tiêu ngày hội đã nhận.';
  for (const [week, ids] of Object.entries(prev.goals?.claimedWeeklyQuestIds ?? {})) {
    if (!superset(ids, next.goals?.claimedWeeklyQuestIds?.[Number(week)])) return 'Không được hủy nhiệm vụ tuần đã nhận.';
  }

  // Giới hạn tốc độ tăng theo thời gian game trôi qua giữa hai save (không tính lùi giờ: client lệch pha không bị phạt).
  const elapsed = Math.max(0, minutesOf(next) - minutesOf(prev));
  const revenueGrowth = next.statistics.totalRevenue - prev.statistics.totalRevenue;
  if (revenueGrowth > MAX_REVENUE_PER_GAME_MINUTE * elapsed) return 'Doanh thu tăng nhanh bất thường.';
  const allowance = REWARD_COMMANDS.has(commandType) ? MAX_REWARD_PER_COMMAND : 0;
  if (money - prev.player.money > MAX_REVENUE_PER_GAME_MINUTE * elapsed + allowance) return 'Tiền tăng nhanh bất thường.';

  if (commandType === 'store_status' && typeof payload?.isOpen === 'boolean' && next.worldTime.isStoreOpen !== payload.isOpen) {
    return 'Trạng thái cửa hàng không khớp lệnh.';
  }
  return null;
}
