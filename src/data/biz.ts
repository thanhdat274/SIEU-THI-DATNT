/**
 * Các hệ thống kinh doanh & đời sống thêm vào sau: tiệm đối thủ, thẻ tích điểm, quảng cáo, vay vốn, hụi,
 * báo cáo tuần, thú cưng, thành tựu, sự kiện bất ngờ, chuyện khách quen, nhà riêng, bữa sáng, xe cộ.
 * File này chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/biz.ts`.
 */
import { formatMoney } from './products';
import { newQuanNuoc, type QuanNuocState } from './quanNuoc';
import { newTiemXoi, type TiemXoiState } from './tiemXoi';
import type { HiepLucState } from './hiepLuc';
import type { StanceId, StanceState } from './stance';
import type { BrandState } from './brand';
import type { HaulerId } from './routes';
import type { TripState, RouteStock } from './trip';
import { monthOf } from './calendar';
import { emptyYear } from './yearReport';
import { xpToNext } from './levels';

import { RIVAL_BUY_TRAFFIC, rivalTrafficFactor, type Rival, type RivalPersonality, type RivalTrendDay } from './rivals';
export * from './rivals';
import { emptyMonth, emptyWeek, STREAK_XP_FROM, STREAK_XP_RATE_MONTH, type MonthReport, type MonthTally, type WeekReport, type WeekTally } from './bizWeeks';
export * from './bizWeeks';
import type { PetKind, PetState } from './bizAchievements';
export * from './bizAchievements';

import { COUNTER_AD_TRAFFIC, counterActive, loyaltyTraffic, adsTraffic, type ActiveAd, type Counter, type CounterTactic, type Hui, type Loan, type Loyalty } from './bizFinance';
export * from './bizFinance';
// ───────────────────────── Sự kiện bất ngờ ─────────────────────────

export interface EventChoice {
  label: string;
  result: string;
  money?: number;
  xp?: number;
  minutes?: number;
  rating?: number;
  friendship?: { id: string; delta: number };
  /** GĐ164: lựa chọn "ấm" — được đếm vào thưởng cuối của arc (arcGoodCount). */
  good?: boolean;
  /** GĐ164: cần hàng trong KHO đủ số lượng mới chọn được — UI xám + core chặn khi thiếu. */
  needStock?: { productId: string; qty: number };
}
export interface SurpriseDef { id: string; icon: string; title: string; text: string; unlock: number; choices: EventChoice[] }

/**
 * Sự kiện bất ngờ một-phát (pool của `maybeSurprise`). GĐ164: 4 def cũ (mua_roi,
 * bong_da_kinh, mua_dai, livestream) chuyển thành arc 2–3 ngày ở `data/surpriseArcs.ts`
 * — pool trúng id-có-arc thì core mở arc thay vì phát def một-phát.
 * GĐ165: bổ sung 5 def một-phát cấp thấp (unlock 1–5) — pool ngày 1–5 dày lại sau khi arc A–D thay 4 def.
 */
/** Sự kiện bất ngờ: nội dung ở stories.ts (nạp lười); rỗng tới khi loadStories() xong. */
export let SURPRISES: SurpriseDef[] = [];

export const SURPRISE_CHANCE = 0.45;
export interface ActiveSurprise { id: string; expiresAt: number }

// ───────────────────────── Chuyện khách quen theo chương ─────────────────────────

export interface StoryChapter { at: number; title: string; text: string; reward?: { money?: number; xp?: number } }

