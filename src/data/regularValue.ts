// ───── GĐ1289 — "Khách quen nào đáng giữ nhất về TIỀN?" (giá trị giỏ + boa mỗi lần ghé) ─────
// Sau GĐ1285 (AI đang bị phụ) còn thiếu nửa kia của quyết định giữ chân: NGƯỜI quen này mỗi lần ghé
// mang về bao nhiêu? — để biết nhập hàng / giữ chân AI trước. Helper THUẦN ĐỌC: tái dựng ĐÚNG giỏ món ưa
// + boa theo các công thức sim có sẵn — `regularWants` (customers.ts:275: count = 1 + floor(rng*2) + extra_item,
// món đầu LUÔN ưa, 75% món sau vẫn là món ưa, món ưa nhân bản theo bulk_buy) và `regularCheckout`
// (regulars.ts:167-176: boa = round(hóa đơn × bonus_tip% /100)×100). Chỉ nói con số ƯỚC TÍNH (~) từ món ưa
// ĐÃ MỞ KHÓA, không bịa khách/giỏ (Luật 5 an toàn). KHÔNG import store (co-op an toàn).
import { unlockedFavorites, perkValue, nextPerk, type RegularDef, type RegularProgress, type RegularPerk } from './regulars';
import { formatMoney } from './products';

export interface RegularSpend {
  /** Khách quen đang xét. */
  regular: RegularDef;
  /** Số món ưa đang mở khóa (nền để ghé). */
  favCount: number;
  /** Số món ưa ƯỚC TÍNH mỗi lần ghé (kỳ vọng từ công thức count + 75% món ưa). */
  items: number;
  /** Giỏ ước tính món ưa (đ), theo giá bán hiện tại; không tính món khác lẻ. */
  spend: number;
  /** Boa ước tính (đ) — có khi chưa mở perk bonus_tip thì 0. */
  tip: number;
  /** Giỏ + boa (đ). */
  total: number;
}

/** Số món ưa ước tính mỗi lần ghé: món đầu luôn ưa + 75% số món còn lại (đúng regularWants GĐ sim). */
export function expectedFavoriteItems(def: RegularDef, progress: RegularProgress | undefined): number {
  const extra = perkValue(def, progress, 'extra_item'); // món thêm/lần
  const expectedCount = 1.5 + extra; // count = 1 + floor(rng*2) + extra → kỳ vọng 1.5 + extra
  return Math.round((1 + 0.75 * (expectedCount - 1)) * 10) / 10;
}

/** Giá trị trung bình mỗi lần ghé (giỏ món ưa + boa) cho một khách quen, theo giá bán hiện tại.
 *  THUẦN — `priceOf` do UI truyền (đọc store ở chỗ gọi, không import state). null khi chưa mở món ưa nào. */
export function regularSpendEstimate(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): RegularSpend | null {
  const { def, level, priceOf, progress } = opts;
  const favs = unlockedFavorites(def, level);
  if (!favs.length) return null;
  const avgPrice = favs.reduce((n, id) => n + priceOf(id), 0) / favs.length;
  const bulk = perkValue(def, progress, 'bulk_buy'); // món ưa nhân bản theo lô (1 + bulk)
  const items = expectedFavoriteItems(def, progress);
  const spend = Math.round(avgPrice * items * (1 + bulk));
  const tipRate = perkValue(def, progress, 'bonus_tip'); // tỉ lệ % hóa đơn
  const tip = tipRate > 0 ? Math.round((spend * tipRate) / 100) * 100 : 0;
  return { regular: def, favCount: favs.length, items, spend, tip, total: spend + tip };
}

/** Dòng ngắn: "giỏ ~X + boa ~Y ≈ ~Z/lần ghé" (dùng trong thẻ khách quen khi có tín hiệu giữ chân). */
export function regularValueLine(s: RegularSpend): string {
  return `${s.regular.name}: ~${formatMoney(s.spend)}/lần${s.tip > 0 ? ` + boa ~${formatMoney(s.tip)}` : ''} ≈ ~${formatMoney(s.total)} mỗi lượt ghé`;
}

