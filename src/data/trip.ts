/**
 * Hệ 5 — Chuyến đi tỉnh lấy hàng (SPEC-CHIEU-RONG §5). L2: `startTrip` + vắng mặt + xe về nhập kho.
 *
 * THUẦN, test được. Mọi tuyến/xe mở > 30 (routes.ts) nên simGolden (kỷ nguyên 0, cấp 30) không chạm:
 * `startTrip` chỉ chạy khi người chơi tự bấm, và mọi nhánh về (tick / endDay) đều canh `biz.trip` trống.
 *
 * L2 chưa có nhịp nào (chọn hàng / mặc cả / chuyện dọc đường — L3–L5). Người chơi lập sẵn giỏ hàng
 * (`tripSetCart`) trước hoặc trong lúc đi; tới giờ về, hàng được chuyển vào kho.
 */
import type { HaulerDef, HaulerId, RouteDef } from './routes';
import { routeById, roundTripMinutes, routeBuyPrice, routeDiscountFor, routeGood } from './routes';
import { casesFor, caseSize, productById, type Category, type Product } from './products';
import { WEEK_DAYS } from './bizWeeks';
import { relTier } from './supplierRel';
import type { RoadEvent } from './roadEvents';
import type { Stock } from '../core/stock';
import { copyStock, putStock } from '../core/stock';
import { shelfLife } from './freshness';

/** Trạng thái một chuyến đi tỉnh (SPEC §5.10). */
export interface TripState {
  routeId: string;
  /** Ngày game xuất phát. */
  day: number;
  /** Phút game xuất phát. */
  departAt: number;
  /** Phút game xe về tới. */
  returnAt: number;
  /** 'self' (chủ tự đi) hoặc id nhân viên giao (L8). */
  by: 'self' | number;
  /** Hẻm online: id người chơi đang đi (chưa dùng ở L2). */
  traveler?: number;
  /** Tiền người chơi mang theo để mua hàng (VNĐ, chốt lúc xuất phát). */
  cash: number;
  /** Xe chở hàng dùng cho chuyến (từ `biz.hauler`). */
  hauler: HaulerId;
  /** Hàng sẽ chở về: productId → số lượng. Chưa có nhịp nào nên người chơi tự lập (tripSetCart). */
  cart: Record<string, number>;
  /** Nhịp đường (0 = đang khởi hành; 1–4 dùng ở L3–L5). */
  beat: 0 | 1 | 2 | 3 | 4;
  /** Mặc cả (nhịp 3, L4). */
  haggle?: { round: number; best: number; anger: number };
  /** Tổng phút bị chậm do chuyện dọc đường (L5) cộng thêm khi về. */
  delayMin: number;
  /** Cờ trạng thái (vd. 'mưa_chạy_tiếp'...) dùng ở L5. */
  flags: string[];
}

/** Bắt đầu một chuyến: returnAt = departAt + khứ hồi theo xe (chưa kể chậm trễ). */
export function beginTrip(
  route: RouteDef, hauler: HaulerDef, day: number, departAt: number,
  by: 'self' | number, cash: number, cart: Record<string, number>,
): TripState {
  return {
    routeId: route.id, day, departAt,
    returnAt: departAt + roundTripMinutes(route, hauler),
    by, cash, hauler: hauler.id,
    cart: { ...cart }, beat: 0, delayMin: 0, flags: [],
  };
}

/** Xe đã về tới (với phút game hiện tại) chưa. */
export const tripArrived = (t: TripState, minutes: number): boolean => minutes >= t.returnAt;

/** Còn bao nhiêu phút game nữa xe về (0 = đã tới). */
export const tripRemaining = (t: TripState, minutes: number): number => Math.max(0, t.returnAt - minutes);

/** Tiến độ chuyến (0..1): 1 = đã về. */
export const tripProgress = (t: TripState, minutes: number): number => {
  const span = Math.max(1, t.returnAt - t.departAt);
  return Math.max(0, Math.min(1, (minutes - t.departAt) / span));
};

/** Số giờ game trên đường (làm tròn lên, tối thiểu 1) — dùng để bớt hạn hàng tươi. */
export const tripRoadHours = (t: TripState): number =>
  Math.max(1, Math.ceil((t.returnAt - t.departAt) / 60));

/** Chi phí mua cả xe hàng theo giá NIÊM YẾT của tuyến (đã rẻ hơn) — VNĐ. */
export function cartBuyCost(t: TripState, route: RouteDef): number {
  let sum = 0;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    sum += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
  }
  return sum;
}

