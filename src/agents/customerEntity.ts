import * as THREE from 'three';
import { simRng } from '../core/rand';
import type { CartItem } from '../core/store';
import { PROFESSION_LOOK, type ProfessionDef } from '../data/professions';
import type { RegularDef } from '../data/regulars';
import type { ServiceDef } from '../data/services';
import type { ReviewReason } from '../data/reviews';
import { CARE_PATIENCE_PER_STAR } from '../data/staff';
import { createCart } from '../shop/furnitureView';
import { Walker } from './walker';

export const SIDEWALK_Z = 2.2;
/** Khách chờ ở quầy tối đa bao nhiêu phút game. */
export const PATIENCE_MINUTES = 45;
/** GĐ119 — khách bắt đầu sốt ruột từ tỉ lệ waited/patience ≥ này (hiện 😕). */
export const IMPATIENT_AT = 0.6;
/** GĐ119 — khách sắp bỏ đi từ tỉ lệ ≥ này (hiện 😤, rồi 😠 khi bỏ). */
export const FRANTIC_AT = 0.85;

/** GĐ119 — emoji "khách sốt ruột" theo tỉ lệ đã chờ trên kiên nhẫn (thuần đọc, trả null khi còn bình tĩnh). */
export function impatienceEmoji(ratio: number): '😕' | '😤' | null {
  if (ratio >= FRANTIC_AT) return '😤';
  if (ratio >= IMPATIENT_AT) return '😕';
  return null;
}

// ───── GĐ1208 — bội số kiên nhẫn chờ quầy (tách nguyên văn từ agent, THUẦN) ─────
// Trước đây agent khách (agents/customers.ts) tự nhân patience 2 lần ở trong vòng đời sống:
//   · mèo ở quầy → khách nhỏ (học sinh, mẹ bỉm) đỡ sốt ruột ×1.3;
//   · nhân viên "chăm sóc khách" trực ca → ai cũng chịu chờ lâu hơn theo tay nghề ×(1 + 0.06×care).
// Hai quy tắc này là logic-đuôi của "vì sao khách bỏ về khi chờ lâu" — nhưng nằm CHÌM trong agent
// gắn store/THREE nên không test/hiểu được. GĐ1208 tách thành helper thuần (cùng công thức, cùng hằng
// số) để test trực tiếp và để số phản hồi ở báo cáo/vòng phản hồi khớp đúng hành vi thật. HÀNH VI GIỮ
// NGUYÊN — chỉ thay phép nhân nội tuyến bằng một lần gọi helper cùng giá trị trả về.
export const CAT_PATIENCE_MUL = 1.3;
/** Khách nhỏ thấy mèo ở quầy đỡ sốt ruột — đúng danh sách nghề trong agent cũ. */
export const CAT_SOOTHE_PROFESSIONS = ['student_highschool', 'student_college', 'mom'];

export interface PatienceContext {
  /** Mèo đang hoạt động ở quầy (petActive cat). */
  petCat: boolean;
  /** Nghề của khách vãng lai (null = dân thường / khách quen). */
  professionId?: string | null;
  /** Tay nghề chăm sóc khách của người trực ca (bestSkillOnDuty 'customer_care'); 0 nếu không ai. */
  care: number;
}

/** Bội số nhân vào patience chờ quầy: mèo an ủi khách nhỏ, nhân viên chăm sóc xoa dịu mọi người. */
export function patienceMultiplier(ctx: PatienceContext): number {
  let m = 1;
  if (ctx.petCat && ctx.professionId && CAT_SOOTHE_PROFESSIONS.includes(ctx.professionId)) m *= CAT_PATIENCE_MUL;
  if (ctx.care > 0) m *= 1 + CARE_PATIENCE_PER_STAR * ctx.care;
  return m;
}

/**
 * GĐ1213 — Chọn quầy thanh toán: trích phần quyết định thuần từ `agents/customers.ts` (joinQueue)
 * thành helper, GIỮ NGUYÊN công thức/hằng (Luật 3 — hành vi y hệt) để logic này test được và soi sáng.
 * Công thức gốc: score = độ dài hàng + (quầy KHÔNG có người tính tiền ? 3 : 0) + (quầy chính ? −0.1 : 0);
 * chọn quầy có score nhỏ nhất (hàng ngắn nhất), quầy chính hơi được ưu tiên, quầy vắng người coi như dài thêm 3.
 */