// ───── GĐ1293 — "Nâng thân thiết tới mốc perk kế tiếp đáng không?" (+bao nhiêu mỗi lần ghé) ─────
// GĐ1289 đã biết khách quen này đáng bao nhiêu/lần — còn thiếu TAY QUAY của việc chăm thân thiết: mốc perk
// KẾ TIẾP (extra_item/bulk_buy/bonus_tip) tăng giỏ/boa bao nhiêu so với hiện tại? Để chủ quyết định xem có
// nên tiếp tục đối xử tốt tới mốc. THUẦN — tái dựng bằng CHÍNH regularSpendEstimate (GĐ1289) trước/sau khi
// mở perk; CHỈ quy ra tiền cho 3 hiệu ứng đổi giỏ/boa, các perk ghé/nhóm (frequent/refer/festival) không bịa
// con số (delta null). Không import store (co-op an toàn), không đổi kinh tế/save/seed.

export interface NextPerkValue {
  /** Perk kế tiếp chưa mở (MỐC thân thiết). */
  perk: RegularPerk;
  /** Còn bao nhiêu thân thiết nữa tới mốc (≥0). */
  toGo: number;
  /** Tổng giỏ+boa mỗi lần ghé nếu mở perk này; null khi perk không đổi giỏ/boa (không quy được tiền). */
  nextTotal: number | null;
  /** Mức tăng mỗi lần ghé (đ) so với hiện tại; null khi không quy được tiền. */
  delta: number | null;
}

/** Chỉ các perk làm TĂNG giỏ/boa mỗi lần ghé (quy được tiền); ghé-chung/nhóm không đổi giỏ nên bỏ. */
const MONEY_PERK_EFFECTS = new Set<string>(['extra_item', 'bulk_buy', 'bonus_tip']);

/** Mốc perk kế tiếp + giá trị tiền nó tăng thêm mỗi lần ghé (so với hiện tại). THUẦN — null khi hết perk chưa mở. */
export function nextPerkValue(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): NextPerkValue | null {
  const { def, progress } = opts;
  const next = nextPerk(def, progress);
  if (!next) return null;
  const toGo = Math.max(0, next.threshold - (progress?.friendship ?? 0));
  if (!MONEY_PERK_EFFECTS.has(next.effect)) {
    return { perk: next, toGo, nextTotal: null, delta: null };
  }
  const base = regularSpendEstimate(opts);
  const withPerk: RegularProgress = {
    friendship: Math.max(progress?.friendship ?? 0, next.threshold),
    visits: progress?.visits ?? 0,
    lastVisitDay: progress?.lastVisitDay,
    lastFriendshipDay: progress?.lastFriendshipDay,
    perks: [...(progress?.perks ?? []), next.title],
    discovered: [...(progress?.discovered ?? [])],
  };
  const sim = regularSpendEstimate({ ...opts, progress: withPerk });
  if (!base || !sim) return { perk: next, toGo, nextTotal: null, delta: null };
  return { perk: next, toGo, nextTotal: sim.total, delta: sim.total - base.total };
}

// ───── GĐ1295 — "Ai là khách vàng THẬT theo tuần?" (giỏ+boa mỗi lần ghé × tần suất ghé) ─────
// GĐ1289 chỉ nói được một khách quen đáng bao nhiêu MỖI LẦN GHÉ — còn cái quyết định giữ chân phụ thuộc CẢ
// tần suất: khách ghé 3 lần/tuần × ít tiền có thể đáng hơn khách 1 lần × nhiều tiền (hộp đen, Nguyên tắc a).
// Helper THUẦN: tái dựng ĐÚNG xác suất ghé/ngày từ `visitsToday` (regulars.ts:137: chance = 0.35 + 0.2 nếu
// có perk ghé thường xuyên) → kỳ vọng số lần ghé/tuần ≈ 7 × chance (ƯỚC TÍNH ~, bỏ ràng buộc "không ghé 2
// ngày liền" nên là cận TRÊN trung thực), nhân với `regularSpendEstimate` (GĐ1289) → đóng góp/tuần. Chỉ nói
// con số ~, không bịa khách/giỏ (Nguyên tắc c). Không import store (co-op an toàn).

