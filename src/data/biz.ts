/**
 * Các hệ thống kinh doanh & đời sống thêm vào sau: tiệm đối thủ, thẻ tích điểm, quảng cáo, vay vốn, hụi,
 * báo cáo tuần, thú cưng, thành tựu, sự kiện bất ngờ, chuyện khách quen, nhà riêng, bữa sáng, xe cộ.
 * File này chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/biz.ts`.
 */

// ───────────────────────── Tiệm đối thủ ─────────────────────────

export interface Rival {
  name: string;
  /** 0–100: càng mạnh càng hút khách của mình; về 0 thì đóng cửa. */
  strength: number;
  openedDay: number;
  /** Đang chạy đợt giảm giá tới hết ngày này. */
  saleUntil?: number;
}

export const RIVAL_UNLOCK = 8;
export const RIVAL_NAMES = ['Tạp hóa Phát Đạt', 'Mini mart Hưng Thịnh', 'Tiệm Cô Ba Mới', 'Cửa hàng 24h Ánh Dương'];
export const RIVAL_START = 60;
export const RIVAL_BEAT_REWARD = 800000;
export const RIVAL_BEAT_XP = 400;
/** Sau khi thắng, nghỉ chừng này ngày rồi mới có tiệm mới mở (mạnh hơn). */
export const RIVAL_COOLDOWN = 20;

/** Phần khách bị đối thủ hút đi: tối đa 25% khi đối thủ mạnh nhất, gấp đôi khi họ đang giảm giá. */
export function rivalTrafficFactor(r: Rival | null, day: number) {
  if (!r) return 1;
  const sale = r.saleUntil !== undefined && r.saleUntil >= day ? 2 : 1;
  return Math.max(0.5, 1 - (r.strength / 100) * 0.25 * sale);
}

/** Cuối ngày: tiệm mình phục vụ tốt (sao cao, ít lỡ bán, giá không đắt) thì đối thủ yếu dần. */
export function rivalNightly(r: Rival, ctx: { rating: number; missRate: number; priceIndex: number; adsActive: boolean }) {
  let delta = 0;
  delta -= (ctx.rating - 3.5) * 4; // 5★ → −6, 3★ → +2
  delta += ctx.missRate * 20; // lỡ 30% lượt bán → +6
  delta += (ctx.priceIndex - 1) * 30; // đắt hơn giá gợi ý 10% → +3
  if (ctx.adsActive) delta -= 2;
  delta += 1; // đối thủ cũng tự quảng cáo mỗi ngày
  return Math.max(0, Math.min(100, r.strength + delta));
}

// ───────────────────────── Thẻ tích điểm ─────────────────────────

export interface Loyalty {
  on: boolean;
  /** Mua đủ chừng này lần thì món rẻ nhất trong giỏ được tặng. */
  stamps: 5 | 10 | 15;
  /** Số lần đã tặng và tổng tiền đã tặng. */
  redeemed: number;
  given: number;
}

export const LOYALTY_UNLOCK = 5;
export const LOYALTY_OPTIONS = [5, 10, 15] as const;
/** Tích càng ít tem càng hấp dẫn: +12% / +6% / +4% khách ghé. */
export const loyaltyTraffic = (l: Loyalty) => (l.on ? 1 + 0.6 / l.stamps : 1);
/** Mỗi lần tính tiền, xác suất khách vừa đủ tem để đổi quà. */
export const loyaltyRedeemChance = (l: Loyalty) => (l.on ? 1 / l.stamps : 0);

// ───────────────────────── Quảng cáo ─────────────────────────

export interface AdDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  price: number;
  days: number;
  traffic: number;
  /** Nghề được nhắm tới: khách thuộc nghề này hay ghé hơn (nhân trọng số). */
  targets?: string[];
  unlock: number;
}

