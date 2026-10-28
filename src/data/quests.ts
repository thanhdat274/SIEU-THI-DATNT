import type { DayStats } from '../core/store';
import { COOKED_PRODUCT_IDS, COOK_UNLOCK } from './recipes';
import { unlockedCombos, COMBO_UNLOCK } from './combos';
import { SERVICES } from './services';
import { ONLINE_UNLOCK } from './online';
import { GARDEN_UNLOCK } from './garden';
import { SOCIAL_UNLOCK } from './social';

/** Số liệu cộng dồn cả ván, để đo nhiệm vụ cốt truyện. */
export interface Totals {
  customers: number;
  itemsSold: number;
  revenue: number;
  /** Số kỳ hợp đồng cung cấp đã giao thành công. */
  contractsDone: number;
  /** Số lời khen 5 sao nhận được. */
  fiveStars: number;
  /** Số món nhà làm đã bán (cả quầy lẫn ghi sổ). */
  cookedSold: number;
  /** Tổng tiền đã chi (nhập hàng, nội thất, nâng cấp). */
  spent: number;
  /** Số món chớp nhoáng bán được ở kệ cạnh quầy thu ngân. */
  impulseSold: number;
  /** Số đơn nấu (món nhà làm đặt riêng, giá hời) đã giao. */
  cookOrdersDone: number;
}

export const emptyTotals = (): Totals => ({
  customers: 0, itemsSold: 0, revenue: 0, contractsDone: 0, fiveStars: 0, cookedSold: 0, spent: 0,
  impulseSold: 0, cookOrdersDone: 0,
});

/** Nhiệm vụ đã nhận thưởng: nhiệm vụ ngày ghi theo ngày (sang ngày mới thì làm lại), cốt truyện ghi một lần. */
export interface QuestLog {
  day: number;
  claimedDaily: string[];
  claimedStory: string[];
  /** Kèo hôm nay (null = chưa chốt). Field mới bên trong questLog — bản save cũ tự bù null qua MERGE_DEEP, không cần lên SAVE_VERSION. */
  bet?: QuestBet | null;
}

export const emptyQuestLog = (): QuestLog => ({ day: 1, claimedDaily: [], claimedStory: [], bet: null });

// ───── Đặt kèo hôm nay ─────
// MỘT QUYẾT ĐỊNH CÓ CƯỢC ở nhịp ngày: mỗi sáng người chơi có thể CHỐT 1 kèo — làm trọn BỘ nhiệm vụ
// ngày hôm nay (dailySetProgress.allDone) ở mục tiêu CAO HƠN thì nhận thêm tiền, hụt thì không mất gì
// ngoài cơ hội (không phạt). Kèo là nguồn "thưởng sáng" có cược, bấm máy không quyết định — quyết định
// là chọn mức kèo cân với sức hôm nay.

/** Kèo đặt trên BỘ nhiệm vụ ngày của một ngày cụ thể. */
export interface QuestBet {
  day: number;
  /** Kèo đặt trên cả bộ nhiệm vụ ngày — id cố định 'daily_set' ghi rõ đối tượng của kèo trong sổ. */
  questId: string;
  /** Hệ số nhân mục tiêu cả bộ (xem BET_TIERS). */
  tier: number;
  /** Thưởng kèo đã trúng (0 = đang chạy, chưa phân định trúng/hụt). */
  bonus: number;
}

/** Kèo luôn gắn với cả bộ nhiệm vụ ngày. */
export const BET_QUEST_ID = 'daily_set';

export interface BetTier {
  icon: string;
  name: string;
  /** Nhân mục tiêu CẢ BỘ nhiệm vụ ngày so với bộ thường. */
  tier: number;
  /** Trúng kèo thì nhận thêm phần trăm TỔNG thưởng nhiệm vụ ngày này. */
  bonusPct: number;
}