/** Mỗi khách quen 3 chương (nội dung ở stories.ts, nạp lười để gói tải ban đầu nhẹ hơn). Rỗng tới khi loadStories() xong — mọi chỗ đọc đã chịu được `undefined`. */
export let STORIES: Record<string, StoryChapter[]> = {};
export const loadStories = () => Promise.all([import('./stories'), import('./surpriseArcsData'), import('./surpriseArcs')])
  .then(([m, d, a]) => { STORIES = m.STORIES; SURPRISES = m.SURPRISES; a.setSurpriseArcs(d.SURPRISE_ARCS); });

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
/** Phút trong ngày (tính từ 0h hôm nay) mà quá đó chưa ngủ thì ngất: 02:00 hôm sau, +1h nếu đã ăn sáng. */
export const faintMinutes = (fedBreakfast: boolean): number => 26 * 60 + (fedBreakfast ? BREAKFAST.lateMinutes : 0);

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
  /** Đợt phản công đối thủ đang chạy (hiệu lực trong ngày); null = không có. */
  counter: Counter | null;
  /** Ngày gần nhất có đợt phản công; đối đầu nhiều ngày liền thì đòn nặng dần. */
  counterLastDay?: number;
  /** Chuỗi ngày liên tiếp có đợt phản công (1 = ngày đầu tiên). */
  counterStreak?: number;
  /** Ngày sớm nhất được dùng lại từng chiến thuật phản công (thời gian hồi). */
  counterReady: Partial<Record<CounterTactic, number>>;
  /** Ngày gần nhất đã đòi lại một khách quen bị rival lôi kéo (mỗi ngày một người). Thiếu ở save cũ. */
  rescueDay?: number;
  ads: ActiveAd[];
  loyalty: Loyalty;
  loan: Loan | null;
  hui: Hui | null;
  week: WeekTally;
  lastWeek: WeekReport | null;
  /** Số tuần liên tiếp hoàn thành thử thách tuần (trật một tuần thì về 0). */
  weekStreak: number;
  /** Sổ tích lũy tháng vận hành + báo cáo tháng trước + chuỗi tháng hoàn thành thử thách. */
  month: MonthTally;
  lastMonth: MonthReport | null;
  monthStreak: number;
  /** Sổ tích lũy năm vận hành + báo cáo năm trước (GĐ82 — nhịp năm, nối 4 mùa). */
  year: import('./yearReport').YearTally;
  lastYear: import('./yearReport').YearReport | null;
  /** Sổ Mùa (GĐ83): sao mọi mùa tích lũy qua TẤT CẢ năm + những mốc tổng sao đã nhận thưởng. */
  seasonAlmanac?: Partial<Record<'spring' | 'summer' | 'autumn' | 'winter', number>>;
  almanacClaimed?: number[];
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
  /** Số đối thủ bị đánh bại nhờ đợt phản công chủ động (đếm cho thành tựu). */
  counterKills: number;
  /** Rival vừa đóng cửa, chào bán mặt bằng: mua lại thành chi nhánh; hết hạn thì người khác thuê mất. */
  rivalForSale?: { name: string; price: number; until: number };
  /** Tính cách của rival vừa đóng cửa gần nhất: thế hệ rival mới rút tính cách tránh lặp lượt trước. */
  lastRivalPers?: RivalPersonality;
  /** Đã mua lại tiệm đối thủ: khách cũ của họ ghé thêm trong tới ngày này. */
  rivalBuyUntil?: number;
  /** Nhật ký sức mạnh rival từng đêm (cửa sổ lăn − RIVAL_TREND_DAYS); clear khi rival đóng cửa.
   *  Bản lưu cũ thiếu → tự bù [] qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  rivalTrend: RivalTrendDay[];
  /** Ngày gần nhất đã hiện một chương hội thoại (tối đa 1 chương/ngày, tránh dồn khi lên cấp nhanh). */
  chapterDay?: number;
  /** Đã tắt hướng dẫn ngày đầu. */
  tutorialOff: boolean;
  /** Playtest P0 T2: người chơi đã tự bày hàng lên kệ ít nhất một lần (hàng khai trương có sẵn không tính). Tùy chọn — save cũ thiếu = chưa. */
  tutShelved?: boolean;
  /** Tái sinh (NG+): số lần đã tái sinh (0 = lần chơi đầu) và hệ số doanh thu đang hưởng (0 → không đổi).
   *  `goalsClaimed` (GĐ140): mục tiêu vòng tái sinh đã nhận thưởng trong vòng hiện tại — reset mỗi vòng.
   *  `brandLegacy` (Hệ4-L9): nhãn riêng của vòng trước giữ lại CHỈ ĐỂ HIỂN THỊ trong hồ sơ tiệm (tên + uy tín
   *  cao nhất), không có hiệu ứng gameplay trong vòng mới. */
  prestige: { level: number; bonus: number; goalsClaimed?: string[]; seals?: StanceId[]; brandLegacy?: { name: string; maxRep: number } };
  /** Dịch vụ ở quầy đã mở (nạp tiền, thu hộ); thiếu ở save cũ. */
  services?: string[];
  /** Thiết bị đã mua (camera, máy POS); thiếu ở save cũ. */
  upgrades?: string[];
  /** Hệ 3 (SPEC-CHIEU-SAU §3.9) — biển hiệu đang treo (định vị tiệm, cấp ≥ 60). THIẾU = chưa treo. */
  stance?: StanceState;
  /** Hệ3-L8 — biển THỨ HAI (mở khi đủ 3 ấn định vị); treo hai biển, hiệu ứng mỗi biển 60%. THIẾU = một biển. */
  stance2?: StanceState;
  /** Hệ 4 — Nhãn hàng riêng (SPEC-CHIEU-SAU §4): nhãn + dòng hàng + xưởng + đại lý + nhượng quyền.
   *  Bản lưu cũ thiếu → undefined (chưa lập nhãn, không cần SAVE_VERSION). */
  brand?: BrandState;
  /** Hệ 7 — Trò khéo tay dịp lễ (SPEC-CHIEU-RONG §7): id trò → ngày game đã nhận thưởng (1 lần/ngày lễ, R7). */
  miniPlayed?: Record<string, number>;
  /** Hệ 7 — phần thưởng SỐ LƯỢNG cho mẻ KẾ TIẾP của công thức (recipeId → số thêm); startCook/clock đọc và xoá. */
  miniBonus?: Record<string, number>;
  /** Hệ 7 — điểm trang trí cộng tạm tới hết dịp ({furniture, bonus, until} = ngày game hết hạn) — lát L4. */
  festivalFlair?: { furniture: string; bonus: number; until: number }[];
  /** Hệ 5 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5): xe chở hàng đang dùng (THIẾU = xe máy ô 42, free) và có thùng đá giữ lạnh chưa (L3 mới mua được). */
  hauler?: HaulerId;
  coolBox?: boolean;
  /** Hệ 5 — chuyến đi tỉnh ĐANG DIỄN RA (người chơi/nhân viên vắng mặt thật, SPEC §5.3). THIẾU = không có chuyến. */
  trip?: TripState;
  /** Hệ 5 (L3) — lượng hàng còn tại nguồn từng tuyến theo TUẦN (R7 cổng chống farm, SPEC §5.5). THIẾU = chưa có. */
  routeStock?: Record<string, RouteStock>;
  /** Quán nước đầu ngõ (GĐ7, bán đồ uống rút từ kho); thiếu ở save cũ — nạp bản cũ tự bù mặc định. */
  quanNuoc: QuanNuocState;
  /** Tiệm xôi (GĐ410): xưởng nấu xôi số lượng lớn đổ vào kho chung mỗi đêm. */
  tiemXoi: TiemXoiState;
  /** GĐ498: các khu bản đồ đã mở (ngoài hẻm đầu). */
  zones?: string[];
  /** GĐ501: số lô sạp hàng rong đã thuê ở Ngõ 2 (0–4). */
  sapRong?: number;
  /** GĐ507: món từng lô sạp (id SAP_KINDS); thiếu = Tổng hợp. */
  sapKinds?: string[];
  /** GĐ513: bậc từng lô sạp (0 gánh, 1 xe đẩy, 2 quầy); thiếu = gánh. */
  sapTiers?: number[];
  /** GĐ521: ngày chủ tự đứng sạp gần nhất. */
  sapHandDay?: number;
  tiemXoiLast?: { day: number; total: number; cost: number; wages: number; saved: number; /** GĐ486: suất khách ăn tại chỗ. */ dine?: number; /** GĐ1173: doanh thu bán xôi tại chỗ cho khách ngồi (khác saved — đó là tiết kiệm chi phí nấu). */ dineRevenue?: number; /** GĐ711: sự kiện hôm qua (nồi hỏng / gạo khan) — bản lưu cũ thiếu thì coi như không có. */ event?: 'cooker' | 'gao' };
  /** Kết quả ngày vừa rồi của quán nước (để UI hiển thị); chưa từng chạy thì undefined.
   *  wages = tổng lương nhân viên phải trả hôm đó, profit = revenue − wages (lời ròng thật). */
  quanNuocLast?: { day: number; revenue: number; served: number; wanted: number; wages: number; profit: number; /** GĐ703: sự kiện hôm qua (máy pha hỏng / xe nước) — bản lưu cũ thiếu thì coi như không có. */ event?: 'brewer' | 'cart' };
  /** Các mốc 'Sổ tay Tiệm' đã nhận thưởng (GĐ36): danh sách ngưỡng món đã bán. Bản lưu cũ thiếu thì coi như []. */
  discoveryClaimed?: number[];
  /** Công trình khu phố (GĐ40) — sân chơi trẻ em: mỗi ngày góp một lần cho tới khi khánh thành.
   *  Bản lưu cũ thiếu thì `applySnapshot` bù mặc định {0, 0} qua MERGE_DEEP. */
  landmark: { contributions: number; lastContributeDay: number };
  /** Nhân khẩu học khách vãng lai (GĐ62): mỗi nghề một dòng tích lũy trong ván.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  demographics: Record<string, { visits: number; revenue: number; walkouts: number }>;
  /** Các mồi "Thử ngay" mở khóa hệ mới đã xem (GĐ64): danh sách id đã hiện một lần.
   *  Bản lưu cũ thiếu → tự bù [] qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  unlockActs: string[];
  /** Tiền lời dịch vụ ở quầy tích lũy cả ván theo từng dịch vụ (GĐ66 — đo "đã hoàn vốn chưa").
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  serviceLife: Record<string, number>;
  /** Hồ sơ mối quen lâu dài (GĐ67): doanh mua + số đơn tích lũy cả ván theo từng nhà cung cấp.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  supplierRel: Record<string, { spent: number; orders: number }>;
  /** Doanh mua tháng theo từng mối (GĐ67): so với cam kết để hoàn cuối tháng, rồi reset.
   *  Bản lưu cũ thiếu → tự bù {} qua default/MERGE_DEEP (không cần SAVE_VERSION). */
  supplierRelMonth: Record<string, number>;
  /** Số hiệu phiên chợ (tháng) đã lấy lô chợ phiên đặc biệt (GĐ68).
   *  Bản lưu cũ thiếu → undefined (chưa lấy tháng nào, không cần SAVE_VERSION). */
  fairTaken?: number;
  /** Lượt khách quen đã phục vụ trong tháng này (GĐ69, Sổ thương mến): cuối tháng
   *  quy thành quà tri ân. Bản lưu cũ thiếu → 0 qua default/MERGE_DEEP. */
  triAnMonth: number;
  /** Tháng đã trả quà tri ân cuối tháng (GĐ69): tránh trả 2 lần cho cùng một tháng.
   *  Bản lưu cũ thiếu → undefined (chưa trả tháng nào, không cần SAVE_VERSION). */
  triAnPaidMonth?: number;
  /** Các cạnh khắc khẩu đã hoà giải (GĐ Hệ2-L1, SPEC-CHIEU-SAU §2.6): khóa `a|b` chuẩn hoá.
   *  Bản lưu cũ thiếu → undefined (chưa hoà giải cạnh nào, không cần SAVE_VERSION). */
  tiesMended?: string[];
  /** Các mốc "Tình làng" 25/50/75/100% đã nhận thưởng (GĐ Hệ2-L7, SPEC §2.8): mỗi mốc 1 lần/ván
   *  (tiền + mốc 100% tặng decor). Bản lưu cũ thiếu → undefined (chưa nhận mốc nào, không cần SAVE_VERSION). */
  tiesMilestones?: number[];
  /** Bộ đếm lan thân thiết trong ngày (GĐ Hệ2-L2, SPEC §2.4): mỗi người nhận tối đa ±3/ngày.
   *  `rippleDay[id] = { day, sum }` với `sum` = tổng lan đã áp hôm đó (reset khi đổi ngày).
   *  Bản lưu cũ thiếu → undefined (không cần SAVE_VERSION). */
  rippleDay?: Record<string, { day: number; sum: number }>;
  /** Lần cuối xoá nợ mới lan tới họ hàng (GĐ Hệ2-L2): chống farm "cho vay nhỏ rồi xoá liên tục",
   *  chỉ lan 1 lần/30 ngày cho mỗi con nợ. Map regularId → lastDay. Bản lưu cũ thiếu → undefined. */
  forgiveRipple?: Record<string, number>;
  /** Việc nhà trong hẻm đang mời/đã nhận (GĐ Hệ2-L3, SPEC §2.5): giỗ hằng năm mở cấp ≥ 32.
   *  Tối đa 1 việc một lúc. Bản lưu cũ thiếu → undefined (chưa có việc nào, không cần SAVE_VERSION). */
  lifeEvent?: import('./lifeEvent').LifeEventState;
  /** Các việc lớn một lần (cưới/đầy tháng/tân gia/mừng thọ) đã làm HOẶC đã từ chối (GĐ Hệ2-L4,
   *  SPEC §2.5): 1 việc/ván (R7). Giỗ hằng năm KHÔNG ghi vào đây. Bản lưu cũ thiếu → undefined. */
  lifeEventsDone?: string[];
  /** Ngày game đã nhận thưởng đón lễ (GĐ70): 1 dịp lễ 1 lần. Bản lưu cũ thiếu →
   *  undefined (chưa nhận dịp nào, không cần SAVE_VERSION). */
  prepClaimed?: number;
  /** Đối tác Hiệp lực chi nhánh×quán nước (GĐ74): state cam kết tháng (m, active, cọc). Bản lưu cũ
   *  thiếu → mặc định không đối tác (NO SAVE_VERSION, save cũ tự bù qua MERGE_DEEP). */
  hiepLuc?: HiepLucState;
  /** Doanh thu chung 2 cơ sở tích lũy trong tháng đối tác (GĐ74). */
  hiepLucMonth?: number;
  /** Số tháng liên tiếp đạt hiệp lực (GĐ74): thưởng chuỗi. */
  hiepLucStreak?: number;
  /** Sự kiện thử thách theo mùa (GĐ75): state đang theo dõi — `season` + sao đã gom + ngày mùa
   *  đã nhận thưởng (dayIndex của mùa). Bản lưu cũ thiếu → mặc định trống (NO SAVE_VERSION). */
  seasonEvt?: SeasonEventState;
  /** Nếp vận hành (GĐ79): chuỗi ngày "sạch" liên tiếp (đủ đông khách, không ai bỏ vì chờ/hết hàng). */
  cleanStreak?: number;
  /** Kỷ lục chuỗi sạch từng đạt. */
  cleanBest?: number;
  /** Mốc chuỗi cao nhất đã nhận thưởng. */
  cleanClaimed?: number;
  /** Đợt nhờ vả khách quen (GĐ80): regularId → trạng thái câu chuyện 2–4 ngày. */
  regularArcs?: Record<string, import('./regularArc').RegularArcState>;
  /** Chuyện sự kiện bất ngờ đang kể dở (GĐ164): MỘT slot duy nhất. Bản lưu cũ thiếu →
   *  undefined (chưa có arc nào, không cần SAVE_VERSION — biz nằm trong MERGE_DEEP). */
  surpriseArc?: import('./surpriseArcs').SurpriseArcState;
  /** Các arc sự kiện ĐÃ kể (kể xong lẫn khép sớm — GĐ164): không kể lại. Bản lưu cũ thiếu → []. */
  surpriseArcsTold?: string[];
  /** Hệ 8 — Biến cố dài (SPEC-CHIEU-RONG §8): đợt đang chạy. Bản lưu cũ thiếu → undefined (không đợt nào). */
  crisis?: import('./crisis').CrisisState;
  /** Các biến cố dài đã từng xảy ra trong ván (ngăn lặp lại nhiều lần cùng loại). Bản lưu cũ thiếu → []. */
  crisesSeen?: string[];
  /** Huy hiệu "vượt khó" đã nhận khi hoàn tất từng loại đợt (để hiện trong hồ sơ tiệm — lát L4). Bản lưu cũ thiếu → []. */
  crisisBadges?: string[];
  /** Tuỳ chọn "Năm yên ả" (đã tắt biến cố dài) — không nhận huy hiệu vượt khó. Bản lưu cũ thiếu → false. */
  calmYears?: boolean;
  /** Lợi đường mới (đào đường): nhân khách vĩnh viễn — đã nhận chưa (cho cả ván). Bản lưu cũ thiếu → false. */
  roadBoon?: boolean;
  /** Biến cố dài đã kết thúc gần nhất (để hiện bảng tổng kết cuối đợt) — lát L4. Bản lưu cũ thiếu → undefined. */
  lastCrisis?: { defId: string; endDay: number; loss: number; saved: number };
}

