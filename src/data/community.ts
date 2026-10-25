/**
 * Mục tiêu chung của hẻm trong mỗi dịp lễ: cả xóm cần bao nhiêu hàng của dịp, bao nhiêu món nhà làm,
 * tiệm trang trí đủ chưa. Chơi chung thì mọi người cùng góp vào một mục tiêu (trạng thái tiệm dùng chung).
 */
import { dayOfYear, festivalOn, festivalStock, upcomingFestival, type Festival } from './calendar';
import { COOKED_PRODUCT_IDS } from './recipes';
import { describeRep, meetsRep, type Reputation, type RepNeed } from './reputation';
import { SHOP_TIERS } from './shopTiers';

/** Bán món nhà làm từ cấp này (mở bếp). */
const COOK_LEVEL = 21;
/** Chậu cây mở từ cấp này. */
const DECOR_LEVEL = 3;

export interface CommunityGoal {
  /** Khoá theo dịp và ngày bắt đầu, để mỗi năm là một mục tiêu mới. */
  key: string;
  festival: Festival;
  startDay: number;
  days: number;
  /** Món tính vào mục tiêu (trống = mọi món). */
  items: string[];
  itemTarget: number;
  cookedTarget: number;
  decorTarget: number;
  /** Dịp lớn: xóm chỉ giao việc khi tiệm đủ uy tín. */
  rep?: RepNeed;
  reward: { money: number; xp: number; friendship: number };
}

export interface CommunityProgress {
  sold: number;
  cooked: number;
  done?: boolean;
}

export function communityGoal(f: Festival, startDay: number, level: number): CommunityGoal {
  const days = f.to - f.from + 1;
  const big = !!f.goods || f.traffic >= 1.3;
  return {
    key: `${f.id}:${startDay}`,
    festival: f,
    startDay,
    days,
    items: festivalStock(f, level),
    itemTarget: Math.round((5 + level * 0.8) * Math.min(days, 6) * (big ? 1.2 : 0.8)),
    cookedTarget: level >= COOK_LEVEL ? 3 * Math.min(days, 4) : 0,
    decorTarget: level >= DECOR_LEVEL ? (big ? 3 : 2) : 0,
    rep: big ? { min: 3.5 } : undefined,
    reward: { money: Math.round((40000 + level * 6000) * Math.min(days, 6) / 1000) * 1000, xp: 40 + level * 4 * Math.min(days, 6), friendship: 3 },
  };
}

/** Ngày khai trương sau mỗi lần nâng cấp tiệm: ngày đầu tiên mở cửa trong tiệm mới. */
export interface Opening {
  day: number;
  /** Bậc tiệm vừa xây xong. */
  tier: number;
}

/** Hôm khai trương người đi đường ghé đông hơn chừng này lần. */
export const OPENING_TRAFFIC = 1.3;

/** Cả hẻm tới mừng tiệm mới: bán thật nhiều, bày lẵng hoa (chậu cây), có bếp thì đãi món nhà làm. */
export function openingGoal(o: Opening, level: number): CommunityGoal {
  const tier = SHOP_TIERS[o.tier];
  return {
    key: `khai_truong:${o.tier}`,
    festival: {
      id: 'khai_truong', icon: '🎊', name: `Khai trương ${tier.name}`,
      blurb: 'Tiệm vừa nới rộng, cả hẻm kéo tới mừng và mua ủng hộ.',
      from: 0, to: 0, traffic: OPENING_TRAFFIC, hot: [], cost: 1, host: 'bac_tam',
    },
    startDay: o.day,
    days: 1,
    items: [],
    itemTarget: 25 + level * 2,
    cookedTarget: level >= COOK_LEVEL ? 4 : 0,
    decorTarget: 1 + o.tier,
    reward: { money: Math.round(tier.price * 0.15 / 1000) * 1000, xp: 60 + level * 5, friendship: 3 },
  };
}

/** Các mục tiêu đang chạy hôm nay: dịp lễ trong lịch và ngày khai trương (có thể trùng nhau). */
export function activeGoals(day: number, level: number, opening?: Opening): CommunityGoal[] {
  const f = festivalOn(day);
  return [
    ...(opening?.day === day ? [openingGoal(opening, level)] : []),
    ...(f ? [communityGoal(f, day - (dayOfYear(day) - f.from), level)] : []),
  ];
}

/**
 * Mục tiêu đang chạy, hoặc sắp tới để chuẩn bị trước: khai trương báo từ lúc thợ đang xây
 * (`buildingTier`, xây xong qua đêm thì mai khai trương), dịp lễ báo trước vài ngày.
 */
export function upcomingGoals(day: number, level: number, opening?: Opening, buildingTier?: number): { goal: CommunityGoal; inDays: number }[] {
  const out = activeGoals(day, level, opening).map((goal) => ({ goal, inDays: 0 }));
  if (buildingTier !== undefined) out.unshift({ goal: openingGoal({ day: day + 1, tier: buildingTier }, level), inDays: 1 });
  const soon = !festivalOn(day) && upcomingFestival(day);
  if (soon) out.push({ goal: communityGoal(soon.festival, day + soon.inDays, level), inDays: soon.inDays });
  return out;
}

export const goalLocked = (g: CommunityGoal, rep: Reputation) => !meetsRep(rep, g.rep);
export const goalLockText = (g: CommunityGoal) => (g.rep ? `Xóm chỉ giao việc dịp lớn cho tiệm uy tín: cần ${describeRep(g.rep)}` : '');

/** Cộng món bán ra vào tiến độ. */
export function addSales(g: CommunityGoal, prev: CommunityProgress | undefined, ids: string[]): CommunityProgress {
  const p = prev ?? { sold: 0, cooked: 0 };
  return {
    ...p,
    sold: p.sold + ids.filter((id) => !g.items.length || g.items.includes(id)).length,
    cooked: p.cooked + ids.filter((id) => COOKED_PRODUCT_IDS.has(id)).length,
  };
}

export const goalMet = (g: CommunityGoal, p: CommunityProgress | undefined, decor: number) =>
  (p?.sold ?? 0) >= g.itemTarget && (p?.cooked ?? 0) >= g.cookedTarget && decor >= g.decorTarget;