/** 3 mức kèo theo độ khó. Cân bằng: bộ nhiệm vụ ngày là nguồn tiền lớn nhất giữa game, nên phần thêm
 * chỉ là % của chính tổng thưởng bộ ngày (không in tiền mới từ hư không) và giữ thang 30/50/80%:
 * ×1.0 là "kèo nhẹ" cho người mới (thêm 1/3), ×1.5 là bước ngoặt vất vả thật sự (+50%), ×2.0 gần chạm
 * trần — khó nhất mà vẫn không vượt trần cứng bên dưới. */
export const BET_TIERS: readonly BetTier[] = [
  { icon: '☕', name: 'Kèo nhẹ', tier: 1.0, bonusPct: 0.30 },
  { icon: '🔥', name: 'Kèo vừa', tier: 1.5, bonusPct: 0.50 },
  { icon: '💥', name: 'Kèo to', tier: 2.0, bonusPct: 0.80 },
];

/** Trần cứng: tổng tiền thêm của kèo tối đa = 1× tổng thưởng nhiệm vụ ngày — kèo không bao giờ
 * nhảy lên thành nguồn tiền to hơn chính bộ nhiệm vụ (mức kèo cao nhất 80% vẫn dưới trần này). */
export const BET_BONUS_CAP = 1.0;

// ───── Neo thưởng nhiệm vụ ngày vào "kinh tế thật" (GĐ106) ─────
// Khảo sát GĐ103 + mô phỏng 30 ngày GĐ105 cho thấy tổng thưởng bộ nhiệm vụ ngày (nhiệm vụ + kèo) thường
// gấp 5–6× lãi bán hàng thật của tiệm → tiền dư thừa, quyết định tài chính hằng ngày (giá/nhập/kho) gần
// như vô nghĩa. Áp pattern giftEcoScale (GĐ17) nhưng theo hướng TRẦN: tổng thưởng bộ ngày bị chặn ở một
// bội số của lãi bình quân gần đây (recentAvgProfit) — tiệm càng lớn thì tổng thưởng càng đáng nhưng
// KHÔNG được lấn át sức bán thật. Tiệm nhỏ (chưa tới QUEST_ECO_FLOOR) hoặc chưa có lịch sử lãi → không
// giới hạn (Infinity) → người mới/ngày đầu giữ nguyên hành vi.

/** Lãi bình quân/ngày (7 ngày gần) từ đây mới bắt đầu giới hạn tổng thưởng bộ. */
export const QUEST_ECO_FLOOR = 150_000;
/** Trần tổng thưởng bộ ngày = QUEST_ECO_MULT × lãi bình quân/ngày. */
export const QUEST_ECO_MULT = 3.0;

/** Trần tổng thưởng tiền của bộ nhiệm vụ ngày. Tiệm nhỏ/chưa có lãi → Infinity (không giới hạn). */
export function questEcoCap(avgDailyProfit: number): number {
  if (!(avgDailyProfit > 0) || avgDailyProfit <= QUEST_ECO_FLOOR) return Infinity;
  return avgDailyProfit * QUEST_ECO_MULT;
}

/** Tiền thưởng kẽ nếu trúng ở mức `tier`: % tổng thưởng nhiệm vụ ngày, chặn bởi trần cứng. */
export function betBonusMoney(tier: number, totalDailyMoney: number): number {
  const def = BET_TIERS.find((t) => t.tier === tier) ?? BET_TIERS[0];
  return Math.min(Math.round(totalDailyMoney * def.bonusPct), Math.round(totalDailyMoney * BET_BONUS_CAP));
}

export type BetStatus = 'none' | 'pending' | 'won' | 'lost';

/** Phân định kèo THUẦN ĐỌC (không cần action): trong ngày thì pending (đã trúng nếu bonus > 0);
 * qua ngày thì kèo hết giá trị — hụt hôm qua chỉ nhắc lại đúng 1 sáng ("mai thử lại"), trúng hôm qua khuất luôn. */