export const ADS: AdDef[] = [
  { id: 'loa', icon: '📢', name: 'Loa phát thanh', desc: 'Xe loa chạy quanh hẻm hôm nay.', price: 60000, days: 1, traffic: 1.2, unlock: 3 },
  { id: 'to_roi', icon: '📄', name: 'Phát tờ rơi', desc: 'Nhét tờ rơi vào từng nhà, đông khách 3 ngày.', price: 150000, days: 3, traffic: 1.15, unlock: 4 },
  { id: 'bang_ron', icon: '🎌', name: 'Treo băng rôn', desc: 'Băng rôn trước tiệm cả tuần.', price: 400000, days: 7, traffic: 1.1, unlock: 8 },
  { id: 'cong_truong', icon: '👷', name: 'Tờ rơi công trường', desc: 'Dán ở công trường, công nhân và thợ ghé nhiều.', price: 120000, days: 3, traffic: 1.05, targets: ['construction', 'electrician', 'mechanic'], unlock: 6 },
  { id: 'truong_hoc', icon: '🎒', name: 'Tờ rơi cổng trường', desc: 'Học sinh, sinh viên, phụ huynh ghé nhiều.', price: 120000, days: 3, traffic: 1.05, targets: ['student_highschool', 'student_college', 'mom', 'teacher'], unlock: 6 },
  { id: 'benh_vien', icon: '🏥', name: 'Tờ rơi bệnh viện', desc: 'Y tá, bác sĩ ca đêm ghé mua đồ.', price: 120000, days: 3, traffic: 1.05, targets: ['nurse', 'doctor', 'retired_doctor'], unlock: 10 },
];

export interface ActiveAd { id: string; untilDay: number }

export const adById = (id: string) => ADS.find((a) => a.id === id);
export const activeAds = (ads: ActiveAd[], day: number) => ads.filter((a) => a.untilDay >= day);
export const adsTraffic = (ads: ActiveAd[], day: number) =>
  activeAds(ads, day).reduce((n, a) => n * (adById(a.id)?.traffic ?? 1), 1);
export const adTargets = (ads: ActiveAd[], day: number) =>
  activeAds(ads, day).flatMap((a) => adById(a.id)?.targets ?? []);

// ───────────────────────── Vay vốn & hụi ─────────────────────────

export interface Loan { principal: number; takenDay: number; dueDay: number }
export const LOAN_UNLOCK = 5;
/** Lãi mỗi ngày trên tiền gốc còn nợ. */
export const LOAN_DAILY_RATE = 0.008;
export const LOAN_DAYS = 30;
export const loanOptions = (level: number) => [1000000, 3000000, 10000000].filter((_, i) => level >= [5, 15, 30][i]);

export interface Hui {
  /** Tiền góp mỗi ngày và số "chân" (người chơi, mỗi người hốt một lần). */
  daily: number;
  members: number;
  startDay: number;
  /** Ngày mình được hốt hụi (trong vòng). */
  turnDay: number;
  received: boolean;
  /** Số ngày đã góp. */
  paidDays: number;
}
export const HUI_UNLOCK = 7;
export const HUI_OPTIONS = [{ daily: 30000, members: 10 }, { daily: 100000, members: 10 }];
/** Xác suất mỗi ngày chủ hụi ôm tiền bỏ trốn (vỡ hụi). */
export const HUI_COLLAPSE = 0.006;

// ───────────────────────── Báo cáo tuần ─────────────────────────

export interface WeekTally {
  startDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  items: Record<string, { qty: number; gross: number }>;
  /** Mục tiêu doanh thu tuần này (null = tuần đầu, chưa đặt). */
  goal: number | null;
}

export interface WeekReport {
  week: number;
  endDay: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  best?: string;
  worst?: string;
  goal: number | null;
  goalMet: boolean;
  reward: number;
  nextGoal: number;
}

export const WEEK_DAYS = 7;
export const emptyWeek = (startDay: number, goal: number | null = null): WeekTally => ({
  startDay, revenue: 0, profit: 0, customers: 0, unhappy: 0, items: {}, goal,
});