export const UNSTAFFED_COUNTER_PENALTY = 3;
export const MAIN_COUNTER_BIAS = -0.1;

export function counterQueueScore(queueLength: number, hasCashier: boolean, isMain: boolean): number {
  return queueLength + (hasCashier ? 0 : UNSTAFFED_COUNTER_PENALTY) + (isMain ? MAIN_COUNTER_BIAS : 0);
}

/** Argmin theo scoreOf; hoà điểm giữ nguời đầu (giữ y tie-break của bản gốc giảm so sánh `<`). */
export function leastScore<T>(items: readonly T[], scoreOf: (t: T) => number): T {
  return items.reduce((a, b) => (scoreOf(b) < scoreOf(a) ? b : a));
}

/**
 * GĐ1214 — Năng suất thanh toán của một quầy từ tối đa 2 nhân viên: trích từ `agents/staff.ts`
 * (cashierSpeed) thành helper THUẦN, GIỮ NGUYÊN công thức (Luật 3 — hành vi y hệt). Công thức gốc:
 * quầy chứa được 2 người — người giỏi nhất tính tiền (×1), người thứ hai phụ gói hàng (+50% tốc độ họ).
 * `speedsDesc` phải được sắp giảm dần (bản gốc sort desc trước khi gọi); chỉ 2 người đầu được tính.
 */
export function counterThroughput(speedsDesc: readonly number[]): number {
  const first = speedsDesc[0] ?? 0;
  const second = speedsDesc[1] ?? 0;
  return first + 0.5 * second;
}

/**
 * GĐ1220 — bề mặt "năng suất quầy" (khép lời hứa của GĐ1214 "báo cáo trỏ quầy không đủ người"): mảnh
 * cuối của vòng chờ quầy (GĐ1208 kiên nhẫn → GĐ1213 chọn quầy → GĐ1214 năng suất) đã tách + test được,
 * nhưng con số ×1/×1.5 chưa từng lên màn hình — người chơi đứng quầy 1 người không biết thêm 1 người phụ
 * gói hàng đẩy năng suất lên ×1.5 để đỡ khách chờ lâu bỏ về. Helper THUẦN ghép câu dạy từ đúng luật
 * `counterThroughput` (×1 người giỏi nhất + ×0.5 người thứ hai) — UI chỉ hiển thị, không đổi kinh tế/save.
 */
export function counterThroughputNote(): string {
  return `⚡ Quầy: người giỏi nhất tính tiền (×1 năng suất), thêm 1 người phụ gói hàng → ×1.5 — giữ quầy đủ 2 người lúc đông để đỡ khách chờ lâu bỏ về.`;
}

/**
 * GĐ1216 — Số sao khách chấm khi rời tiệm: trích từ `agents/customers.ts` (review) thành helper THUẦN,
 * GIỮ NGUYÊN công thức/hằng (Luật 3 — hành vi y hệt). Là quyết định người chơi NHÌN THẤY (đánh giá →
 * danh tiếng) nhưng từng chìm trong agent gắn store/simRng nên là "hộp đen": mỗi món không mua được
 * −1 sao, chờ quá nửa patience −1 sao, clamp về [1,5]. `waited > patience/2` là phép so sánh KHẮT
 * (không ≥) — đúng mốc chính xác nửa patience là KHÔNG bị trừ.
 *   clamp(5 − missed.length − (waitedMinutes > patience/2 ? 1 : 0), 1, 5)
 */
export function reviewStars(missCount: number, waitedMinutes: number, patience: number): number {
  return Math.max(1, Math.min(5, 5 - missCount - (waitedMinutes > patience / 2 ? 1 : 0)));
}