export function betStatus(day: number, bet: QuestBet | null | undefined): BetStatus {
  if (!bet) return 'none';
  if (bet.day === day) return bet.bonus > 0 ? 'won' : 'pending';
  return bet.bonus > 0 || bet.day < day - 1 ? 'none' : 'lost';
}

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
  /** Ngữ cảnh hôm nay: hàng của dịp lễ đang diễn ra (đổi nhiệm vụ ngày theo tình hình). */
  festivalGoods: string[];
  /** Số lời hẹn giữ món khách quen sẽ ghé lấy hôm nay. */
  reservationsToday: number;
  /** Tiền nhà hôm nay (để nhiệm vụ "trụ được" tính đủ chi phí). */
  rent: number;
  /** Lãi bình quân/ngày gần đây (recentAvgProfit) — nguồn neo tổng thưởng bộ (GĐ106); thiếu → bỏ qua trần. */
  avgDailyProfit?: number;
}

const scale = (base: number, level: number, step: number) => Math.round(base * (1 + step * (level - 1)));

/** Món nhà làm bán được trong ngày (đọc từ sổ bán theo món). */
const cookedSoldToday = (c: QuestContext) =>
  Object.entries(c.stats.byItem ?? {}).reduce((n, [id, line]) => n + (COOKED_PRODUCT_IDS.has(id) ? line.qty : 0), 0);

interface DailyDef {
  id: string; icon: string; title: string; unit: string;
  target: number; current: number; money: number; xp: number;
  show: boolean;
  /** Mô tả riêng thay cho mặc định "Đạt {n} {unit} trong ngày". */
  desc?: string;
}

/** Nhiệm vụ mỗi ngày, mục tiêu và thưởng tăng theo cấp. Đủ mở gì thì thêm việc đó:
 *  luôn có khách/doanh thu/khách vui, lên cấp 3 có dịch vụ quầy, cấp 6 có combo, cấp 8 thêm trại + mạng xã hội,
 *  cấp 10 thêm đơn app, cấp 21 có món nhà làm và đơn nấu; đang lễ thì đổi nhiệm vụ giữa sang bán hàng của dịp,
 *  có lời hẹn thì giữ đúng hẹn. Các việc tuỳ chọn xoay vòng theo ngày để mỗi ngày có thành phần mới. */