export function closeWeek(t: WeekTally, endDay: number): WeekReport {
  const lines = Object.entries(t.items);
  const best = [...lines].sort((a, b) => b[1].gross - a[1].gross)[0]?.[0];
  const worst = lines.filter(([, l]) => l.qty > 0).sort((a, b) => a[1].gross / a[1].qty - b[1].gross / b[1].qty)[0]?.[0];
  const goalMet = t.goal !== null && t.revenue >= t.goal;
  return {
    week: Math.ceil(endDay / WEEK_DAYS), endDay, revenue: t.revenue, profit: t.profit, customers: t.customers, unhappy: t.unhappy,
    best, worst: worst !== best ? worst : undefined, goal: t.goal, goalMet,
    reward: goalMet ? Math.round((t.goal! * 0.05) / 1000) * 1000 : 0,
    nextGoal: Math.round((Math.max(t.revenue, t.goal ?? 0) * 1.1) / 10000) * 10000,
  };
}

// ───────────────────────── Thú cưng ─────────────────────────

export type PetKind = 'cat' | 'dog';
export interface PetDef { kind: PetKind; icon: string; name: string; price: number; unlock: number; food: string; desc: string }
export const PETS: PetDef[] = [
  { kind: 'cat', icon: '🐱', name: 'Mèo Mướp', price: 300000, unlock: 5, food: 'x_thuc_an_meo', desc: 'Nằm quầy bắt chuột: hàng hỏng chậm hơn 20%. Trẻ con thích ghé vuốt mèo.' },
  { kind: 'dog', icon: '🐶', name: 'Chó Vàng', price: 500000, unlock: 12, food: 'x_thuc_an_cho', desc: 'Giữ cửa: kẻ trộm ít dám vào hơn một nửa, dễ bị bắt hơn.' },
];
export interface PetState { fedDay: number; mood: number }
export const petDef = (k: PetKind) => PETS.find((p) => p.kind === k)!;
/** Thú được cho ăn hôm qua hoặc hôm nay thì mới có tác dụng. */
export const petActive = (p: PetState | undefined, day: number) => !!p && day - p.fedDay <= 1;

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
}
export interface Achievement { id: string; icon: string; name: string; desc: string; reward: number; done: (c: AchievementCtx) => boolean }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_100', icon: '🛒', name: 'Mối đầu tiên', desc: 'Bán 100 món', reward: 20000, done: (c) => c.totals.itemsSold >= 100 },
  { id: 'items_1000', icon: '📦', name: 'Nghìn món', desc: 'Bán 1.000 món', reward: 100000, done: (c) => c.totals.itemsSold >= 1000 },
  { id: 'items_10000', icon: '🏭', name: 'Vạn món', desc: 'Bán 10.000 món', reward: 600000, done: (c) => c.totals.itemsSold >= 10000 },
  { id: 'rev_10m', icon: '💰', name: 'Chục triệu', desc: 'Tổng doanh thu 10 triệu', reward: 200000, done: (c) => c.totals.revenue >= 10000000 },
  { id: 'rev_100m', icon: '🏦', name: 'Trăm triệu', desc: 'Tổng doanh thu 100 triệu', reward: 1500000, done: (c) => c.totals.revenue >= 100000000 },
  { id: 'cust_1000', icon: '👥', name: 'Cả xóm đều biết', desc: 'Đón 1.000 lượt khách', reward: 150000, done: (c) => c.totals.customers >= 1000 },
  { id: 'friends_5', icon: '💛', name: 'Bạn của cả hẻm', desc: '5 khách quen thân từ 40 💛', reward: 200000, done: (c) => c.closeFriends >= 5 },
  { id: 'orders_10', icon: '🎉', name: 'Lo tiệc giỏi', desc: 'Giao 10 đơn tiệc', reward: 150000, done: (c) => c.ordersDone >= 10 },
  { id: 'phone_20', icon: '📞', name: 'Alo là có', desc: 'Giao 20 đơn gọi điện', reward: 150000, done: (c) => c.phoneOrdersDone >= 20 },
  { id: 'rival', icon: '⚔️', name: 'Đứng vững đầu hẻm', desc: 'Khiến một tiệm đối thủ đóng cửa', reward: 300000, done: (c) => c.rivalsBeaten >= 1 },
  { id: 'perfect', icon: '🌟', name: 'Ngày hoàn hảo', desc: 'Một ngày từ 20 khách, không ai không hài lòng', reward: 100000, done: (c) => c.perfectDays >= 1 },
  { id: 'pets', icon: '🐾', name: 'Tiệm có bé cưng', desc: 'Nuôi cả mèo và chó', reward: 100000, done: (c) => c.petCount >= 2 },
  { id: 'home', icon: '🏡', name: 'Tổ ấm', desc: 'Sắm đủ 4 món cho nhà riêng', reward: 100000, done: (c) => c.homeDecor >= 4 },
  { id: 'moto', icon: '🏍️', name: 'Có xe máy', desc: 'Mua xe máy', reward: 50000, done: (c) => c.vehicle === 'moto' },
  { id: 'level_20', icon: '⭐', name: 'Chủ tiệm lành nghề', desc: 'Đạt cấp 20', reward: 200000, done: (c) => c.level >= 20 },
  { id: 'level_50', icon: '👑', name: 'Ông trùm siêu thị', desc: 'Đạt cấp 50', reward: 2000000, done: (c) => c.level >= 50 },
];

