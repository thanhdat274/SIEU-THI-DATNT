/**
 * Thú cưng, thành tựu và thanh tra thị trường (dữ liệu + hàm thuần).
 * Tách từ `data/biz.ts` (GĐ973) — `biz.ts` vẫn xuất lại toàn bộ nên chỗ dùng cũ không đổi.
 */
import type { Vehicle } from './biz';

// ───────────────────────── Thú cưng ─────────────────────────

export type PetKind = 'cat' | 'dog';
export interface PetDef { kind: PetKind; icon: string; name: string; price: number; unlock: number; food: string; desc: string }
export const PETS: PetDef[] = [
  { kind: 'cat', icon: '🐱', name: 'Mèo Mướp', price: 300000, unlock: 5, food: 'x_thuc_an_meo', desc: 'Nằm quầy bắt chuột: hàng hỏng chậm hơn 20%. Trẻ con thích ghé vuốt mèo.' },
  { kind: 'dog', icon: '🐶', name: 'Chó Vàng', price: 500000, unlock: 12, food: 'x_thuc_an_cho', desc: 'Giữ cửa: kẻ trộm ít dám vào hơn một nửa, dễ bị bắt hơn.' },
];
export interface PetState { fedDay: number }
export const petDef = (k: PetKind) => PETS.find((p) => p.kind === k)!;
/** Thú được cho ăn hôm qua hoặc hôm nay thì mới có tác dụng. */
export const petActive = (p: PetState | undefined, day: number) => !!p && day - p.fedDay <= 1;
/** Chó giữ nhà giảm trộm/tiền giả; mèo giảm hỏng hàng — đặt ở data để core/stock không import vòng qua core/biz. */
export const theftFactor = (b: { pets: Record<string, PetState | undefined> }, day: number) => (petActive(b.pets.dog, day) ? 0.45 : 1);
export const spoilFactor = (b: { pets: Record<string, PetState | undefined> }, day: number) => (petActive(b.pets.cat, day) ? 0.8 : 1);

// ───────────────────────── Thành tựu ─────────────────────────