export function dailyQuests(c: QuestContext): Quest[] {
  const lv = Math.max(1, c.level);
  const claimed = c.log.day === c.day ? new Set(c.log.claimedDaily) : new Set<string>();
  // Nhiệm vụ giữa đổi theo ngữ cảnh: đang lễ thì bán hàng của dịp; có lời hẹn thì giữ đúng hẹn; ngày thường bán đều tay
  const festivalSold = c.festivalGoods.reduce((n, id) => n + (c.stats.byItem?.[id]?.qty ?? 0), 0);
  const middle: DailyDef = c.festivalGoods.length
    ? { id: 'daily_festival', icon: '🎉', title: 'Bán hàng của dịp', unit: 'món', target: scale(6, lv, 0.25), current: festivalSold, money: scale(120000, lv, 0.25), xp: scale(70, lv, 0.1), show: true }
    : c.reservationsToday > 0
      ? { id: 'daily_reserve', icon: '🤝', title: 'Giữ đúng hẹn', unit: 'lời hẹn', target: c.reservationsToday, current: c.stats.reservationsFilled ?? 0, money: scale(100000, lv, 0.25), xp: scale(60, lv, 0.1), show: true }
      : { id: 'daily_items', icon: '🛒', title: 'Bán sạch kệ', unit: 'món', target: scale(15, lv, 0.2), current: c.stats.itemsSold, money: scale(80000, lv, 0.25), xp: scale(50, lv, 0.1), show: true };
  // Nhóm luôn hiện: xương sống mỗi ngày, không xoay
  const always: DailyDef[] = [
    { id: 'daily_customers', icon: '🧍', title: 'Đông khách', unit: 'khách', target: scale(5, lv, 0.2), current: c.stats.customers, money: scale(60000, lv, 0.25), xp: scale(40, lv, 0.1), show: true },
    middle,
    { id: 'daily_revenue', icon: '💵', title: 'Doanh thu trong ngày', unit: 'đ', target: scale(150000, lv, 0.25), current: c.stats.revenue, money: scale(120000, lv, 0.25), xp: scale(70, lv, 0.1), show: true },
    { id: 'daily_smile', icon: '😊', title: 'Khách vui vẻ', unit: 'khách', target: scale(8, lv, 0.15), current: Math.max(0, (c.stats.customers ?? 0) - (c.stats.unhappy ?? 0)), money: scale(80000, lv, 0.25), xp: scale(50, lv, 0.1), show: true, desc: 'Phục vụ {n} khách vui vẻ (không tính khách phàn nàn)' },
  ];
  // Nhóm tuỳ chọn: lọc theo điều kiện mở rồi XOAY VÒNG THEO NGÀY — start = ngày % độ dài pool,
  // lấy 3 mục kế tiếp vòng tròn. Xoay xác định (không random) nên mỗi ngày đổi thành phần,
  // cùng một ngày nào đó luôn ra cùng tổ hợp, và pool xoay hết một vòng thì lặp lại.
  const optional: DailyDef[] = [
    { id: 'daily_services', icon: '🏦', title: 'Lời từ dịch vụ', unit: 'đ', target: scale(20000, lv, 0.15), current: c.stats.services ?? 0, money: scale(50000, lv, 0.25), xp: scale(35, lv, 0.1), show: lv >= (SERVICES[0]?.unlock ?? 99) },
    { id: 'daily_combo', icon: '🎁', title: 'Bán theo combo', unit: 'combo', target: scale(3, lv, 0.1), current: c.stats.combos ?? 0, money: scale(90000, lv, 0.25), xp: scale(55, lv, 0.1), show: lv >= COMBO_UNLOCK && unlockedCombos(lv).length > 0 },
    { id: 'daily_cooked', icon: '🍳', title: 'Bán món nhà làm', unit: 'món', target: scale(5, lv, 0.15), current: cookedSoldToday(c), money: scale(100000, lv, 0.25), xp: scale(60, lv, 0.1), show: lv >= COOK_UNLOCK },
    // Trần đơn app/ngày (data/online.ts): đơn chỉ đổ về trong ONLINE_HOURS (870 phút), cách nhau
    // orderGap(5★, cấp) × hệ số ngẫu nhiên trung bình 1.0 ⇒ tối đa ~870/max(35, 95−cấp) đơn:
    // cấp 10 ≈ 10 đơn, cấp 40 ≈ 16 đơn, từ cấp ≥ 60 chạm sàn 35 phút ⇒ trần ~25 đơn/ngày.
    // Chốt step 0.07 (cũ 0.1 làm cấp 40 phải giao 15/16 đơn — gần như toàn bộ trần):
    //   cấp mở khoá 10 → round(3 × (1 + 0.07×9)) = 5 đơn (~nửa trần lúc mới mở, dải 4–6),
    //   cấp 40         → round(3 × (1 + 0.07×39)) = 11 đơn ≈ 70% trần 16 đơn/ngày (dải 60–75%).
    { id: 'daily_online', icon: '🛵', title: 'Giao đơn app', unit: 'đơn', target: scale(3, lv, 0.07), current: c.stats.onlineDone ?? 0, money: scale(120000, lv, 0.25), xp: scale(60, lv, 0.1), show: lv >= ONLINE_UNLOCK },
    { id: 'daily_farm', icon: '🌾', title: 'Thu hoạch trại', unit: 'sản phẩm', target: scale(6, lv, 0.15), current: c.stats.farmHarvest ?? 0, money: scale(90000, lv, 0.25), xp: scale(50, lv, 0.1), show: lv >= GARDEN_UNLOCK },
    // promote() chỉ cho đăng 1 bài/ngày (data/social.ts) nên mục tiêu cố định 1, đo cả bài xin lỗi khi khủng hoảng
    { id: 'daily_social', icon: '📱', title: 'Lên mạng xã hội', unit: 'bài', target: 1, current: c.stats.socialPosts ?? 0, money: scale(70000, lv, 0.25), xp: scale(40, lv, 0.1), show: lv >= SOCIAL_UNLOCK, desc: 'Đăng bài quảng bá (hoặc xin lỗi khi khủng hoảng) hôm nay' },
    { id: 'daily_cook_orders', icon: '🥡', title: 'Giao đơn nấu', unit: 'đơn', target: scale(2, lv, 0.1), current: c.stats.cookOrders ?? 0, money: scale(110000, lv, 0.25), xp: scale(55, lv, 0.1), show: lv >= COOK_UNLOCK },
  ].filter((d) => d.show);
  const start = optional.length ? c.day % optional.length : 0;
  const picked = Array.from({ length: Math.min(3, optional.length) }, (_, i) => optional[(start + i) % optional.length]);
  const defs = [...always, ...picked].filter((d) => d.show);
  // Kèo hôm nay: nhân mục tiêu CẢ BỘ (chỉ mục tiêu — thưởng từng việc giữ nguyên, phần thêm của kèo tính riêng ở betBonusMoney).
  const betTier = c.log.bet && c.log.bet.day === c.day ? c.log.bet.tier : 1;
  // GĐ106 — Neo tổng thưởng tiền của bộ ngày vào lãi bình quân gần đây (kinh tế thật): dù mỗi việc định
  // mức theo cấp, tổng bộ bị chặn ở questEcoCap(c.avgDailyProfit). Vượt trần → giảm ĐỀU tiền từng việc để
  // tổng đúng trần (per-quest giữ nguyên tỉ lệ). Tiệm nhỏ/chưa có lãi (cap=Infinity) → tỉ lệ 1, không đổi.
  const rawTotal = defs.reduce((n, d) => n + d.money, 0);
  const scaledRatio = rawTotal > 0 ? Math.min(1, questEcoCap(c.avgDailyProfit ?? 0) / rawTotal) : 1;
  return defs.map((d) => {
    const target = Math.round(d.target * betTier);
    const money = Math.max(0, Math.floor(d.money * scaledRatio));
    return {
      id: d.id, icon: d.icon, title: d.title,
      description: ('desc' in d && d.desc ? d.desc.replace('{n}', target.toLocaleString('vi-VN')) : `Đạt ${target.toLocaleString('vi-VN')} ${d.unit} trong ngày`),
      current: Math.min(d.current, target), target, money, xp: d.xp,
      done: d.current >= target, claimed: claimed.has(d.id),
    };
  });
}