/** Chi phí mua cả xe hàng SAU KHI mặc cả (L4): giá niêm yết tuyến nhân (1 – giảm thêm đã chốt). */
export function cartBuyCostDiscounted(t: TripState, route: RouteDef): number {
  const d = Math.max(0, Math.min(1, t.haggle?.best ?? 0));
  return Math.round(cartBuyCost(t, route) * (1 - d));
}

/** Hạn (ngày) còn lại khi nhập kho — không thùng đá thì tươi/thịt mất hạn theo số giờ trên đường (§5.4);
 *  L5: chọn "chạy tiếp" khi trời mưa (`flags` có 'wet') → hàng khô làm ướt, mất thêm 2 ngày hạn. */
export function tripLotLife(p: Product, t: TripState, coolBox: boolean): number {
  const life = shelfLife(p.id);
  let l = life;
  if (!(coolBox || (p.category !== 'fresh' && p.category !== 'meat'))) l -= tripRoadHours(t);
  if (t.flags?.includes('wet') && p.category !== 'drink' && p.category !== 'fresh' && p.category !== 'meat') l -= 2;
  return Math.max(1, l);
}

/** Xe về: chuyển `cart` vào kho `stock`, mỗi món một lô (hạn đã bớt theo đường). THUẦN — trả Stock mới. */
export function tripLoadStock(t: TripState, stock: Stock, coolBox: boolean): Stock {
  const route = routeById(t.routeId);
  const k = copyStock(stock);
  if (!route) return k;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    putStock(k, pid, q, [{ qty: q, life: tripLotLife(p, t, coolBox) }]);
  }
  return k;
}

// ─────────────── L3: weeklyCap + sức chở (SPEC §5.5 R7) ───────────────

/** Trạng thái hàng còn tại nguồn một tuyến trong TUẦN hiện tại (R7 — cổng chống farm). */
export interface RouteStock {
  /** Tuần game (1-based, weekOfDay()). Khác tuần hiện tại → coi như nguồn đã về hàng mới. */
  week: number;
  /** Số món còn có thể mua tuần này — khoá là productId (hàng riêng) hoặc `cat:<Category>` (nhóm ngành). */
  left: Record<string, number>;
}

/** Tuần game của một ngày (1-based). */
export const weekOfDay = (day: number): number => Math.max(1, Math.ceil(day / WEEK_DAYS));

/** Mối ruột tại nguồn (SPEC §5.7): bậc mối quen theo doanh mua tích lũy khoá `route:${id}`. */
export const routeRelTier = (rel: { spent: number } | undefined): number =>
  rel ? relTier(rel.spent).level : 0;

/** Mối ruột bậc càng cao, `weeklyCap` nguồn càng dày (SPEC §5.7: +10% mỗi bậc). */
export const routeCapBonus = (tier: number): number => 1 + 0.10 * Math.max(0, tier);

/** Ghi nợ một chuyến (bậc 3+ "Mối ruột" được phép — SPEC §5.7): trả trong this nhiều ngày. */
export const TRIP_DEBT_DUE_DAYS = 7;
/** Giới hạn nợ khi mua quá tiền mang theo: tối đa this % của `cash`. */
export const TRIP_DEBT_PCT = 0.20;

/** Khoản nợ mối ruột đã QUÁ HẠN chưa (trả trong TRIP_DEBT_DUE_DAYS ngày, SPEC §5.7). */
export const debtOverdue = (d: { dueDay: number }, day: number): boolean => day > d.dueDay;

// ─────────────── L8: sai người giao hàng đi thay (SPEC-CHIEU-RONG §5.8) ───────────────

/** Người giao hàng từ 4★ được 1 lượt mặc cả TỰ ĐỘNG khi đi thay: lấy nửa mức tối đa (6%). */
export const COURIER_AUTO_HAGGLE = 0.06;
export const courierAutoHaggle = (skill: number): number => (skill >= 4 ? COURIER_AUTO_HAGGLE : 0);

/** Người giao hàng tự chọn phương án mặc định của chuyện dọc đường (SPEC §5.8): "phương án chậm, an toàn" —
 *  ưu tiên phương án chỉ tốn thời gian (không tiền/phí/ướt); không có thì chọn chậm nhất. Trả index option. */
export function courierSafeOption(evt: RoadEvent | undefined): number {
  if (!evt || evt.options.length === 0) return -1;
  let pure = -1;
  for (let i = 0; i < evt.options.length; i++) {
    const o = evt.options[i];
    if (o.cost || o.friend || o.sell || o.wet) continue;
    if (pure < 0 || o.minutes > evt.options[pure].minutes) pure = i;
  }
  if (pure >= 0) return pure;
  let slow = 0;
  for (let i = 1; i < evt.options.length; i++) if (evt.options[i].minutes > evt.options[slow].minutes) slow = i;
  return slow;
}