/** Sự kiện thử thách theo mùa (GĐ75). */
export interface SeasonEventState {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  /** Tổng sao gom được trong mùa (mỗi ngày hoàn mục tiêu +1). */
  stars: number;
  /** dayIndex (0–4) của mùa đã nhận thưởng — chống nhận 2 lần/ngày. */
  claimedDay?: number;
}

export const newBiz = (): BizState => ({
  rival: null, rivalsBeaten: 0, rivalNextDay: 0, rivalTrend: [], counter: null, counterReady: {}, ads: [],
  loyalty: { on: false, stamps: 10, redeemed: 0, given: 0 },
  loan: null, hui: null, week: emptyWeek(1), lastWeek: null, weekStreak: 0,
  month: emptyMonth(1, monthOf(1)), lastMonth: null, monthStreak: 0,
  year: emptyYear(1, 1), lastYear: null,
  pets: {}, achievements: [], perfectDays: 0,
  surprise: null, surpriseDay: 0, story: {}, storyPending: null,
  home: [], vehicle: 'none', breakfastDay: 0,
  chapters: [], chapterPending: null, counterKills: 0, tutorialOff: false, prestige: { level: 0, bonus: 0, goalsClaimed: [], seals: [] }, services: [], upgrades: [],
  quanNuoc: newQuanNuoc(),
  tiemXoi: newTiemXoi(),
  discoveryClaimed: [],
  landmark: { contributions: 0, lastContributeDay: 0 },
  demographics: {},
  unlockActs: [],
  serviceLife: {},
  supplierRel: {},
  supplierRelMonth: {},
  fairTaken: undefined,
  triAnMonth: 0,
  triAnPaidMonth: undefined,
  prepClaimed: undefined,
  hiepLuc: { m: 0, active: false, coc: 0 },
  hiepLucMonth: 0,
  hiepLucStreak: 0,
  seasonEvt: undefined,
  cleanStreak: 0, cleanBest: 0, cleanClaimed: 0, regularArcs: {},
  seasonAlmanac: {}, almanacClaimed: [],
  // Hệ 8 — Biến cố dài (SPEC-CHIEU-RONG §8): mặc định không đợt nào, chưa đổi gì
  crisis: undefined, crisesSeen: [], crisisBadges: [], calmYears: false, roadBoon: false, lastCrisis: undefined,
  // Hệ 7 — Trò khéo tay lễ (SPEC-CHIEU-RONG §7): chưa chơi/không thưởng, không có flair
  miniPlayed: {}, miniBonus: {}, festivalFlair: undefined,
});

