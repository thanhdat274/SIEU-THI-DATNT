import { SUPPLIERS, orderTotal, priceSwing, supplierSells, unitCost, type Supplier } from './suppliers';
import { caseSize, unlockedProducts } from './products';

/**
 * Minh bạch chi phí nhập (GĐ57 "Mua khi rẻ"): toàn bộ là helper THUẦN đọc — không state mới,
 * không đổi `unitCost`/`orderTotal`/giá/kinh tế/save. `unitCost(s, id, day)` dao động theo ngày
 * qua `swing = priceSwing(...) ∈ (−vol, +vol)` (seed theo ngày × mối × món); các hàm dưới đây chỉ
 * lộ ra mức giá đang ở đâu trong khung đó để người chơi chọn lúc rẻ / đổi mối — không hề đổi hành vi mua.
 *
 * suppliers.ts không phụ thuộc file này (chỉ phụ thuộc products/calendar/recipes) → import 1 chiều
 * procure → suppliers là an toàn, không có vòng lặp.
 */

export type BuyTone = 'cheap' | 'normal' | 'pricey';
export type Dir = 'cheaper' | 'pricier' | 'flat';

/**
 * Mức giá một món ở một mối hôm nay nằm ở đâu trong khung dao động:
 * - `pct`: độ lệch phần trăm so với giá chuẩn không-swing (≈ swing×100, âm = rẻ hơn chuẩn).
 * - `tone`: `cheap` khi swing < −vol/2, `pricey` khi swing > +vol/2, còn lại `normal` (giữa khung).
 */
export function buyCostTone(s: Supplier, productId: string, day: number): { pct: number; tone: BuyTone } {
  const swing = priceSwing(s, productId, day);
  const half = s.volatility / 2;
  const tone: BuyTone = swing > half ? 'pricey' : swing < -half ? 'cheap' : 'normal';
  return { pct: Math.round(swing * 100), tone };
}

/** Hướng giá ngày mai so với hôm nay (chỉ hướng, không con số — giữ phán đoán của người chơi). */
export function tomorrowCostDir(s: Supplier, productId: string, day: number): Dir {
  const today = unitCost(s, productId, day);
  const next = unitCost(s, productId, day + 1);
  return next < today ? 'cheaper' : next > today ? 'pricier' : 'flat';
}

/** Số món tối đa `n` (đã mở khóa, mối này bán được) hôm nay có giá nằm band rẻ. */
export function cheapTodayIds(s: Supplier, day: number, level: number, n: number): string[] {
  return unlockedProducts(level)
    .filter((p) => supplierSells(s, p.id) && buyCostTone(s, p.id, day).tone === 'cheap')
    .map((p) => p.id)
    .slice(0, n);
}

export interface CheapestResult {
  /** Mối mở khóa có `orderTotal` thấp nhất cho giỏ (chỉ tính mối bán được cả giỏ). */
  best: Supplier;
  total: number;
  /** Mối rẻ thứ nhì (null nếu chỉ có một mối khả dụng). */
  rival: Supplier | null;
  /** Rẻ hơn mối kế bao nhiêu (dương, ≥ 0); 0 nếu không có đối thủ. */
  delta: number;
}

/**
 * Mối mở khóa rẻ nhất cho giỏ hiện tại (theo `orderTotal`) + độ lệch so mối kế.
 * Chỉ so các mối có thể cung hết toàn giỏ (không so với mối thiếu ngành hàng → tránh so giá ảo).
 * Giỏ rỗng hoặc chưa đủ cấp mở mối thứ hai → null (chưa có gì để so).
 */
export function cheapestSupplier(items: Record<string, number>, day: number, level: number): CheapestResult | null {
  const ids = Object.keys(items).filter((id) => (items[id] ?? 0) > 0);
  if (ids.length === 0) return null;
  // Mối đã mở khóa VÀ bán được từng món trong giỏ.
  const canAll = SUPPLIERS.filter((s) => s.unlock <= level && ids.every((id) => supplierSells(s, id)));
  if (canAll.length < 2) return null; // cần ít nhất 2 mối để có "mối kế" so sánh
  const priced = canAll
    .map((s) => ({ s, total: orderTotal(s, items, day) }))
    .sort((a, b) => a.total - b.total);
  const best = priced[0];
  const rival = priced[1]?.s ?? null;
  return { best: best.s, total: best.total, rival, delta: rival ? priced[1]!.total - best.total : 0 };
}

// ─── GĐ103-2 "Dự phóng trước khi chốt đơn nhập": hộp đen NHẬP HÀNG được soi sớm ───
// Nguyên tắc GĐ103: thuần ĐỌC dữ liệu có sẵn — không đổi giá/kho/kinh tế, không state mới.
// Ước tính thô (mọi nhãn đều kèm "chừng/ước"): bán đều theo trung bình ngày, kho cũ bán trước
// (FIFO) rồi tới đơn mới; món vượt hạn dùng tính là hỏng. Dùng để cảnh báo trước khi chốt đơn,
// không phải dự báo chính xác.

/** Một dòng đơn để dự phóng: món + số thùng đặt, kèm dữ liệu có sẵn của món đó. */
export interface AssessLine {
  productId: string;
  /** Số thùng đặt trong đơn này. */
  cases: number;
  /** Trung bình bán (món/ngày) từ phân tích bán hàng; 0 = chưa có dữ liệu để ước. */
  dailyQty: number;
  /** Số thùng món này đang chiếm trong kho (trước đơn). */
  stockCases: number;
  /** Hạn dùng khi mới nhập (ngày); Infinity = không hết hạn. */
  shelfDays: number;
}

