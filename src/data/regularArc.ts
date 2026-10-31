// ───── Câu chuyện khách quen: đợt nhờ vả nhiều ngày (GĐ80) ─────
// Mọi nhịp dài-hơn-một-ngày của game đều là TOÀN CỤC (tuần/tháng/mùa/lễ/sự kiện) — chưa từng có
// nào gắn với TỪNG khách quen có tên (28 nhân vật có bio/favorites) theo nhịp 2–4 ngày. Helper
// này THUẦN ĐỌC (type-only, no store): mô tả "câu chuyện nhờ vả" — chuỗi 2–4 ngày, mỗi ngày
// khách cần 1 món (đo bằng giỏ mua), xong đủ bước → phần thưởng + tiếng. Không import store.
import { productById } from './products';
import { slowBands } from './rhythm';

export interface RegularArcStep {
  itemId: string;
  qty: number;
  note: string;
}

export interface RegularArcDef {
  id: string;
  regularId: string;
  title: string;
  desc: string;
  /** Thân thiết tối thiểu để khách bắt đầu nhờ vả. */
  unlock: number;
  /** Số ngày để xong (2–4); bước = số ngày. */
  days: number;
  steps: RegularArcStep[];
  rewardBase: number;
  rewardPerLevel: number;
}

/** Trạng thái một đợt nhờ vả đang/đã theo dõi của một khách (lưu theo regularId). */
export interface RegularArcState {
  arcId: string;
  /** Bước đang chờ (0-based). */
  step: number;
  offerDay: number;
  /** Hạn hoàn thành (ngày này trở đi còn phụ thu xong). */
  expiresDay: number;
  /** Đã đủ mọi bước, đợi cuối ngày trả thưởng. */
  waitingReward: boolean;
  /** Đã kết thúc (trả thưởng hoặc hết hạn) — giữ vết để không mời lại. */
  done?: boolean;
}

export const REGULAR_ARCS: RegularArcDef[] = [
  {
    id: 'arc_xoi', regularId: 'ba_nam', title: 'Bà Năm chuẩn bị gánh xôi', days: 3, unlock: 20,
    desc: 'Bà Năm sắp gánh xôi đãi hàng xóm, nhờ tiệm giữ sẵn nguyên liệu 3 ngày.',
    steps: [
      { itemId: 'sua', qty: 2, note: 'giữ 2 hộp sữa' },
      { itemId: 'trung', qty: 4, note: 'giữ 4 quả trứng' },
      { itemId: 'caphe', qty: 1, note: 'giữ 1 gói cà phê' },
    ],
    rewardBase: 60000, rewardPerLevel: 4000,
  },
  {
    id: 'arc_xe_om', regularId: 'chu_ba', title: 'Cuốc xe dài ngày của chú Ba', days: 3, unlock: 20,
    desc: 'Chú Ba có chuyến xe đường dài xuyên mấy xã, cần trữ đủ nước/tăng lực mỗi ngày.',
    steps: [
      { itemId: 'tangluc', qty: 2, note: 'giữ 2 chai nước tăng lực' },
      { itemId: 'nuoc', qty: 6, note: 'giữ 6 chai nước' },
      { itemId: 'caphe', qty: 2, note: 'giữ 2 gói cà phê' },
    ],
    rewardBase: 70000, rewardPerLevel: 4000,
  },
  {
    id: 'arc_keo', regularId: 'be_na', title: 'Kẹo cho bạn cùng lớp', days: 3, unlock: 15,
    desc: 'Bé Na được giao mua quà liên hoan lớp, nhờ tiệm giữ món 3 ngày.',
    steps: [
      { itemId: 'snack', qty: 4, note: 'giữ 4 gói snack' },
      { itemId: 'banh', qty: 3, note: 'giữ 3 gói bánh' },
      { itemId: 'kem', qty: 2, note: 'giữ 2 que kem' },
    ],
    rewardBase: 50000, rewardPerLevel: 3000,
  },
];

export const arcById = (id: string) => REGULAR_ARCS.find((a) => a.id === id);

export function arcsForRegular(regularId: string): RegularArcDef[] {
  return REGULAR_ARCS.filter((a) => a.regularId === regularId);
}

/**
 * Đợt nhờ vả KHẢ DỤNG cho khách này: thuộc khách, đủ thân thiết, chưa có đợt đang/đã chạy,
 * và mọi món bước đã mở khóa ở cấp hiện tại. Trả null nếu không có (xác định — mời đợt đầu).
 */
export function arcForRegular(
  def: { id: string },
  prog: { friendship: number } | undefined,
  arcs: Record<string, RegularArcState>,
  level: number,
): RegularArcDef | null {
  const existing = arcs[def.id];
  if (existing) return null; // đang chạy hoặc đã xong → không mời lại
  for (const arc of arcsForRegular(def.id)) {
    if (!prog || prog.friendship < arc.unlock) continue;
    const itemsOk = arc.steps.every((st) => productById(st.itemId).unlock <= level);
    if (!itemsOk) continue;
    return arc;
  }
  return null;
}