/** Hệ số đi bộ của chủ tiệm hôm nay: nhà đẹp ngủ ngon, ăn sáng, xe (chỉ khi ở ngoài đường). */
export function playerPace(b: BizState, day: number, outdoors: boolean) {
  let pace = 1 + homeRest(b.home) + (b.breakfastDay === day ? BREAKFAST.speed : 0);
  if (outdoors) pace += vehicleDef(b.vehicle)?.speed ?? 0;
  return pace;
}

/** Lượng khách ghé chung: đối thủ, quảng cáo, thẻ tích điểm, đợt phản công đang chạy, khách cũ của rival đã mua lại. */
export const bizTraffic = (b: BizState, day: number) => rivalTrafficFactor(b.rival, day) * adsTraffic(b.ads, day)
  * loyaltyTraffic(b.loyalty) * (counterActive(b.counter, day, 'ad') ? COUNTER_AD_TRAFFIC : 1)
  * (b.rivalBuyUntil !== undefined && day <= b.rivalBuyUntil ? RIVAL_BUY_TRAFFIC : 1);

// ───────────────────────── Nhịp tháng vận hành ─────────────────────────
export interface MonthPace {
  pace: number;
  remainingDays: number;
  projected: number;
  onTrack: boolean;
  streakAtRisk: boolean;
  streakXp: number;
  missing: number;
}

export function monthPace(
  current: number, target: number, remainingDays: number, totalDaysInMonth: number, streak: number, level: number,
): MonthPace | null {
  if (target <= 0 || remainingDays <= 0 || totalDaysInMonth <= 0) return null;
  const elapsed = totalDaysInMonth - remainingDays;
  const projected = elapsed > 0 ? (current * totalDaysInMonth) / elapsed : current;
  const onTrack = projected >= target;
  const missing = Math.max(0, target - current);
  return {
    pace: target > 0 ? current / target : 0,
    remainingDays,
    projected,
    onTrack,
    streakAtRisk: !onTrack && streak >= 1 && current < target,
    streakXp: streak + 1 >= STREAK_XP_FROM ? Math.round(STREAK_XP_RATE_MONTH * xpToNext(level)) : 0,
    missing,
  };
}