export interface WeeklyContribution {
  regular: RegularDef;
  /** Giỏ + boa mỗi lần ghé (GĐ1289). */
  perVisit: number;
  /** Xác suất ghé HÔM NAY từ visitsToday (0.35, +0.2 khi có ghé thường xuyên). */
  visitChance: number;
  /** Kỳ vọng số lần ghé/tuần ≈ 7 × chance (ước ~). */
  weeklyVisits: number;
  /** Đóng góp mỗi tuần (đ) ≈ perVisit × weeklyVisits. */
  weekly: number;
}

const REGULAR_VISIT_CHANCE = 0.35; // regulars.ts visitsToday — xác suất ghé mỗi ngày
const FREQUENT_VISIT_BONUS = 0.2; // +0.2 khi có perk ghé thường xuyên (tựa frequent_visit)
const DAYS_PER_WEEK = 7;

/** Xác suất ghé HÔM NAY của khách quen (ĐÚNG visitsToday regulars.ts:137) — +0.2 khi có ghé thường xuyên. */
function regularVisitChance(def: RegularDef, progress: RegularProgress | undefined): number {
  const frequentNow = perkValue(def, progress, 'frequent_visit') > 0;
  return REGULAR_VISIT_CHANCE + (frequentNow ? FREQUENT_VISIT_BONUS : 0);
}

/** Đóng góp/tuần (giỏ+boa × tần ghé) của MỘT khách quen; null khi chưa mở món ưa (không ồn). */
export function weeklyContribution(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): WeeklyContribution | null {
  const per = regularSpendEstimate(opts);
  if (!per) return null;
  const visitChance = regularVisitChance(opts.def, opts.progress);
  const weeklyVisits = Math.round(DAYS_PER_WEEK * visitChance * 10) / 10;
  const weekly = Math.round(per.total * weeklyVisits);
  return { regular: opts.def, perVisit: per.total, visitChance, weeklyVisits, weekly };
}

/** Xếp hạng khách quen theo đóng góp/tuần, giảm dần; null khi chưa ai đủ món ưa (không ồn). */
export function weeklyTop(opts: {
  regulars: RegularDef[];
  level: number;
  priceOf: (id: string) => number;
  progressOf: (rid: string) => RegularProgress | undefined;
  topN?: number;
}): WeeklyContribution[] | null {
  const topN = opts.topN ?? 3;
  const list = opts.regulars
    .map((def) => weeklyContribution({ def, level: opts.level, priceOf: opts.priceOf, progress: opts.progressOf(def.id) }))
    .filter((c): c is WeeklyContribution => c !== null)
    .sort((a, b) => b.weekly - a.weekly)
    .slice(0, topN);
  return list.length ? list : null;
}

// ───── GĐ1298 — "perk GIỚI THIỆU BẠN BÈ đáng bao nhiêu?" (+khách lẻ/tuần × doanh thu trung bình) ─────
// GĐ1293 cố tình KHÔNG quy tiền cho refer_friend vì nó không đổi giỏ/lần ghé — nhưng nó RỦ THÊM KHÁCH LẺ vào
// tiệm (customers.ts:626: `friendsBurst += friends` rồi mỗi suất sinh ưu tiên `spawn(true)` thêm 1 khách, 127-130)
// → giá trị thật là KHÁCH + DOANH THU thêm, chứ không phải giỏ của chính khách quen. Helper THUẦN: số bạn/tần =
// `perkValue(refer_friend)`; tần ghé/ngày dùng ĐÚNG `visitsToday` (0.35 + 0.2 nếu frequent, regulars.ts:137) như
// GĐ1295 → khách lẻ thêm/tuần ≈ friends × visitChance × 7 (ƯỚC TÍNH ~); doanh thu thêm dùng ĐÚNG `avgPerVisit`
// (doanh thu trung bình/khách, GĐ1221) — chỉ nhân số có sẵn, không bịa (Nguyên tắc c). Không import store.

export interface ReferValue {
  regular: RegularDef;
  /** Số bạn rủ mỗi lần ghé (giá trị perk refer_friend: 1 hoặc 2). */
  friends: number;
  /** Xác suất ghé/ngày của khách quen này (0.35, +0.2 khi ghé thường xuyên). */
  visitChance: number;
  /** Khách lẻ được rủ thêm mỗi TUẦN (ước ~). */
  extraCustomersWeek: number;
  /** Doanh thu thêm mỗi tuần (ước ~) = extraCustomersWeek × avgPerVisit. */
  extraRevenueWeek: number;
}