/** Giỏ mua (`basket` là mảng món có `id`) có đủ số lượng món của bước không. */
export function arcStepFulfilled(step: RegularArcStep, basket: { id: string }[]): boolean {
  const got = basket.filter((it) => it.id === step.itemId).length;
  return got >= step.qty;
}

/** Thưởng một đợt nhờ vả xong — phụ gia additive theo cấp (như GĐ75/79). */
export function arcReward(arc: RegularArcDef, level: number): number {
  return arc.rewardBase + arc.rewardPerLevel * level;
}

/** Bước hiện tại của đợt (theo state.step); null nếu đã hết bước. */
export function currentArcStep(arc: RegularArcDef, state: RegularArcState): RegularArcStep | null {
  return arc.steps[state.step] ?? null;
}

// ───── Cửa sổ "tiện làm" của bước nhờ (GĐ163) ─────
// Audit trải nghiệm 28/10: khung vắng 8:30–11h & 13–17h (×0.6) là "ca trực không quyết định".
// Cơ chế arc GĐ80 KHÔNG có khái niệm giờ: bước nhờ mới chỉ xuất hiện khi CHÍNH khách đó ghé
// và thanh toán (core/slices/regulars.ts regularVisit) — không thể hẹn giờ lúc sinh bước. Phương
// án ít đụng nhất đã chốt: SUY RA cửa sổ từ dữ liệu có sẵn (khung ghé visitFrom–visitUntil của
// khách ∩ khung giờ vắng), KHÔNG thêm field vào save, KHÔNG đụng slice — nhịp tiến arc GĐ80
// (theo lượt ghé, hết hạn không phạt) giữ nguyên 100%, chỉ thêm LỜI GỢI "việc này làm lúc nào".

/** Cửa sổ gợi ý để lo bước nhờ: khoảng phút trong ngày. `inSlow` = cửa sổ nằm trong khung vắng
 *  (fallback khi khung ghé của khách không chạm khung vắng nào — vd. khách chỉ ghé 6–9h sáng). */
export interface ErrandWindow {
  from: number;
  to: number;
  inSlow: boolean;
}

/**
 * Cửa sổ "tiện làm" của việc nhờ của một khách quen: phần khung ghé của khách rơi vào GIỜ VẮNG
 * (band traffic < 0.8, cùng ngưỡng isSlowHour) — lúc đó khách có mặt mà tiệm rảnh, chủ kẻo thời
 * trữ hàng chờ khách. Nhiều khung vắng cùng chạm thì lấy khung CHỒNG DÀI NHẤT (khách ở quanh đây
 * lâu nhất; hòa thì lấy khung sớm hơn). Khung ghé không chạm khung vắng nào → trả nguyên khung ghé
 * (trung thực: đó vẫn là lúc duy nhất khách xuất hiện), `inSlow = false`.
 * Xác định hoàn toàn theo def — không random, không state, gọi bao nhiêu lần cùng kết quả.
 */
export function errandWindow(def: { visitFrom: number; visitUntil: number }): ErrandWindow {
  let best: ErrandWindow | null = null;
  for (const b of slowBands()) {
    const from = Math.max(def.visitFrom, b.from);
    const to = Math.min(def.visitUntil, b.to);
    if (to - from > (best ? best.to - best.from : 0)) best = { from, to, inSlow: true };
  }
  return best ?? { from: def.visitFrom, to: def.visitUntil, inSlow: false };
}

/** Một bước nhờ đang chờ người chơi lo (kèm định nghĩa arc + state để UI đọc thêm). */
export interface PendingErrand {
  /** Khóa của state trong biz.regularArcs (= regularId). */
  regularId: string;
  arc: RegularArcDef;
  state: RegularArcState;
  step: RegularArcStep;
}

/**
 * Các bước nhờ ĐANG CHỜ của mọi đợt nhờ vả: đợt còn chạy (chưa done, chưa đủ bước đợi thưởng,
 * chưa quá hạn — core/biz.ts khép đợt ở cuối ngày khi `expiresDay < day` nên trong ngày
 * `expiresDay` đợt vẫn sống), có bước hiện tại hợp lệ, và arc tồn tại trong catalog (save lệch
 * schema thì bỏ qua, không sập). Thứ tự theo key của record — xác định.
 */
export function pendingErrands(
  arcs: Record<string, RegularArcState> | undefined,
  day: number,
): PendingErrand[] {
  const out: PendingErrand[] = [];
  for (const [regularId, st] of Object.entries(arcs ?? {})) {
    if (st.done || st.waitingReward || day > st.expiresDay) continue;
    const arc = arcById(st.arcId);
    if (!arc) continue;
    const step = currentArcStep(arc, st);
    if (!step) continue;
    out.push({ regularId, arc, state: st, step });
  }
  return out;
}
