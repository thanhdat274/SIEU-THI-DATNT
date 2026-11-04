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

export type State = 'walkBy' | 'toShop' | 'shopping' | 'toQueue' | 'queued' | 'leaving';

const pick = <T,>(list: T[]) => list[Math.floor(simRng()() * list.length)];

/** Chuyện ở quầy đã chốt: choice là phương án được chọn (0 = phương án đầu). */
export interface Deal { kind: 'none' | 'credit' | 'installment' | 'haggle' | 'change' | 'pricematch'; amount: number; choice: number }

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
