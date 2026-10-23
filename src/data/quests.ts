import type { DayStats } from '../core/store';

/** Số liệu cộng dồn cả ván, để đo nhiệm vụ cốt truyện. */
export interface Totals {
  customers: number;
  itemsSold: number;
  revenue: number;
}

export const emptyTotals = (): Totals => ({ customers: 0, itemsSold: 0, revenue: 0 });

/** Nhiệm vụ đã nhận thưởng: nhiệm vụ ngày ghi theo ngày (sang ngày mới thì làm lại), cốt truyện ghi một lần. */
export interface QuestLog {
  day: number;
  claimedDaily: string[];
  claimedStory: string[];
}

export const emptyQuestLog = (): QuestLog => ({ day: 1, claimedDaily: [], claimedStory: [] });

export interface Quest {
  id: string;
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  money: number;
  xp: number;
  done: boolean;
  claimed: boolean;
}

/** Những gì nhiệm vụ cần đọc từ trạng thái game. */
export interface QuestContext {
  day: number;
  level: number;
  stats: DayStats;
  totals: Totals;
  staffCount: number;
  shopTier: number;
  warehouseTier: number;
  ordersDone: number;
  log: QuestLog;
}

const scale = (base: number, level: number, step: number) => Math.round(base * (1 + step * (level - 1)));

/** Ba nhiệm vụ mỗi ngày, mục tiêu và thưởng tăng theo cấp (như game tham khảo). */
export function dailyQuests(c: QuestContext): Quest[] {
  const lv = Math.max(1, c.level);
  const claimed = c.log.day === c.day ? new Set(c.log.claimedDaily) : new Set<string>();
  const defs = [
    { id: 'daily_customers', icon: '🧍', title: 'Đông khách', unit: 'khách', target: scale(5, lv, 0.2), current: c.stats.customers, money: scale(30000, lv, 0.25), xp: scale(20, lv, 0.1) },
    { id: 'daily_items', icon: '🛒', title: 'Bán sạch kệ', unit: 'món', target: scale(15, lv, 0.2), current: c.stats.itemsSold, money: scale(40000, lv, 0.25), xp: scale(25, lv, 0.1) },
    { id: 'daily_revenue', icon: '💵', title: 'Doanh thu trong ngày', unit: 'đ', target: scale(150000, lv, 0.25), current: c.stats.revenue, money: scale(60000, lv, 0.25), xp: scale(35, lv, 0.1) },
  ];
  return defs.map((d) => ({
    id: d.id, icon: d.icon, title: d.title,
    description: `Đạt ${d.target.toLocaleString('vi-VN')} ${d.unit} trong ngày`,
    current: Math.min(d.current, d.target), target: d.target, money: d.money, xp: d.xp,
    done: d.current >= d.target, claimed: claimed.has(d.id),
  }));
}

interface StoryStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  money: number;
  xp: number;
  measure: (c: QuestContext) => number;
}