// ───────────────────────── Sự kiện bất ngờ ─────────────────────────

export interface EventChoice { label: string; result: string; money?: number; xp?: number; minutes?: number; rating?: number; friendship?: { id: string; delta: number } }
export interface SurpriseDef { id: string; icon: string; title: string; text: string; unlock: number; choices: EventChoice[] }

export const SURPRISES: SurpriseDef[] = [
  {
    id: 'hoi_duong', icon: '🧭', title: 'Khách hỏi đường', unlock: 1,
    text: 'Một cô lạ mặt hỏi đường tới bệnh viện quận.',
    choices: [
      { label: 'Chỉ đường tận tình', result: 'Cô cảm ơn rối rít, còn mua chai nước.', xp: 10, money: 6000, minutes: 5 },
      { label: 'Đang bận, xin lỗi', result: 'Cô đi hỏi nhà khác.' },
    ],
  },
  {
    id: 've_chai', icon: '♻️', title: 'Người mua ve chai', unlock: 2,
    text: 'Chú ve chai hỏi mua đống thùng carton sau kho.',
    choices: [
      { label: 'Bán thùng carton', result: 'Kho gọn gàng hơn, có thêm ít tiền.', money: 25000, minutes: 10 },
      { label: 'Để dành đựng hàng', result: 'Chú đạp xe đi tiếp.' },
    ],
  },
  {
    id: 'xe_do', icon: '🚚', title: 'Xe tải đổ hàng trước cửa', unlock: 4,
    text: 'Xe tải chở nước ngọt va ổ gà, thùng rơi đầy đường trước tiệm.',
    choices: [
      { label: 'Ra phụ nhặt (mất 20 phút)', result: 'Tài xế cảm ơn, tặng một ít tiền cà phê. Hàng xóm khen tiệm tốt bụng.', money: 50000, minutes: 20, rating: 5 },
      { label: 'Mặc kệ, lo bán hàng', result: 'Đường kẹt một lúc, vài khách ngại ghé.' },
    ],
  },
  {
    id: 'chuot', icon: '🐭', title: 'Có chuột trong kho', unlock: 3,
    text: 'Nghe sột soạt trong kho, hình như có chuột gặm bao bánh.',
    choices: [
      { label: 'Mua bẫy chuột (40.000đ)', result: 'Bắt được con chuột, kho yên ổn.', money: -40000 },
      { label: 'Kệ nó', result: 'Mất vài gói bánh, nên nuôi mèo đi!', money: -20000 },
    ],
  },
  {
    id: 'tu_thien', icon: '🙏', title: 'Quyên góp từ thiện', unlock: 6,
    text: 'Tổ dân phố đi quyên góp cho bà con vùng lũ.',
    choices: [
      { label: 'Góp 100.000đ', result: 'Tên tiệm được đọc trên loa phường, cả xóm quý.', money: -100000, rating: 5, xp: 30 },
      { label: 'Góp ít hàng (20.000đ)', result: 'Bà con cảm ơn.', money: -20000, xp: 10 },
      { label: 'Từ chối', result: 'Bác tổ trưởng hơi buồn.' },
    ],
  },
  {
    id: 'kiem_tra', icon: '📋', title: 'Phường kiểm tra vệ sinh', unlock: 9,
    text: 'Cán bộ phường ghé kiểm tra vệ sinh an toàn thực phẩm.',
    choices: [
      { label: 'Đưa đi xem kho, giải thích kỹ', result: 'Đạt chuẩn, được khen trước xóm.', xp: 40, minutes: 15, rating: 5 },
      { label: 'Xin hẹn hôm khác', result: 'Bị nhắc nhở, nộp phạt hành chính nhỏ.', money: -80000 },
    ],
  },
  {
    id: 'mat_dien', icon: '🔌', title: 'Mất điện bất chợt', unlock: 7,
    text: 'Cúp điện cả khu, tủ mát tắt. Đồ lạnh khó giữ lâu.',
    choices: [
      { label: 'Chạy máy phát (60.000đ)', result: 'Tủ mát vẫn chạy, hàng an toàn.', money: -60000 },
      { label: 'Giảm giá bán gấp đồ lạnh', result: 'Bán lỗ một chút nhưng khỏi bỏ hàng.', money: -30000, xp: 10 },
    ],
  },
  {
    id: 'livestream', icon: '📱', title: 'Tiktoker xin quay clip', unlock: 10,
    text: 'Một bạn trẻ muốn quay clip "tiệm tạp hóa hoài niệm" của bạn.',
    choices: [
      { label: 'Đồng ý, tặng ly trà đá', result: 'Clip nổi, khách lạ kéo tới!', money: -5000, xp: 50, rating: 5 },
      { label: 'Ngại lên hình', result: 'Bạn ấy đi quay tiệm khác.' },
    ],
  },
];

