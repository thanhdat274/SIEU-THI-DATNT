// ───── Câu chuyện khách quen: đợt nhờ vả nhiều ngày (GĐ80) ─────
// Mọi nhịp dài-hơn-một-ngày của game đều là TOÀN CỤC (tuần/tháng/mùa/lễ/sự kiện) — chưa từng có
// nào gắn với TỪNG khách quen có tên (28 nhân vật có bio/favorites) theo nhịp 2–4 ngày. Helper
// này THUẦN ĐỌC (type-only, no store): mô tả "câu chuyện nhờ vả" — chuỗi 2–4 ngày, mỗi ngày
// khách cần 1 món (đo bằng giỏ mua), xong đủ bước → phần thưởng + tiếng. Không import store.
import { productById } from './products';

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