export interface AchievementCtx {
  totals: { revenue: number; itemsSold: number; customers: number };
  level: number;
  ordersDone: number;
  phoneOrdersDone: number;
  closeFriends: number;
  rivalsBeaten: number;
  petCount: number;
  homeDecor: number;
  vehicle: Vehicle;
  perfectDays: number;
  /** Số món nhà làm đã bán. */
  cookedSold: number;
  /** Số trạm nấu khác nhau đã lắp. */
  cookedStations: number;
  /** Sao chất lượng món (từ sổ danh tiếng). */
  qualityStars: number;
  /** Số món chớp nhoáng bán ở kệ cạnh quầy. */
  impulseSold: number;
  /** Số đơn nấu (đặt riêng món nhà làm) đã giao. */
  cookOrdersDone: number;
  /** Số đối thủ bị hạ bởi đợt phản công chủ động. */
  counterKills: number;
  /** GĐ464: bậc cửa hàng nước (0..2) và tiệm xôi đã mở rộng — tuỳ chọn để ctx test cũ vẫn hợp lệ. */
  quanTier?: number;
  xoiBig?: boolean;
  xoiDine?: number;
}
export interface Achievement {
  id: string; icon: string; name: string; desc: string; reward: number;
  done: (c: AchievementCtx) => boolean;
  /** Tiến độ hiện tại (mục đo bằng số) để panel vẽ thanh "còn bao xa tới thưởng"; money=true thì hiện kiểu tiền. */
  goal?: (c: AchievementCtx) => { cur: number; goal: number; money?: boolean };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_100', icon: '🛒', name: 'Mối đầu tiên', desc: 'Bán 100 món', reward: 20000, done: (c) => c.totals.itemsSold >= 100, goal: (c) => ({ cur: c.totals.itemsSold, goal: 100 }) },
  { id: 'items_1000', icon: '📦', name: 'Nghìn món', desc: 'Bán 1.000 món', reward: 100000, done: (c) => c.totals.itemsSold >= 1000, goal: (c) => ({ cur: c.totals.itemsSold, goal: 1000 }) },
  { id: 'items_10000', icon: '🏭', name: 'Vạn món', desc: 'Bán 10.000 món', reward: 600000, done: (c) => c.totals.itemsSold >= 10000, goal: (c) => ({ cur: c.totals.itemsSold, goal: 10000 }) },
  { id: 'rev_10m', icon: '💰', name: 'Chục triệu', desc: 'Tổng doanh thu 10 triệu', reward: 200000, done: (c) => c.totals.revenue >= 10000000, goal: (c) => ({ cur: c.totals.revenue, goal: 10000000, money: true }) },
  { id: 'rev_100m', icon: '🏦', name: 'Trăm triệu', desc: 'Tổng doanh thu 100 triệu', reward: 1500000, done: (c) => c.totals.revenue >= 100000000, goal: (c) => ({ cur: c.totals.revenue, goal: 100000000, money: true }) },
  { id: 'cust_1000', icon: '👥', name: 'Cả xóm đều biết', desc: 'Đón 1.000 lượt khách', reward: 150000, done: (c) => c.totals.customers >= 1000, goal: (c) => ({ cur: c.totals.customers, goal: 1000 }) },
  { id: 'friends_5', icon: '💛', name: 'Bạn của cả hẻm', desc: '5 khách quen thân từ 40 💛', reward: 200000, done: (c) => c.closeFriends >= 5, goal: (c) => ({ cur: c.closeFriends, goal: 5 }) },
  { id: 'orders_10', icon: '🎉', name: 'Lo tiệc giỏi', desc: 'Giao 10 đơn tiệc', reward: 150000, done: (c) => c.ordersDone >= 10, goal: (c) => ({ cur: c.ordersDone, goal: 10 }) },
  { id: 'phone_20', icon: '📞', name: 'Alo là có', desc: 'Giao 20 đơn gọi điện', reward: 150000, done: (c) => c.phoneOrdersDone >= 20, goal: (c) => ({ cur: c.phoneOrdersDone, goal: 20 }) },
  { id: 'rival', icon: '⚔️', name: 'Đứng vững đầu hẻm', desc: 'Khiến một tiệm đối thủ đóng cửa', reward: 300000, done: (c) => c.rivalsBeaten >= 1, goal: (c) => ({ cur: c.rivalsBeaten, goal: 1 }) },
  { id: 'perfect', icon: '🌟', name: 'Ngày hoàn hảo', desc: 'Một ngày từ 20 khách, không ai không hài lòng', reward: 100000, done: (c) => c.perfectDays >= 1, goal: (c) => ({ cur: c.perfectDays, goal: 1 }) },
  { id: 'pets', icon: '🐾', name: 'Tiệm có bé cưng', desc: 'Nuôi cả mèo và chó', reward: 100000, done: (c) => c.petCount >= 2, goal: (c) => ({ cur: c.petCount, goal: 2 }) },
  { id: 'home', icon: '🏡', name: 'Tổ ấm', desc: 'Sắm đủ 4 món cho nhà riêng', reward: 100000, done: (c) => c.homeDecor >= 4, goal: (c) => ({ cur: c.homeDecor, goal: 4 }) },
  { id: 'moto', icon: '🏍️', name: 'Có xe máy', desc: 'Mua xe máy', reward: 50000, done: (c) => c.vehicle === 'moto' },
  { id: 'cooked_500', icon: '🍲', name: 'Bếp kho đã động', desc: 'Bán 500 món nhà làm', reward: 200000, done: (c) => c.cookedSold >= 500, goal: (c) => ({ cur: c.cookedSold, goal: 500 }) },
  { id: 'stations_8', icon: '🏭', name: 'Nhà hàng thu nhỏ', desc: 'Lắp đủ 8 trạm nấu', reward: 400000, done: (c) => c.cookedStations >= 8, goal: (c) => ({ cur: c.cookedStations, goal: 8 }) },
  { id: 'quality_4', icon: '⭐', name: 'Ngon có tiếng', desc: 'Chất lượng món đạt 4★ danh tiếng', reward: 300000, done: (c) => c.qualityStars >= 4, goal: (c) => ({ cur: c.qualityStars, goal: 4 }) },
  { id: 'impulse_100', icon: '🍬', name: 'Kệ sinh lời cạnh quầy', desc: 'Bán 100 món chớp nhoáng ở kệ bên quầy thu ngân', reward: 100000, done: (c) => c.impulseSold >= 100, goal: (c) => ({ cur: c.impulseSold, goal: 100 }) },
  { id: 'cook_orders_10', icon: '🍳', name: 'Bếp nhận đơn riêng', desc: 'Giao 10 đơn nấu món nhà làm (giá hời)', reward: 150000, done: (c) => c.cookOrdersDone >= 10, goal: (c) => ({ cur: c.cookOrdersDone, goal: 10 }) },
  { id: 'counter_kill', icon: '🎯', name: 'Đòn kết liễu', desc: 'Khiến đối thủ đóng cửa bằng đợt phản công chủ động', reward: 300000, done: (c) => c.counterKills >= 1, goal: (c) => ({ cur: c.counterKills, goal: 1 }) },
  { id: 'level_20', icon: '⭐', name: 'Chủ tiệm lành nghề', desc: 'Đạt cấp 20', reward: 200000, done: (c) => c.level >= 20, goal: (c) => ({ cur: c.level, goal: 20 }) },
  { id: 'level_50', icon: '👑', name: 'Ông trùm siêu thị', desc: 'Đạt cấp 50', reward: 2000000, done: (c) => c.level >= 50, goal: (c) => ({ cur: c.level, goal: 50 }) },
  // ── Mốc xa — cho người chơi dài hơi mục tiêu để trụ lại ──
  { id: 'level_80', icon: '🌟', name: 'Bậc thầy ngành tạp hóa', desc: 'Đạt cấp 80', reward: 3000000, done: (c) => c.level >= 80, goal: (c) => ({ cur: c.level, goal: 80 }) },
  { id: 'level_90', icon: '👑', name: 'Huyền thoại phố hẻm', desc: 'Đạt cấp 90', reward: 5000000, done: (c) => c.level >= 90, goal: (c) => ({ cur: c.level, goal: 90 }) },
  { id: 'level_100', icon: '🏆', name: 'Bá chủ ngõ phố', desc: 'Đạt cấp 100 (sẵn sàng tái sinh)', reward: 20000000, done: (c) => c.level >= 100, goal: (c) => ({ cur: c.level, goal: 100 }) },
  { id: 'level_110', icon: '🥇', name: 'Ông trùm chợ phường', desc: 'Đạt cấp 110', reward: 25000000, done: (c) => c.level >= 110, goal: (c) => ({ cur: c.level, goal: 110 }) },
  { id: 'level_120', icon: '🏯', name: 'Vua tạp hóa quận', desc: 'Đạt cấp 120', reward: 30000000, done: (c) => c.level >= 120, goal: (c) => ({ cur: c.level, goal: 120 }) },
  { id: 'level_130', icon: '🚀', name: 'Đế chế bán lẻ', desc: 'Đạt cấp 130', reward: 35000000, done: (c) => c.level >= 130, goal: (c) => ({ cur: c.level, goal: 130 }) },
  { id: 'level_140', icon: '🌏', name: 'Thương hiệu toàn thành', desc: 'Đạt cấp 140', reward: 40000000, done: (c) => c.level >= 140, goal: (c) => ({ cur: c.level, goal: 140 }) },
  { id: 'level_150', icon: '💎', name: 'Huyền thoại kim cương', desc: 'Đạt cấp 150', reward: 50000000, done: (c) => c.level >= 150, goal: (c) => ({ cur: c.level, goal: 150 }) },
  { id: 'level_160', icon: '🗺️', name: 'Chuỗi cửa hàng liên tỉnh', desc: 'Đạt cấp 160', reward: 60000000, done: (c) => c.level >= 160, goal: (c) => ({ cur: c.level, goal: 160 }) },
  { id: 'level_170', icon: '🏛️', name: 'Tượng đài thương nghiệp', desc: 'Đạt cấp 170', reward: 70000000, done: (c) => c.level >= 170, goal: (c) => ({ cur: c.level, goal: 170 }) },
  { id: 'level_180', icon: '🌠', name: 'Ngôi sao Bắc Nam', desc: 'Đạt cấp 180', reward: 80000000, done: (c) => c.level >= 180, goal: (c) => ({ cur: c.level, goal: 180 }) },
  { id: 'level_190', icon: '🔱', name: 'Bất tử phố thị', desc: 'Đạt cấp 190', reward: 90000000, done: (c) => c.level >= 190, goal: (c) => ({ cur: c.level, goal: 190 }) },
  { id: 'level_200', icon: '👑', name: 'Thánh tạp hóa', desc: 'Đạt cấp 200', reward: 150000000, done: (c) => c.level >= 200, goal: (c) => ({ cur: c.level, goal: 200 }) },
  { id: 'rev_500m', icon: '🏬', name: 'Nửa tỷ đồng', desc: 'Tổng doanh thu 500 triệu', reward: 3000000, done: (c) => c.totals.revenue >= 500000000, goal: (c) => ({ cur: c.totals.revenue, goal: 500000000, money: true }) },
  { id: 'items_100k', icon: '🏭', name: 'Trăm nghìn món', desc: 'Bán 100.000 món', reward: 2000000, done: (c) => c.totals.itemsSold >= 100000, goal: (c) => ({ cur: c.totals.itemsSold, goal: 100000 }) },
  { id: 'cust_5000', icon: '🎪', name: 'Cả phường quen mặt', desc: 'Đón 5.000 lượt khách', reward: 800000, done: (c) => c.totals.customers >= 5000, goal: (c) => ({ cur: c.totals.customers, goal: 5000 }) },
  { id: 'friends_10', icon: '💞', name: 'Hẻm tui thân nhau', desc: '10 khách quen thân từ 40 💛', reward: 400000, done: (c) => c.closeFriends >= 10, goal: (c) => ({ cur: c.closeFriends, goal: 10 }) },
  { id: 'perfect_10', icon: '🌈', name: 'Trọn một tháng không phật lòng', desc: 'Đạt 10 ngày hoàn hảo', reward: 1000000, done: (c) => c.perfectDays >= 10, goal: (c) => ({ cur: c.perfectDays, goal: 10 }) },
  { id: 'cooked_2000', icon: '🍱', name: 'Bếp chạy đều mỗi ngày', desc: 'Bán 2.000 món nhà làm', reward: 600000, done: (c) => c.cookedSold >= 2000, goal: (c) => ({ cur: c.cookedSold, goal: 2000 }) },
  { id: 'impulse_500', icon: '🍭', name: 'Kệ cạnh quầy đắc ý', desc: 'Bán 500 món chớp nhoáng ở kệ bên quầy thu ngân', reward: 300000, done: (c) => c.impulseSold >= 500, goal: (c) => ({ cur: c.impulseSold, goal: 500 }) },
  { id: 'quan_cafe', icon: '☕', name: 'Quán cà phê', desc: 'Nâng cửa hàng nước lên Quán cà phê', reward: 2000000, done: (c) => (c.quanTier ?? 0) >= 2, goal: (c) => ({ cur: c.quanTier ?? 0, goal: 2 }) },
  { id: 'xoi_big', icon: '🍚', name: 'Bếp xôi lớn', desc: 'Mở rộng bếp tiệm xôi', reward: 1500000, done: (c) => !!c.xoiBig },
  { id: 'xoi_dine', icon: '🪑', name: 'Quán xôi đông khách', desc: 'Phục vụ 500 suất ăn tại tiệm xôi', reward: 1000000, done: (c) => (c.xoiDine ?? 0) >= 500, goal: (c) => ({ cur: c.xoiDine ?? 0, goal: 500 }) },
];