/** Khoá trữ trong `routeStock.left` cho một món — hàng riêng của tuyến theo productId, còn lại theo nhóm ngành. */
export const routeStockKey = (route: RouteDef, productId: string, category: Category): string =>
  routeGood(route, productId) ? productId : `cat:${category}`;

/** Khởi tạo lượng nguồn cho một TUẦN mới của tuyến (đổ đầy theo weeklyCap từng món/nhóm).
 *  `tierBonus` = bậc mối ruột tại nguồn → weeklyCap +10%/bậc (§5.7). */
export function routeStockFresh(day: number, route: RouteDef, tierBonus = 0): RouteStock {
  const k = routeCapBonus(tierBonus);
  const left: Record<string, number> = {};
  for (const g of route.goods) left[g.productId] = (left[g.productId] ?? 0) + Math.floor(g.weeklyCap * k);
  for (const c of route.categoryDeals ?? []) left[`cat:${c.category}`] = (left[`cat:${c.category}`] ?? 0) + Math.floor(c.weeklyCap * k);
  return { week: weekOfDay(day), left };
}

/** Lấy routeStock của tuyến (tạo mới/đổ đầy nếu sang tuần khác). Không sửa đầu vào.
 *  Bậc mối ruột chỉ áp dụng khi LÀM MỚI (sang tuần) — tuần đang chạy giữ nguyên. */
export function routeStockResolve(stocks: Record<string, RouteStock> | undefined, route: RouteDef, day: number, tierBonus = 0): RouteStock {
  const cur = stocks?.[route.id];
  if (cur && cur.week === weekOfDay(day)) return cur;
  return routeStockFresh(day, route, tierBonus);
}

/** Lượng còn lại ở nguồn tuần này cho một món (0 nếu không bán/hết). */
export const routeStockLeft = (stock: RouteStock, route: RouteDef, productId: string, category: Category): number =>
  stock.left[routeStockKey(route, productId, category)] ?? 0;

/** Trừ lượng đã mua khỏi routeStock khi xe chở về — THUẦN, trả RouteStock mới (kẹp ≥ 0). */
export function routeStockSpend(stock: RouteStock, route: RouteDef, cart: Record<string, number>): RouteStock {
  const left = { ...stock.left };
  for (const [pid, qty] of Object.entries(cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    const k = routeStockKey(route, pid, p.category);
    left[k] = Math.max(0, (left[k] ?? 0) - q);
  }
  return { ...stock, left };
}

/** Kết quả kiểm tra giỏ hàng chở về. */
export type CartCheck = { ok: true } | { ok: false; reason: string };

/**
 * Kiểm tra giỏ hàng chở về (nhịp 2 — chọn hàng, L3): sức chở ≤ `hauler.cases`, lượng mua ≤ lượng còn ở
 * nguồn tuần này (`stock`), và tiền ≤ `cash`. `debtLimit` (mối ruột bậc 3+, §5.7) cho phép mua QUÁ `cash`
 * tối đa `debtLimit` — phần quá đó xe về ghi nợ. `cart` được đọc từ `t`.
 */
export function checkCart(t: TripState, route: RouteDef, hauler: HaulerDef, stock: RouteStock, debtLimit = 0): CartCheck {
  let cash = 0;
  let cases = 0;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    const left = routeStockLeft(stock, route, pid, p.category);
    if (q > left) return { ok: false, reason: `${p.name} ở nguồn tuần này còn ${left}` };
    cash += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
    cases += casesFor(pid, q);
  }
  if (cash > t.cash + debtLimit) return { ok: false, reason: 'Vượt tiền mang theo' };
  if (cases > hauler.cases) return { ok: false, reason: `Quá sức chở (${cases}/${hauler.cases} thùng)` };
  return { ok: true };
}