export const SURPRISE_CHANCE = 0.45;
export interface ActiveSurprise { id: string; expiresAt: number }

// ───────────────────────── Chuyện khách quen theo chương ─────────────────────────

export interface StoryChapter { at: number; title: string; text: string; reward?: { money?: number; xp?: number } }

/** Mỗi khách quen 3 chương, mở khi thân thiết đạt mốc và khách ghé tiệm. */
export const STORIES: Record<string, StoryChapter[]> = {
  ba_nam: [
    { at: 10, title: 'Gánh xôi đầu hẻm', text: 'Bà Năm kể đã bán xôi ở đầu hẻm 30 năm, nuôi ba đứa con ăn học.', reward: { xp: 20 } },
    { at: 30, title: 'Bà Năm bị cảm', text: 'Mấy hôm nay bà ho nhiều. Bà dặn: "Mai con mang giùm bà hộp sữa nghen." Đơn gọi điện của bà được thêm thân thiết.', reward: { xp: 40 } },
    { at: 60, title: 'Mâm xôi cảm ơn', text: 'Khỏi bệnh, bà mang tặng tiệm một mâm xôi gấc: "Tiệm con tốt bụng quá."', reward: { money: 100000, xp: 80 } },
  ],
  chu_ba: [
    { at: 10, title: 'Chiếc Dream cũ', text: 'Chú Ba chạy xe ôm bằng chiếc Dream đời 95, chú bảo "xe già mà bền".', reward: { xp: 20 } },
    { at: 30, title: 'Xe hư giữa đường', text: 'Xe chú chết máy, chú ngồi uống nước ở tiệm chờ thợ, tâm sự chuyện con gái sắp cưới.', reward: { xp: 40 } },
    { at: 60, title: 'Thiệp cưới', text: 'Chú Ba gửi thiệp cưới con gái, mời cả tiệm. Chú rủ thêm anh em xe ôm ghé mua đồ.', reward: { money: 80000, xp: 80 } },
  ],
  be_na: [
    { at: 10, title: 'Kẹo mút dâu', text: 'Bé Na kể bé để dành tiền ăn sáng mua kẹo mút dâu.', reward: { xp: 20 } },
    { at: 30, title: 'Mùa thi', text: 'Bé Na sắp thi vào lớp 10, ghé mua tập vở và hỏi bài.', reward: { xp: 40 } },
    { at: 60, title: 'Đậu trường chuyên!', text: 'Bé Na chạy vào khoe đậu trường chuyên, má Na đặt cả thùng bánh mời xóm.', reward: { money: 120000, xp: 80 } },
  ],
  chi_lan: [
    { at: 10, title: 'Dân văn phòng', text: 'Chị Lan làm kế toán, sáng nào cũng ghé mua cà phê lon.', reward: { xp: 20 } },
    { at: 30, title: 'Bị sa thải', text: 'Công ty chị cắt giảm nhân sự. Chị định mở tiệm bánh online, hỏi tiệm có bán sỉ không.', reward: { xp: 40 } },
    { at: 60, title: 'Tiệm bánh của chị Lan', text: 'Tiệm bánh online của chị Lan đắt hàng, chị nhập bột sữa ở tiệm mình và giới thiệu bạn bè.', reward: { money: 150000, xp: 80 } },
  ],
  anh_tuan: [
    { at: 10, title: 'Cú đêm', text: 'Anh Tuấn làm lập trình, tối nào cũng ghé mua mì với nước tăng lực.', reward: { xp: 20 } },
    { at: 30, title: 'Dự án khởi nghiệp', text: 'Anh đang làm app gọi đồ tạp hóa, hỏi tiệm có muốn thử không.', reward: { xp: 40 } },
    { at: 60, title: 'App chạy rồi!', text: 'App của anh Tuấn ra mắt, tiệm là đối tác đầu tiên. Anh tặng tiền thưởng cho đối tác sớm.', reward: { money: 200000, xp: 100 } },
  ],
  bac_tam: [
    { at: 10, title: 'Tổ trưởng tổ dân phố', text: 'Bác Tám lo việc chung cả hẻm, ghé tiệm là hỏi chuyện xóm.', reward: { xp: 20 } },
    { at: 30, title: 'Đèn hẻm hư', text: 'Bác than đèn đường hư, tối khách ngại đi. Bác vận động cả xóm góp tiền sửa.', reward: { xp: 40 } },
    { at: 60, title: 'Hẻm sáng đèn', text: 'Đèn hẻm sửa xong, bác Tám khen tiệm đóng góp nhiều nhất trước cuộc họp tổ.', reward: { money: 100000, xp: 80 } },
  ],
};