/** Giá trị tuần của perk giới thiệu bạn bè (khách + tiền thêm); null khi chưa có perk hoặc avgPerVisit ≤ 0. */
export function referValue(opts: {
  def: RegularDef;
  progress?: RegularProgress;
  avgPerVisit: number;
  daysPerWeek?: number;
}): ReferValue | null {
  const friends = perkValue(opts.def, opts.progress, 'refer_friend');
  if (friends <= 0 || opts.avgPerVisit <= 0) return null;
  const visitChance = regularVisitChance(opts.def, opts.progress);
  const days = opts.daysPerWeek ?? DAYS_PER_WEEK;
  const extraCustomersWeek = Math.round(friends * visitChance * days * 10) / 10;
  const extraRevenueWeek = Math.round(extraCustomersWeek * opts.avgPerVisit);
  return { regular: opts.def, friends, visitChance, extraCustomersWeek, extraRevenueWeek };
}

// ───── GĐ1301 — "Mốc perk kế tiếp còn BAO LÂU?" (toGo thân thiết → ~lượt ghé → ~tuần, kèm delta/lần) ─────
// GĐ1293 biết mở mốc perk kế tiếp tăng bao nhiêu/lần (+delta) và còn toGo thân thiết — nhưng chủ chưa biết việc
// đó TỐN bao nhiêu LƯỢT GHÉ / bao lâu để quyết có đáng chăm tiếp (hộp đen, Nguyên tắc a). Helper THUẦN: điểm
// thân thiết/lần ghé dùng ĐÚNG `regularCheckout` (regulars.ts:161: mua món ưa +2/ngày, chưa món ưa +1) → lấy
// trường hợp chủ chăm (= +2, mua đủ món ưa) làm cận dưới số lần ghé → visitsToPerk = ceil(toGo/2); tuần ≈
// visitsToPerk / weeklyVisits (weeklyVisits từ visitChance × 7, GĐ1295); delta/lần lấy ĐÚNG GĐ1293 (null nếu
// perk không đổi giỏ/boa). ƯỚC TÍNH ~, không bịa (Nguyên tắc c). Không import store (co-op an toàn).

export interface NextPerkTimeline {
  perk: RegularPerk;
  /** Thân thiết còn thiếu tới mốc. */
  toGo: number;
  /** Điểm/lần ghé khi chủ chăm (mua đủ món ưa) — ĐÚNG regularCheckout +2. */
  pointsPerVisit: number;
  /** Số lượt ghé cần (cận dưới) để chạm mốc. */
  visitsToPerk: number;
  /** Kỳ vọng lượt ghé/tuần (~). */
  weeklyVisits: number;
  /** Ước số TUẦN tới mốc (visitsToPerk / weeklyVisits). */
  weeksToPerk: number;
  /** Mức tăng mỗi lần ghé khi mở mốc (GĐ1293); null nếu perk không đổi giỏ/boa. */
  deltaPerVisit: number | null;
}

const POINTS_PER_VISIT_FAVORITE = 2; // regulars.ts:161 regularCheckout — mua món ưa +2 thân thiết/ngày

/** Thời gian + lợi ích của việc nâng thân thiết tới mốc perk KẾ TIẾP; null khi hết perk chưa mở. */
export function nextPerkTimeline(opts: {
  def: RegularDef;
  level: number;
  priceOf: (id: string) => number;
  progress?: RegularProgress;
}): NextPerkTimeline | null {
  const { def, progress } = opts;
  const next = nextPerk(def, progress);
  if (!next) return null;
  const toGo = Math.max(0, next.threshold - (progress?.friendship ?? 0));
  const visitsToPerk = Math.max(0, Math.ceil(toGo / POINTS_PER_VISIT_FAVORITE));
  const visitChance = regularVisitChance(def, progress);
  const weeklyVisits = Math.round(DAYS_PER_WEEK * visitChance * 10) / 10;
  const weeksToPerk = weeklyVisits > 0 ? Math.round((visitsToPerk / weeklyVisits) * 10) / 10 : 0;
  const nv = nextPerkValue(opts);
  return {
    perk: next, toGo, pointsPerVisit: POINTS_PER_VISIT_FAVORITE, visitsToPerk, weeklyVisits, weeksToPerk,
    deltaPerVisit: nv?.delta ?? null,
  };
}