/** Tổng số thùng (casesFor) cả xe hàng — đo sức chở đã dùng. */
export function cartCases(cart: Record<string, number>): number {
  let n = 0;
  for (const [pid, qty] of Object.entries(cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    n += casesFor(pid, q);
  }
  return n;
}

// ─────────────── L8: tripPayoff — so "tự đi / sai người / mua mối lái" (SPEC §5.8) ───────────────

/** Giỏ tham chiếu để so: MỘT CHUYẾN BA GÁC ĐẦY (30 thùng, SPEC §5.9). */
export const TRIP_REF_CASES = 30;
/** Mức mặc cả người chơi TỰ ĐI dùng để so (giữa khoảng 0–12% của §5.8, sàn điển hình ~6%). */
export const PAYOFF_SELF_HAGGLE = 0.06;
/** Cước công người giao cho một chuyến (mức 1.1× lương nhân viên ~2★ của courier, §5.8). */
export const PAYOFF_COURIER_WAGE = 30_000;

/** Ba kênh mua so sánh trên thẻ tripPayoff. */
export type TripPayoffId = 'middleman' | 'self' | 'courier';

/** Một dòng so sánh trên thẻ payoff. */
export interface TripPayoffRow {
  id: TripPayoffId;
  name: string;
  icon: string;
  /** Tiền mặt bỏ ra để lấy đúng giỏ tham chiếu (VNĐ). */
  cost: number;
  /** Rẻ hơn (dương) hay đắt hơn (âm) bao nhiêu so với mua ở mối lái về nhà. */
  savings: number;
  note: string;
}

/** Kết quả thẻ so sánh cho một tuyến (SPEC §5.8: "so bằng số tiền thật"). */
export interface TripPayoff {
  routeId: string;
  routeName: string;
  /** Giỏ tham chiếu = một chuyến ba gác đầy (các món của tuyến, theo weeklyCap). */
  cart: Record<string, number>;
  cases: number;
  /** Kênh rẻ nhất. */
  best: TripPayoffId;
  rows: TripPayoffRow[];
}

/** Giỏ tham chiếu của một tuyến: nạp các món tới kín ~30 thùng, mỗi món tối đa weeklyCap. THUẦN. */
export function payoffRefCart(route: RouteDef): { cart: Record<string, number>; cases: number } {
  const cart: Record<string, number> = {};
  let used = 0;
  for (const g of route.goods) {
    const p = productById(g.productId); if (!p) continue;
    const s = caseSize(g.productId);
    const fit = Math.floor((TRIP_REF_CASES - used) * s);
    const take = Math.max(0, Math.min(g.weeklyCap, fit));
    if (take > 0) { cart[g.productId] = take; used += casesFor(g.productId, take); }
    if (used >= TRIP_REF_CASES) break;
  }
  return { cart, cases: used };
}

/**
 * Thẻ so sánh một chuyến (SPEC §5.8): cùng giỏ tham chiếu, ba kênh bỏ ra bao nhiêu tiền mặt.
 *   - `middleman` = mua ở mối lái về nhà (giá nhập chuẩn, không phải đi).
 *   - `self`      = tự đi, mặc cả tại nguồn (giá niêm yết tuyến nhân 1 − sàn điển hình 6%).
 *   - `courier`   = sai người giao, giá niêm yết (không mặc cả) + cước công.
 * Hàng của `cart` chỉ nằm trong weeklyCap tuần — dùng để ước lượng, không trừ state.
 */
export function tripPayoff(route: RouteDef): TripPayoff {
  const { cart, cases } = payoffRefCart(route);
  let middleman = 0;
  let listing = 0;
  for (const [pid, qty] of Object.entries(cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    middleman += p.buy * q;
    listing += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
  }
  const selfCost = Math.round(listing * (1 - PAYOFF_SELF_HAGGLE));
  const courierCost = listing + PAYOFF_COURIER_WAGE;
  const row = (id: TripPayoffId, name: string, icon: string, cost: number, note: string): TripPayoffRow =>
    ({ id, name, icon, cost, savings: middleman - cost, note });
  const rows: TripPayoffRow[] = [
    row('middleman', 'Mua ở mối lái', '🏪', middleman, 'Giá nhập chuẩn, khỏi phải đi.'),
    row('courier', 'Sai người đi', '🛵', courierCost, 'Giá niêm yết + cước người giao; không mặc cả.'),
    row('self', 'Tự đi lấy', '🛺', selfCost, `Mặc cả tại nguồn (giảm ~${Math.round(PAYOFF_SELF_HAGGLE * 100)}%).`),
  ];
  rows.sort((a, b) => a.cost - b.cost);
  return { routeId: route.id, routeName: route.name, cart, cases, best: rows[0].id, rows };
}

/** Số tiền TIẾT KIỆM được so với mua giá mối lái (giá nhập chuẩn) — để UI hiện "đang lời bao nhiêu" (§5.6). */
export function cartSavings(t: TripState, route: RouteDef): number {
  let std = 0;
  let paid = 0;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    std += p.buy * q;
    paid += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
  }
  return std - paid;
}
