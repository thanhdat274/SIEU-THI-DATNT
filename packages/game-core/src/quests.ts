import type { DailyRecord, PlayerData, QuestState, SaveGameData } from '@game/shared';
import { ALL_PRODUCTS, SUPPLIERS } from '@game/data';

export interface QuestReward { money: number; experience: number }

export interface QuestProgress {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: QuestReward;
  done: boolean;
  claimed: boolean;
}

export interface QuestContext {
  day: number;
  player: PlayerData;
  statistics: SaveGameData['statistics'];
  currentDay: DailyRecord;
  staffCount: number;
  unlockedPlotCount: number;
  state: QuestState;
}

export const emptyQuestState = (): QuestState => ({ claimedDaily: {}, claimedStory: [] });

export function normalizeQuestState(state: QuestState | undefined): QuestState {
  return {
    claimedDaily: Object.fromEntries(Object.entries(state?.claimedDaily ?? {}).map(([day, ids]) => [day, [...ids]])),
    claimedStory: [...(state?.claimedStory ?? [])],
  };
}

const scale = (base: number, level: number, step: number) => Math.round(base * (1 + step * (level - 1)));

/** Ba nhiệm vụ mỗi ngày, độ khó/thưởng tăng theo cấp; giữ nguyên trong ngày vì chỉ phụ thuộc cấp lúc chốt ngày đầu. */
export function getDailyQuests(ctx: QuestContext): QuestProgress[] {
  const level = Math.max(1, ctx.player.level);
  const claimed = new Set(ctx.state.claimedDaily[ctx.day] ?? []);
  const defs = [
    { id: 'daily_customers', title: 'Đông khách', unit: 'khách', target: scale(5, level, 0.2), current: ctx.currentDay.customersServed, money: scale(30000, level, 0.25), xp: scale(20, level, 0.1) },
    { id: 'daily_items', title: 'Bán sạch kệ', unit: 'món', target: scale(15, level, 0.2), current: ctx.currentDay.itemsSold, money: scale(40000, level, 0.25), xp: scale(25, level, 0.1) },
    { id: 'daily_revenue', title: 'Doanh thu trong ngày', unit: '₫', target: scale(150000, level, 0.25), current: ctx.currentDay.revenue, money: scale(60000, level, 0.25), xp: scale(35, level, 0.1) },
  ];
  return defs.map(def => ({
    id: def.id,
    title: def.title,
    description: `Đạt ${def.target.toLocaleString('vi-VN')} ${def.unit} trong ngày`,
    current: Math.min(def.current, def.target),
    target: def.target,
    reward: { money: def.money, experience: def.xp },
    done: def.current >= def.target,
    claimed: claimed.has(def.id),
  }));
}

interface StoryStep { id: string; title: string; description: string; target: number; reward: QuestReward; measure: (ctx: QuestContext) => number }

export const STORY_STEPS: readonly StoryStep[] = [
  { id: 'story_first_customers', title: 'Khai trương hẻm', description: 'Phục vụ 10 khách đầu tiên', target: 10, reward: { money: 50000, experience: 30 }, measure: c => c.statistics.totalCustomersServed },
  { id: 'story_revenue_1', title: 'Có vốn quay vòng', description: 'Đạt tổng doanh thu 500.000 ₫', target: 500000, reward: { money: 80000, experience: 50 }, measure: c => c.statistics.totalRevenue },
  { id: 'story_level_3', title: 'Tiệm có tiếng', description: 'Đạt cấp 3', target: 3, reward: { money: 100000, experience: 0 }, measure: c => c.player.level },
  { id: 'story_hire', title: 'Có người phụ việc', description: 'Thuê 1 nhân viên', target: 1, reward: { money: 120000, experience: 60 }, measure: c => c.staffCount },
  { id: 'story_days_7', title: 'Một tuần bám hẻm', description: 'Sống sót qua 7 ngày', target: 7, reward: { money: 150000, experience: 80 }, measure: c => c.statistics.totalDaysPassed },
  { id: 'story_plot', title: 'Mở rộng mặt bằng', description: 'Mua 1 mảnh đất mở rộng', target: 1, reward: { money: 200000, experience: 100 }, measure: c => c.unlockedPlotCount },
  { id: 'story_revenue_2', title: 'Tiệm đầu hẻm lên đời', description: 'Đạt tổng doanh thu 10.000.000 ₫', target: 10000000, reward: { money: 500000, experience: 300 }, measure: c => c.statistics.totalRevenue },
];

/** Chuỗi cốt truyện làm tuần tự: chỉ bước đầu tiên chưa nhận là hoạt động. */
export function getStoryQuest(ctx: QuestContext): QuestProgress | null {
  const claimed = new Set(ctx.state.claimedStory);
  const step = STORY_STEPS.find(item => !claimed.has(item.id));
  if (!step) return null;
  const value = step.measure(ctx);
  return { id: step.id, title: step.title, description: step.description, current: Math.min(value, step.target), target: step.target, reward: step.reward, done: value >= step.target, claimed: false };
}

export function findClaimableQuest(ctx: QuestContext, questId: string): QuestProgress | null {
  const quest = [...getDailyQuests(ctx), getStoryQuest(ctx)].find(item => item?.id === questId);
  return quest && quest.done && !quest.claimed ? quest : null;
}

export function markQuestClaimed(state: QuestState, day: number, questId: string): void {
  if (questId.startsWith('story_')) state.claimedStory.push(questId);
  else state.claimedDaily[day] = [...(state.claimedDaily[day] ?? []), questId];
}

export interface LevelUnlock { products: string[]; suppliers: string[] }

/** Mốc cấp: món hàng và nhà cung cấp mở khóa đúng ở cấp này. */
export function getLevelUnlocks(level: number): LevelUnlock {
  return {
    products: ALL_PRODUCTS.filter(p => p.unlockLevel === level).map(p => p.name),
    suppliers: SUPPLIERS.filter(s => s.unlockLevel === level).map(s => s.name),
  };
}
