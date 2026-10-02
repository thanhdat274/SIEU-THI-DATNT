import type { LongTermGoalDef, WeeklyQuestDef } from '@game/shared';
import { nullProto } from './safe-map';

export const LONG_TERM_GOALS: readonly LongTermGoalDef[] = [
  // --- Doanh thu ---
  {
    id: 'goal_sales_100k',
    category: 'sales',
    title: 'Đồng vốn đầu tiên',
    description: 'Tích lũy tổng doanh thu bán hàng đạt 100.000 ₫.',
    targetValue: 100_000,
    rewardMoney: 30_000,
    rewardReputation: 2,
    rewardExperience: 50,
  },
  {
    id: 'goal_sales_1m',
    category: 'sales',
    title: 'Tiệm ăn nên làm ra',
    description: 'Tích lũy tổng doanh thu bán hàng đạt 1.000.000 ₫.',
    targetValue: 1_000_000,
    rewardMoney: 150_000,
    rewardReputation: 5,
    rewardExperience: 200,
  },
  {
    id: 'goal_sales_10m',
    category: 'sales',
    title: 'Đại phú xóm nhỏ',
    description: 'Tích lũy tổng doanh thu bán hàng đạt 10.000.000 ₫.',
    targetValue: 10_000_000,
    rewardMoney: 800_000,
    rewardReputation: 10,
    rewardExperience: 1000,
  },

  // --- Khách hàng ---
  {
    id: 'goal_cust_10',
    category: 'customers',
    title: 'Mở cửa đón khách',
    description: 'Phục vụ chu đáo 10 vị khách ghé tiệm.',
    targetValue: 10,
    rewardMoney: 20_000,
    rewardReputation: 2,
    rewardExperience: 40,
  },
  {
    id: 'goal_cust_50',
    category: 'customers',
    title: 'Khách vào nườm nượp',
    description: 'Phục vụ chu đáo 50 vị khách ghé tiệm.',
    targetValue: 50,
    rewardMoney: 80_000,
    rewardReputation: 4,
    rewardExperience: 150,
  },
  {
    id: 'goal_cust_200',
    category: 'customers',
    title: 'Tiệm thân thuộc đầu hẻm',
    description: 'Phục vụ chu đáo 200 vị khách ghé tiệm.',
    targetValue: 200,
    rewardMoney: 300_000,
    rewardReputation: 8,
    rewardExperience: 600,
  },

  // --- Mặt bằng & Quy mô ---
  {
    id: 'goal_expand_shelf_3',
    category: 'expansion',
    title: 'Kệ hàng phong phú',
    description: 'Bày trí ít nhất 3 kệ bán hàng trong tiệm.',
    targetValue: 3,
    rewardMoney: 50_000,
    rewardReputation: 3,
    rewardExperience: 100,
  },
  {
    id: 'goal_expand_stall_1',
    category: 'expansion',
    title: 'Hương vị đầu hẻm',
    description: 'Mở ít nhất 1 quầy ăn uống bên hông tiệm.',
    targetValue: 1,
    rewardMoney: 100_000,
    rewardReputation: 5,
    rewardExperience: 250,
  },

  // --- Uy tín ---
  {
    id: 'goal_rep_20',
    category: 'reputation',
    title: 'Uy tín xóm giềng',
    description: 'Đạt chỉ số uy tín tiệm từ 20 điểm trở lên.',
    targetValue: 20,
    rewardMoney: 40_000,
    rewardReputation: 3,
    rewardExperience: 80,
  },
  {
    id: 'goal_rep_50',
    category: 'reputation',
    title: 'Thương hiệu nức tiếng',
    description: 'Đạt chỉ số uy tín tiệm từ 50 điểm trở lên.',
    targetValue: 50,
    rewardMoney: 120_000,
    rewardReputation: 6,
    rewardExperience: 300,
  },
];

export const GOAL_MAP: Record<string, LongTermGoalDef> = nullProto(Object.fromEntries(
  LONG_TERM_GOALS.map((g) => [g.id, g])
));

export const WEEKLY_QUESTS: readonly WeeklyQuestDef[] = [
  {
    id: 'week_revenue_300k',
    title: 'Doanh số tuần này',
    description: 'Đạt ít nhất 300.000 ₫ doanh thu bán lẻ trong tuần.',
    targetType: 'revenue',
    targetValue: 300_000,
    rewardMoney: 60_000,
    rewardReputation: 3,
  },
  {
    id: 'week_served_25',
    title: 'Tiếp đón bà con',
    description: 'Phục vụ ít nhất 25 lượt khách thanh toán thành công trong tuần.',
    targetType: 'customers',
    targetValue: 25,
    rewardMoney: 50_000,
    rewardReputation: 3,
  },
  {
    id: 'week_party_fulfill_1',
    title: 'Giao trọn đơn tiệc',
    description: 'Hoàn thành ít nhất 1 đơn tiệc có hạn cho xóm.',
    targetType: 'party_orders',
    targetValue: 1,
    rewardMoney: 80_000,
    rewardReputation: 4,
  },
];