/** Chuỗi cốt truyện làm lần lượt, mỗi lúc chỉ một bước. */
export const STORY_STEPS: readonly StoryStep[] = [
  { id: 'story_first_customers', icon: '🎉', title: 'Khai trương', description: 'Phục vụ 10 khách đầu tiên', target: 10, money: 50000, xp: 30, measure: (c) => c.totals.customers },
  { id: 'story_revenue_1', icon: '💰', title: 'Có vốn quay vòng', description: 'Đạt tổng doanh thu 500.000đ', target: 500000, money: 80000, xp: 50, measure: (c) => c.totals.revenue },
  { id: 'story_level_3', icon: '⭐', title: 'Tiệm có tiếng', description: 'Đạt cấp 3', target: 3, money: 100000, xp: 0, measure: (c) => c.level },
  { id: 'story_items', icon: '📦', title: 'Hàng ra đều tay', description: 'Bán tổng cộng 200 món', target: 200, money: 100000, xp: 60, measure: (c) => c.totals.itemsSold },
  { id: 'story_warehouse', icon: '🏭', title: 'Kho rộng hơn', description: 'Nâng cấp nhà kho 1 lần', target: 1, money: 120000, xp: 60, measure: (c) => c.warehouseTier },
  { id: 'story_hire', icon: '👥', title: 'Có người phụ việc', description: 'Thuê 1 nhân viên', target: 1, money: 120000, xp: 60, measure: (c) => c.staffCount },
  { id: 'story_days_7', icon: '📅', title: 'Một tuần bám trụ', description: 'Mở tiệm tới ngày thứ 8', target: 8, money: 150000, xp: 80, measure: (c) => c.day },
  { id: 'story_expand', icon: '🏗️', title: 'Mở rộng mặt bằng', description: 'Nâng tiệm lên cỡ lớn hơn', target: 1, money: 200000, xp: 100, measure: (c) => c.shopTier },
  { id: 'story_level_5', icon: '🚀', title: 'Vươn ra khỏi hẻm', description: 'Đạt cấp 5', target: 5, money: 400000, xp: 200, measure: (c) => c.level },
  { id: 'story_items_1000', icon: '📦', title: 'Nghìn món bán chạy', description: 'Bán tổng cộng 1.000 món', target: 1000, money: 500000, xp: 250, measure: (c) => c.totals.itemsSold },
  { id: 'story_revenue_50m', icon: '🏆', title: 'Doanh thu 50 triệu', description: 'Đạt tổng doanh thu 50.000.000đ', target: 50000000, money: 1000000, xp: 500, measure: (c) => c.totals.revenue },
  { id: 'story_hire_3', icon: '👥', title: 'Có đội ngũ riêng', description: 'Thuê 3 nhân viên', target: 3, money: 600000, xp: 300, measure: (c) => c.staffCount },
  { id: 'story_expand_2', icon: '🏗️', title: 'Tiệm mở rộng lần hai', description: 'Mở rộng mặt bằng 2 lần', target: 2, money: 800000, xp: 400, measure: (c) => c.shopTier },
  { id: 'story_days_30', icon: '📅', title: 'Một tháng bám trụ', description: 'Mở tiệm tới ngày thứ 31', target: 31, money: 800000, xp: 400, measure: (c) => c.day },
  { id: 'story_first_contract', icon: '📋', title: 'Đối tác đầu tiên', description: 'Giao 1 kỳ hợp đồng cung cấp', target: 1, money: 500000, xp: 200, measure: (c) => c.ordersDone },
  { id: 'story_items_5000', icon: '📦', title: 'Vạn món bán chạy', description: 'Bán tổng cộng 5.000 món', target: 5000, money: 1000000, xp: 500, measure: (c) => c.totals.itemsSold },
  { id: 'story_level_15', icon: '🚀', title: 'Siêu thị khu phố', description: 'Đạt cấp 15', target: 15, money: 1500000, xp: 600, measure: (c) => c.level },
  { id: 'story_revenue_200m', icon: '🏆', title: 'Doanh thu 200 triệu', description: 'Đạt tổng doanh thu 200.000.000đ', target: 200000000, money: 2000000, xp: 800, measure: (c) => c.totals.revenue },
  { id: 'story_warehouse_3', icon: '🏭', title: 'Nhà kho cấp 3', description: 'Nâng nhà kho lên cấp 3', target: 3, money: 1500000, xp: 500, measure: (c) => c.warehouseTier },
  { id: 'story_hire_5', icon: '👥', title: 'Đội ngũ chuyên nghiệp', description: 'Thuê 5 nhân viên', target: 5, money: 1000000, xp: 500, measure: (c) => c.staffCount },
  { id: 'story_days_100', icon: '🎆', title: 'Tầm nhìn dài hạn', description: 'Mở tiệm tới ngày thứ 101', target: 101, money: 3000000, xp: 1000, measure: (c) => c.day },
  { id: 'story_review_perfect', icon: '⭐', title: 'Đánh giá hoàn hảo', description: 'Nhận 100 lời khen 5 sao', target: 100, money: 2000000, xp: 800, measure: (c) => c.totals.customers },
  { id: 'story_treasure', icon: '👑', title: 'Tiêu thụ 1.000.000đ', description: 'Tổng chi tiêu vượt 1 triệu (đã đầu tư lớn)', target: 1000000, money: 2500000, xp: 1000, measure: (c) => c.totals.revenue },
];

/** Bước cốt truyện đang làm (bước đầu tiên chưa nhận thưởng); null khi đã xong hết. */
export function storyQuest(c: QuestContext): Quest | null {
  const claimed = new Set(c.log.claimedStory);
  const step = STORY_STEPS.find((s) => !claimed.has(s.id));
  if (!step) return null;
  const v = step.measure(c);
  return {
    id: step.id, icon: step.icon, title: step.title, description: step.description,
    current: Math.min(v, step.target), target: step.target, money: step.money, xp: step.xp,
    done: v >= step.target, claimed: false,
  };
}

/** Số nhiệm vụ đã xong mà chưa nhận thưởng (để hiện chấm đỏ trên nút). */
export function claimableCount(c: QuestContext) {
  return [...dailyQuests(c), storyQuest(c)].filter((q) => q && q.done && !q.claimed).length;
}