// ───────────────────────── Nhà riêng, bữa sáng, xe cộ ─────────────────────────

export interface HomeItem { id: string; icon: string; name: string; price: number; unlock: number; rest: number }
/** Mỗi món làm giấc ngủ ngon hơn: sáng hôm sau đi nhanh hơn `rest` (cộng dồn). */
export const HOME_ITEMS: HomeItem[] = [
  { id: 'den_ngu', icon: '💡', name: 'Đèn ngủ', price: 80000, unlock: 2, rest: 0.03 },
  { id: 'quat', icon: '🌀', name: 'Quạt đứng', price: 150000, unlock: 3, rest: 0.04 },
  { id: 'tu_quan_ao', icon: '🚪', name: 'Tủ quần áo', price: 300000, unlock: 5, rest: 0.03 },
  { id: 'tivi', icon: '📺', name: 'Ti vi', price: 600000, unlock: 8, rest: 0.04 },
  { id: 'may_lanh', icon: '❄️', name: 'Máy lạnh', price: 1500000, unlock: 15, rest: 0.06 },
];
export const homeRest = (owned: string[]) => owned.reduce((n, id) => n + (HOME_ITEMS.find((h) => h.id === id)?.rest ?? 0), 0);

export const BREAKFAST = { price: 20000, speed: 0.1, lateMinutes: 60 };