// ───── Tiến độ "trọn bộ" nhiệm vụ hôm nay ─────

export interface DailySetProgress {
  /** Số việc hôm nay (đã hiện). */
  total: number;
  /** Số việc đã đạt mục tiêu (chưa tính đã nhận thưởng). */
  done: number;
  /** Số việc đã nhận thưởng. */
  claimed: number;
  pct: number;
  allDone: boolean;
  allClaimed: boolean;
}

/** Đếm cả bộ nhiệm vụ ngày: đã xong X/M, đã nhận thưởng, và trạng thái khép trọn bộ. */
export function dailySetProgress(c: QuestContext): DailySetProgress {
  const qs = dailyQuests(c);
  const total = qs.length;
  const done = qs.filter((q) => q.done).length;
  const claimed = qs.filter((q) => q.claimed).length;
  return {
    total,
    done,
    claimed,
    pct: total ? Math.round((done / total) * 100) : 0,
    allDone: total > 0 && done === total,
    allClaimed: total > 0 && claimed === total,
  };
}

// ───── Kèo: bộ "việc chính hôm nay" (GĐ107) ─────
// GĐ105 mô phỏng cho thấy kèo gắn TRỌN BỘ nhiệm vụ ngày (gồm cả việc xoay tuỳ chọn: app/social/nấu/combo/
// dịch vụ) không bao giờ trúng — kể cả tier ×1.0 — vì muốn thắng phải làm MỌI việc cùng lúc một ngày.
// Giữ chân "kèo có cược" (GĐ103) cần một thưởng thực sự đạt được: tái định nghĩa KÈO bám vào bộ VIỆC
// CHÍNH hằng ngày (đông khách + bán hàng/giữ hẹn + doanh thu) — "tiệm hôm nay chạy tốt" — thay vì đòi
// thêm các việc phụ xoay vòng. Tier (×1.0/1.5/2.0, xem BET_TIERS) vẫn nhân mục tiêu bộ như cũ.