// ───── GĐ1302 — "CẢ LÔ khách quen đáng bao nhiêu / nên ưu tiên chăm ai?" (tổng hợp thành 1 con số) ─────
// 5 GĐ chuỗi trước (1289 giỏ+boa/lần · 1293 delta mốc perk · 1295 đóng góp/tuần · 1298 rủ thêm khách · 1301
// bao lâu tới mốc) soi TỪNG khách quen — còn thiếu cái QUYẾT ĐỊNH Ở TẦM LÔ: cả đám khách quen góp ~bao nhiêu/
// tuần, bao nhiêu người đang GẦN MỐC PERK (đáng chăm), bao nhiêu người đang RỦ THÊM khách. Helper THUẦN chỉ
// GỘP các helper THUẦN đã có (weeklyContribution 1295 · nextPerkTimeline 1301 · referValue 1298) — không bịa
// thêm công thức/khách, không đổi kinh tế/save (Nguyên tắc c). Không import store (co-op an toàn).

export interface RegularCohortSummary {
  /** Số khách quen đủ món ưa (có ước tính đóng góp/tuần). */
  ready: number;
  /** Tổng đóng góp ~của cả lô mỗi tuần (đ) = Σ weeklyContribution.weekly (GĐ1295). */
  weeklyTotal: number;
  /** Số khách GẦN mốc perk kế tiếp (toGo ≤ 4) + mốc đó tăng tiền/lần (đáng chăm). */
  nearPerk: number;
  /** Tổng delta/lần nếu mở các mốc gần đó (đ) = Σ nextPerkTimeline.deltaPerVisit (GĐ1301/1293). */
  nearPerkDelta: number;
  /** Số khách đang có perk giới thiệu bạn bè + doanh thu > 0. */
  referring: number;
  /** Khách lẻ cả lô rủ thêm mỗi tuần (~) = Σ referValue.extraCustomersWeek (GĐ1298). */
  referCustomers: number;
}

/** Gộp cả lô khách quen thành 1 tranh tổng quan (đ/tuần + cơ hội gần mốc + rủ thêm). THUẦN — tái dùng helper đã có. */
export function regularCohortSummary(opts: {
  regulars: RegularDef[];
  level: number;
  priceOf: (id: string) => number;
  progressOf: (rid: string) => RegularProgress | undefined;
  avgPerVisit: number;
}): RegularCohortSummary {
  const s: RegularCohortSummary = { ready: 0, weeklyTotal: 0, nearPerk: 0, nearPerkDelta: 0, referring: 0, referCustomers: 0 };
  for (const def of opts.regulars) {
    const progress = opts.progressOf(def.id);
    const wc = weeklyContribution({ def, level: opts.level, priceOf: opts.priceOf, progress });
    if (wc) {
      s.ready += 1;
      s.weeklyTotal += wc.weekly;
    }
    const tl = nextPerkTimeline({ def, level: opts.level, priceOf: opts.priceOf, progress });
    if (tl && tl.deltaPerVisit != null && tl.deltaPerVisit > 0 && tl.toGo <= 4) {
      s.nearPerk += 1;
      s.nearPerkDelta += tl.deltaPerVisit;
    }
    const rf = referValue({ def, progress, avgPerVisit: opts.avgPerVisit });
    if (rf) {
      s.referring += 1;
      s.referCustomers += rf.extraCustomersWeek;
    }
  }
  return s;
}

/** Dòng tổng quan (bảng "giá trị khách quen") — rỗng nếu không có tín hiệu (không ồn). */
export function regularCohortLine(s: RegularCohortSummary): string {
  if (!s.ready || s.weeklyTotal <= 0) return '';
  const parts = [`~${formatMoney(s.weeklyTotal)}/tuần`];
  if (s.referCustomers > 0) parts.push(`${s.referring} rủ ~${Math.round(s.referCustomers * 10) / 10} khách/tuần`);
  if (s.nearPerk > 0) parts.push(`${s.nearPerk} gần mốc perk (+~${formatMoney(s.nearPerkDelta)}/lần)`);
  return `🧮 Khách quen: ${parts.join(' · ')}`;
}