export type Vehicle = 'none' | 'bike' | 'moto';
export const VEHICLES: { id: Exclude<Vehicle, 'none'>; icon: string; name: string; price: number; unlock: number; speed: number; travel: number }[] = [
  { id: 'bike', icon: '🚲', name: 'Xe đạp', price: 400000, unlock: 3, speed: 0.25, travel: 0.7 },
  { id: 'moto', icon: '🏍️', name: 'Xe máy', price: 4000000, unlock: 12, speed: 0.6, travel: 0.4 },
];
export const vehicleDef = (v: Vehicle) => VEHICLES.find((x) => x.id === v);

// ───────────────────────── Trạng thái gộp ─────────────────────────

export interface BizState {
  rival: Rival | null;
  rivalsBeaten: number;
  /** Ngày sớm nhất có thể mở đối thủ mới. */
  rivalNextDay: number;
  ads: ActiveAd[];
  loyalty: Loyalty;
  loan: Loan | null;
  hui: Hui | null;
  week: WeekTally;
  lastWeek: WeekReport | null;
  pets: Partial<Record<PetKind, PetState>>;
  achievements: string[];
  perfectDays: number;
  surprise: ActiveSurprise | null;
  surpriseDay: number;
  /** Chương truyện đã xem của từng khách quen. */
  story: Record<string, number>;
  /** Chương đang chờ hiện (khách quen vừa ghé). */
  storyPending: { regular: string; chapter: number } | null;
  home: string[];
  vehicle: Vehicle;
  breakfastDay: number;
  /** Chương cốt truyện đã xem, và chương đang chờ hiện hội thoại. */
  chapters: string[];
  chapterPending: string | null;
  /** Đã tắt hướng dẫn ngày đầu. */
  tutorialOff: boolean;
}

export const newBiz = (): BizState => ({
  rival: null, rivalsBeaten: 0, rivalNextDay: 0, ads: [],
  loyalty: { on: false, stamps: 10, redeemed: 0, given: 0 },
  loan: null, hui: null, week: emptyWeek(1), lastWeek: null,
  pets: {}, achievements: [], perfectDays: 0,
  surprise: null, surpriseDay: 0, story: {}, storyPending: null,
  home: [], vehicle: 'none', breakfastDay: 0,
  chapters: [], chapterPending: null, tutorialOff: false,
});

/** Hệ số đi bộ của chủ tiệm hôm nay: nhà đẹp ngủ ngon, ăn sáng, xe (chỉ khi ở ngoài đường). */
export function playerPace(b: BizState, day: number, outdoors: boolean) {
  let pace = 1 + homeRest(b.home) + (b.breakfastDay === day ? BREAKFAST.speed : 0);
  if (outdoors) pace += vehicleDef(b.vehicle)?.speed ?? 0;
  return pace;
}

/** Lượng khách ghé chung: đối thủ, quảng cáo, thẻ tích điểm. */
export const bizTraffic = (b: BizState, day: number) => rivalTrafficFactor(b.rival, day) * adsTraffic(b.ads, day) * loyaltyTraffic(b.loyalty);