/** Mức cảnh báo của một dòng: ổn/xám (ổn hoặc chưa có dữ liệu) / vàng (bán chậm, hỏng ít) / đỏ (nhập dư). */
export type AssessLevel = 'ok' | 'near' | 'over';

export interface AssessLineOut {
  productId: string;
  cases: number;
  /** ~số ngày bán hết (kho cũ + đơn mới); null khi chưa có dữ liệu bán. */
  sellDays: number | null;
  /** Thùng món này chiếm (kho cũ + đơn mới) trên tổng trần kho. */
  caseUse: number;
  /** ước số món hỏng vì bán không kịp hạn; null khi không hết hạn hoặc không ước được. */
  spoil: number | null;
  /** Hạn dùng của món (ngày, echo từ đầu vào) để nhãn "vượt hạn dùng X ngày"; Infinity nếu không hết hạn. */
  shelfDays: number;
  /** Nhập dư: bán không kịp hạn VÀ ước hỏng ≥ SPOIL_OVER_AT món, hoặc kho không đủ chỗ cho phần đơn này. */
  over: boolean;
  /** Nguyên nhân nhập dư (null khi không dư). */
  overWhy: 'hạn' | 'kho' | 'hạn + kho' | null;
  level: AssessLevel;
}

export interface OrderAssessment {
  lines: AssessLineOut[];
  /** Tổng thùng kho sau đơn này (kho đã dùng + toàn bộ thùng đặt). */
  totalCases: number;
  capacity: number;
  /** Tổng đơn vượt trần kho. */
  totalOver: boolean;
}

/**
 * GD103-2b hotfix theo spec UI/UX: ngưỡng đỏ "nhập dư" — đỏ CHỈ khi bán không kịp hạn
 * (ngày bán hết > hạn dùng) VÀ ước hỏng ≥ chừng này món. Hỏng ít hơn (1 món) chỉ là
 * cận "bán chậm" (vàng) — tránh false positive đầu game làm người chơi mất niềm tin.
 */
export const SPOIL_OVER_AT = 2;

/** Dưới chừng này món/ngày coi như chưa có dữ liệu bán đáng tin → xám "theo dõi thêm", không ước ngày. */
export const ASSESS_MIN_DAILY = 0.5;

/**
 * Dự phóng một đơn nhập trước khi chốt: từng dòng ước "bán mấy ngày hết, chiếm mấy thùng kho,
 * hỏng chừng bao nhiêu món nếu hạn chỉ còn L ngày" + cờ nhập dư; tổng đơn so với trần kho.
 * Thuần đọc — đối số vào, kết quả ra, không đụng store. Các dòng `cases <= 0` bị bỏ qua.
 * Cờ "kho" xét cộng dồn theo thứ hạng dòng: dòng nào đẩy tổng vượt trần thì dòng đó chịu cảnh.
 */
export function orderAssessment(lines: AssessLine[], capacity: number, usedCases: number): OrderAssessment {
  const out: AssessLineOut[] = [];
  let remaining = capacity - usedCases; // chỗ trống kho, trừ dần theo từng dòng đặt
  let totalCases = usedCases;
  for (const l of lines) {
    if (l.cases <= 0) continue;
    const size = caseSize(l.productId);
    const units = (l.stockCases + l.cases) * size; // kho cũ + đơn mới, món
    // GD103-2b: cầu quá thấp (< 0.5 món/ngày) coi như chưa có dữ liệu — mẫu số ~0 cho ra
    // số ngày vô nghĩa ("234 ngày"), không ước sellDays/spoil, chỉ nhắc theo dõi thêm.
    const hasData = l.dailyQty >= ASSESS_MIN_DAILY && units > 0;
    const sellDays = hasData ? units / l.dailyQty : null;
    let spoil: number | null = null;
    if (Number.isFinite(l.shelfDays) && sellDays !== null) {
      spoil = Math.max(0, Math.ceil(units - l.dailyQty * l.shelfDays));
    }
    const khoOver = l.cases > remaining;
    remaining -= l.cases;
    // Đỏ "nhập dư" vì hạn: ngày bán hết vượt hạn dùng VÀ ước hỏng ≥ SPOIL_OVER_AT món
    // (spoil ≥ 2 đã hàm ý sellDays > shelfDays, kiểm tra kép để đúng nguyên văn spec).
    const hanOver =
      spoil !== null && sellDays !== null && sellDays > l.shelfDays && spoil >= SPOIL_OVER_AT;
    const over = hanOver || khoOver;
    const overWhy = hanOver && khoOver ? 'hạn + kho' : hanOver ? 'hạn' : khoOver ? 'kho' : null;
    totalCases += l.cases;
    // Vàng "bán chậm": bán không kịp hạn nhưng chỉ ước hỏng < SPOIL_OVER_AT món (cận, không đỏ).
    const hanSlow = sellDays !== null && Number.isFinite(l.shelfDays) && sellDays > l.shelfDays;
    out.push({
      productId: l.productId,
      cases: l.cases,
      sellDays,
      caseUse: l.stockCases + l.cases,
      spoil,
      shelfDays: l.shelfDays,
      over,
      overWhy,
      level: over ? 'over' : hanSlow ? 'near' : 'ok',
    });
  }
  return { lines: out, totalCases, capacity, totalOver: totalCases > capacity };
}