/** Các id nhiệm vụ "việc chính" luôn hiện mỗi ngày (kèo chỉ bám nhóm này). */
// LƯU Ý GĐ107: KHÔNG gồm daily_smile — quest "Khách vui vẻ" tự về 0 ngay khi có 1 khách phàn nàn trong
// ngày (`current: unhappy ? 0 : customers`), nên có khách quạu là kèo chết vô điều kiện dù chơi tốt.
// Kèo bám "đông khách + bán hàng/giữ hẹn + doanh thu" — tiêu chí "tiệm hôm nay bán chạy" — thay vì đòi
// một ngày không ai phàn nàn (quá khắt với mục tiêu của kèo).
export const BET_CORE_IDS: readonly string[] = [
  'daily_customers', 'daily_revenue', 'daily_items', 'daily_festival', 'daily_reserve',
];

/** Kiểm tra một nhiệm vụ có thuộc bộ "việc chính" mà kèo bám không. */
export const isBetCore = (id: string) => BET_CORE_IDS.includes(id);

/** Tiến độ của bộ VIỆC CHÍNH hôm nay (kèo dùng nhóm này để phân định trúng/hụt). */
export function betCoreSetProgress(c: QuestContext): DailySetProgress {
  const qs = dailyQuests(c).filter((q) => isBetCore(q.id));
  const total = qs.length;
  const done = qs.filter((q) => q.done).length;
  const claimed = qs.filter((q) => q.claimed).length;
  return {
    total,
    done,
    claimed,
    pct: total ? Math.round((done / total) * 100) : 0,
    allDone: total > 0 && done === total,
    allClaimed: total > 0 && claimed === total,
  };
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
  { id: 'story_first_customers', icon: '🎉', title: 'Khai trương', description: 'Phục vụ 10 khách đầu tiên', target: 10, money: 100000, xp: 60, measure: (c) => c.totals.customers },
  { id: 'story_revenue_1', icon: '💰', title: 'Có vốn quay vòng', description: 'Đạt tổng doanh thu 500.000đ', target: 500000, money: 160000, xp: 100, measure: (c) => c.totals.revenue },
  { id: 'story_level_3', icon: '⭐', title: 'Tiệm có tiếng', description: 'Đạt cấp 3', target: 3, money: 200000, xp: 0, measure: (c) => c.level },
  { id: 'story_items_50', icon: '📦', title: 'Hàng bắt đầu chạy', description: 'Bán tổng cộng 50 món', target: 50, money: 180000, xp: 80, measure: (c) => c.totals.itemsSold },
  { id: 'story_items', icon: '📦', title: 'Hàng ra đều tay', description: 'Bán tổng cộng 200 món', target: 200, money: 200000, xp: 120, measure: (c) => c.totals.itemsSold },
  { id: 'story_warehouse', icon: '🏭', title: 'Kho rộng hơn', description: 'Nâng cấp nhà kho 1 lần', target: 1, money: 240000, xp: 120, measure: (c) => c.warehouseTier },
  { id: 'story_hire', icon: '👥', title: 'Có người phụ việc', description: 'Thuê 1 nhân viên', target: 1, money: 240000, xp: 120, measure: (c) => c.staffCount },
  { id: 'story_days_7', icon: '📅', title: 'Một tuần bám trụ', description: 'Mở tiệm tới ngày thứ 8', target: 8, money: 300000, xp: 160, measure: (c) => c.day },
  { id: 'story_expand', icon: '🏗️', title: 'Mở rộng mặt bằng', description: 'Nâng tiệm lên cỡ lớn hơn', target: 1, money: 400000, xp: 200, measure: (c) => c.shopTier },
  { id: 'story_level_5', icon: '🚀', title: 'Vươn ra khỏi hẻm', description: 'Đạt cấp 5', target: 5, money: 800000, xp: 400, measure: (c) => c.level },
  { id: 'story_level_8', icon: '⭐', title: 'Tiệm nức tiếng', description: 'Đạt cấp 8', target: 8, money: 1000000, xp: 450, measure: (c) => c.level },
  { id: 'story_items_1000', icon: '📦', title: 'Nghìn món bán chạy', description: 'Bán tổng cộng 1.000 món', target: 1000, money: 1000000, xp: 500, measure: (c) => c.totals.itemsSold },
  { id: 'story_revenue_50m', icon: '🏆', title: 'Doanh thu 50 triệu', description: 'Đạt tổng doanh thu 50.000.000đ', target: 50000000, money: 2000000, xp: 1000, measure: (c) => c.totals.revenue },
  { id: 'story_revenue_100m', icon: '🏆', title: 'Trăm triệu đầu tiên', description: 'Đạt tổng doanh thu 100.000.000đ', target: 100000000, money: 2500000, xp: 1100, measure: (c) => c.totals.revenue },
  { id: 'story_hire_3', icon: '👥', title: 'Có đội ngũ riêng', description: 'Thuê 3 nhân viên', target: 3, money: 1200000, xp: 600, measure: (c) => c.staffCount },
  { id: 'story_warehouse_2', icon: '🏭', title: 'Kho khang trang', description: 'Nâng nhà kho lên cấp 2', target: 2, money: 1000000, xp: 450, measure: (c) => c.warehouseTier },
  { id: 'story_orders_5', icon: '📋', title: 'Khách đặt nhiều', description: 'Giao 5 đơn đặt hàng', target: 5, money: 1000000, xp: 450, measure: (c) => c.ordersDone },
  { id: 'story_expand_2', icon: '🏗️', title: 'Tiệm mở rộng lần hai', description: 'Mở rộng mặt bằng 2 lần', target: 2, money: 1600000, xp: 800, measure: (c) => c.shopTier },
  { id: 'story_days_30', icon: '📅', title: 'Một tháng bám trụ', description: 'Mở tiệm tới ngày thứ 31', target: 31, money: 1600000, xp: 800, measure: (c) => c.day },
  { id: 'story_first_contract', icon: '📋', title: 'Đối tác đầu tiên', description: 'Giao 1 kỳ hợp đồng cung cấp', target: 1, money: 1000000, xp: 400, measure: (c) => c.totals.contractsDone },
  { id: 'story_orders_20', icon: '📋', title: 'Chuyên giao hàng', description: 'Giao 20 đơn đặt hàng', target: 20, money: 2000000, xp: 700, measure: (c) => c.ordersDone },
  { id: 'story_items_5000', icon: '📦', title: 'Vạn món bán chạy', description: 'Bán tổng cộng 5.000 món', target: 5000, money: 2000000, xp: 1000, measure: (c) => c.totals.itemsSold },
  { id: 'story_level_15', icon: '🚀', title: 'Siêu thị khu phố', description: 'Đạt cấp 15', target: 15, money: 3000000, xp: 1200, measure: (c) => c.level },
  { id: 'story_level_30', icon: '⭐', title: 'Cửa hàng uy tín', description: 'Đạt cấp 30', target: 30, money: 5000000, xp: 1600, measure: (c) => c.level },
  { id: 'story_revenue_200m', icon: '🏆', title: 'Doanh thu 200 triệu', description: 'Đạt tổng doanh thu 200.000.000đ', target: 200000000, money: 4000000, xp: 1600, measure: (c) => c.totals.revenue },
  { id: 'story_warehouse_3', icon: '🏭', title: 'Nhà kho cấp 3', description: 'Nâng nhà kho lên cấp 3', target: 3, money: 3000000, xp: 1000, measure: (c) => c.warehouseTier },
  { id: 'story_hire_5', icon: '👥', title: 'Đội ngũ chuyên nghiệp', description: 'Thuê 5 nhân viên', target: 5, money: 2000000, xp: 1000, measure: (c) => c.staffCount },
  { id: 'story_days_60', icon: '📅', title: 'Hai tháng vững vàng', description: 'Mở tiệm tới ngày thứ 61', target: 61, money: 2500000, xp: 1100, measure: (c) => c.day },
  { id: 'story_level_50', icon: '🚀', title: 'Biểu tượng khu phố', description: 'Đạt cấp 50', target: 50, money: 8000000, xp: 2400, measure: (c) => c.level },
  { id: 'story_days_100', icon: '🎆', title: 'Tầm nhìn dài hạn', description: 'Mở tiệm tới ngày thứ 101', target: 101, money: 6000000, xp: 2000, measure: (c) => c.day },
  { id: 'story_review_perfect', icon: '⭐', title: 'Đánh giá hoàn hảo', description: 'Nhận 100 lời khen 5 sao', target: 100, money: 4000000, xp: 1600, measure: (c) => c.totals.fiveStars },
  { id: 'story_treasure', icon: '👑', title: 'Đầu tư lớn', description: 'Chi tổng cộng 1.000.000đ (nhập hàng, nội thất, nâng cấp)', target: 1000000, money: 5000000, xp: 2000, measure: (c) => c.totals.spent },
  // ── Nội dung cuối game (cấp 51–100) ──
  { id: 'story_level_60', icon: '🚀', title: 'Thương hiệu phố phường', description: 'Đạt cấp 60', target: 60, money: 12000000, xp: 3200, measure: (c) => c.level },
  { id: 'story_shop_tier_6', icon: '🏗️', title: 'Siêu thị khang trang', description: 'Mở rộng tiệm lên bậc 6', target: 6, money: 15000000, xp: 3000, measure: (c) => c.shopTier },
  { id: 'story_revenue_500m', icon: '🏆', title: 'Nửa tỷ doanh thu', description: 'Đạt tổng doanh thu 500.000.000đ', target: 500000000, money: 20000000, xp: 4000, measure: (c) => c.totals.revenue },
  { id: 'story_hire_10', icon: '👥', title: 'Cơ ngơi lớn', description: 'Thuê 10 nhân viên', target: 10, money: 8000000, xp: 2400, measure: (c) => c.staffCount },
  { id: 'story_warehouse_7', icon: '🏭', title: 'Tổng kho logistics', description: 'Nâng nhà kho lên cấp 7', target: 7, money: 12000000, xp: 2800, measure: (c) => c.warehouseTier },
  { id: 'story_items_20000', icon: '📦', title: 'Hai vạn món bán chạy', description: 'Bán tổng cộng 20.000 món', target: 20000, money: 15000000, xp: 4000, measure: (c) => c.totals.itemsSold },
  { id: 'story_level_75', icon: '⭐', title: 'Biểu tượng thành phố', description: 'Đạt cấp 75', target: 75, money: 20000000, xp: 5000, measure: (c) => c.level },
  { id: 'story_shop_tier_7', icon: '🏗️', title: 'Đại siêu thị', description: 'Mở rộng tiệm lên bậc 7 (mặt bằng tối đa)', target: 7, money: 25000000, xp: 5000, measure: (c) => c.shopTier },
  { id: 'story_revenue_1b', icon: '👑', title: 'Tỷ đồng doanh thu', description: 'Đạt tổng doanh thu 1.000.000.000đ', target: 1000000000, money: 50000000, xp: 9000, measure: (c) => c.totals.revenue },
  { id: 'story_level_90', icon: '🎖️', title: 'Huyền thoại sống', description: 'Đạt cấp 90', target: 90, money: 30000000, xp: 7000, measure: (c) => c.level },
  { id: 'story_level_100', icon: '🎆', title: 'Đỉnh cao tạp hóa', description: 'Đạt cấp 100 — mốc cuối game', target: 100, money: 100000000, xp: 20000, measure: (c) => c.level },
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