export type State =
  | 'walkBy' | 'toShop' | 'shopping' | 'toQueue' | 'queued'
  // GĐ1491 — ăn tại chỗ: đi tới ghế ('toSeat') rồi ngồi ăn ('dining') sau khi đã trả tiền
  | 'toSeat' | 'dining'
  | 'leaving';

const pick = <T,>(list: T[]) => list[Math.floor(simRng()() * list.length)];

/** Chuyện ở quầy đã chốt: choice là phương án được chọn (0 = phương án đầu). */
export interface Deal { kind: 'none' | 'credit' | 'installment' | 'haggle' | 'change' | 'pricematch'; amount: number; choice: number; /** GĐ1253 — deal do thu ngân trực chốt: settle rút dòng riêng cashierRng (không dịch chuỗi kinh tế chính). */ cashier?: boolean }

export class Customer extends Walker {
  state: State = 'walkBy';
  wants: string[] = [];
  basket: CartItem[] = [];
  missing = 0;
  /** Món không mua được và lý do, để khách nhận xét. */
  missed: { id: string; why: ReviewReason }[] = [];
  waitedMinutes = 0;
  exitX: number;
  /** Quầy đang xếp hàng. */
  counterKey: string | null = null;
  /** Khách quen (null = khách vãng lai). */
  regular: RegularDef | null;
  patience: number;
  /** Nhân với độ nhạy giá của món. */
  sensitivity: number;
  /** Kẻ trộm: lấy hàng rồi đi thẳng ra cửa, không xếp hàng trả tiền. */
  thief = false;

  /** GĐ-B — khách GIỎ LỚN (ngành "Khu tự chọn"): mua nhiều món, thiếu ≥2 món thì bỏ cả giỏ. */
  bigBasket = false;

  /** Nghề của khách vãng lai (null = dân thường hoặc khách quen). */
  profession: ProfessionDef | null;
  /** Người bán rong ghé lấy sỉ: tới quầy đưa đề nghị rồi chờ chủ tiệm trả lời. */
  wholesale = false;
  /** Đã đưa đề nghị lấy sỉ, đang đứng chờ. */
  offered = false;
  /** Chuyện ở quầy lúc tính tiền (xin ghi sổ, mặc cả, thiếu lẻ): 'waiting' = đang chờ chủ tiệm chọn. */
  deal?: Deal | 'waiting';
  /** Khách tới dùng dịch vụ ở quầy (nạp tiền, thu hộ): tiền lời của lượt này. */
  service?: { def: ServiceDef; amount: number; fee: number };
  /** GĐ1491 — chỗ ngồi ăn tại chỗ đang giữ (null/undefined = không ăn tại chỗ). */
  seat?: { tableUid: number; chairUid: number };
  /** GĐ1492 — số giây game đã đứng chờ ghế trống (mất kiên nhẫn → tip nửa, quá mốc thì bỏ về). */
  diningWait = 0;

  constructor(startX: number, regular: RegularDef | null = null, profession: ProfessionDef | null = null) {
    const look = regular?.look;
    super(
      regular ? regular.color : new THREE.Color().setHSL(simRng()(), 0.5, 0.5),
      look?.hat ? regular!.hatColor : undefined,
      'customer',
      look?.archetype ?? profession?.archetype,
      // Khách quen có diện mạo riêng; khách nghề dùng biến thể màu/đạo cụ nếu nghề đó dùng chung archetype
      regular?.look
        ? { topColor: regular.color, hairStyle: look!.hairStyle, hairColor: look!.hair, props: look!.props, hasGlasses: look!.glasses }
        : profession ? PROFESSION_LOOK[profession.id] : undefined,
    );
    this.regular = regular;
    this.profession = profession;
    this.patience = regular?.patienceMinutes ?? PATIENCE_MINUTES * (profession?.patience ?? 1);
    this.sensitivity = regular?.priceSensitivity ?? profession?.sensitivity ?? 1;
    this.exitX = -startX;
    this.mesh.position.set(startX, 0, SIDEWALK_Z + (simRng()() - 0.5) * 1.2);
  }

  pushCart() {
    const cart = createCart();
    cart.position.z = 0.55;
    this.mesh.add(cart);
  }
}