// ───────────────────────── Thanh tra thị trường ─────────────────────────

/** Thanh tra thị trường ghé từ cấp này. */
export const INSPECTION_UNLOCK = 12;
/** Cứ chừng này ngày có một lượt thanh tra (sau khi đóng cửa). */
export const INSPECTION_EVERY = 14;
export const INSPECTION_REWARD = 250000;
export const INSPECTION_FINE = 120000;
/** Số món cận hạn (≤1 ngày) tối đa được coi là "quản lý hàng hoá tốt". */
export const INSPECTION_NEAR_MAX = 5;

/** Số liệu thanh tra xem xét (đều lấy từ chỉ số sẵn có của ngày). */
export interface InspectionCtx {
  /** Độ bẩn sàn 0–100. */
  dirt: number;
  /** Số món cận hạn còn bày trên kệ. */
  nearExpiryOnShelves: number;
  /** Giá bán trung bình so với giá gợi ý. */
  priceIndex: number;
  /** Sao trung bình của các đánh giá gần nhất. */
  rating: number;
  /** Tủ mát/tủ đông hỏng mà vẫn còn hàng (đứt chuỗi lạnh: tính vào tiêu chí quản lý hàng hoá). */
  coldBroken?: number;
}

export interface InspectionResult {
  pass: boolean;
  /** Số tiêu chí đạt (0–4). */
  score: number;
  /** Nhận xét từng tiêu chí (tiêu đề để ghép thông báo). */
  notes: string[];
}

/** Chấm điểm thanh tra: sạch – quản lý hàng hoá – giá hợp lý – phục vụ tốt; đạt 3/4 thì qua. */
export function inspectionResult(ctx: InspectionCtx): InspectionResult {
  const checks = [
    { ok: ctx.dirt <= 30, ok_: 'Sàn sạch sẽ', bad: 'Sàn bẩn, lau nhà đi' },
    ctx.coldBroken
      ? { ok: false, ok_: '', bad: `${ctx.coldBroken} tủ lạnh hỏng vẫn bày hàng mát (đứt chuỗi lạnh)` }
      : { ok: ctx.nearExpiryOnShelves <= INSPECTION_NEAR_MAX, ok_: 'Quản lý hàng cận hạn tốt', bad: `${ctx.nearExpiryOnShelves} món cận hạn còn bày la liệt trên kệ` },
    { ok: ctx.priceIndex <= 1.2, ok_: 'Giá niêm yết hợp lý', bad: 'Giá bán chung cao hơn giá gợi ý quá 20%' },
    { ok: ctx.rating >= 4, ok_: 'Khách đánh giá tốt', bad: `Đánh giá trung bình mới ${ctx.rating.toFixed(1)}★` },
  ];
  const score = checks.filter((c) => c.ok).length;
  return { pass: score >= 3, score, notes: checks.map((c) => (c.ok ? `✅ ${c.ok_}` : `❌ ${c.bad}`)) };
}
