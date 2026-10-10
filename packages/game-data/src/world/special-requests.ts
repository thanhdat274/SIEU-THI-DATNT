/**
 * Yêu cầu đặc biệt của khách VIP (OpenSpec mở rộng — tính năng đề xuất #2, PHẦN THUẦN / PROVISIONAL).
 *
 * Khác với `party-orders` (đơn tiệc kéo dài nhiều ngày trên bảng), "yêu cầu đặc biệt" là một lời nhờ
 * NGẮN, có giới hạn thời gian tính theo PHÚT trong game, từ một khách VIP đang có mặt: họ nhờ một tổ hợp
 * món cụ thể (vd "gói quà 3-mi-hao-hao + 2-sua-ong-tho, 6 phút") phải được phục vụ đúng hạn. Xong đúng →
 * thưởng tiền boa + uy tín + thân thiết khách quen; bỏ qua / hết hạn → nguy cơ mất uy tín (VIP bực bội
 * "vexed") hoặc bỏ về.
 *
 * PHẠM VI (thuần, an toàn — kiểm chứng được trong sandbox): chỉ CATALOG dữ liệu + kiểm chứng nhất quán.
 * KHÔNG tự nối vào luồng khách có sẵn (`customers.ts`/`simulation.ts`) hay ghi lên save/UI — phần đó ghi
 * rõ CHỜ MÁY THẬT (xem `tổng hợp.md`).
 *
 * CÁC template PROVISIONAL — cần playtest thật để chốt (tần suất, thời hạn, phần thưởng, phạt).
 */
import { nullProto } from '../safe-map';

/** Một món trong yêu cầu: sản phẩm/món có thật trong catalog (id theo `@game/data`). */
export interface SpecialRequestItem {
  productId: string;
  quantity: number;
}

/** Hạng khách đưa ra yêu cầu — ảnh hưởng mức thưởng/phạt. */
export type SpecialRequestTier = 'regular' | 'vip' | 'regular_vip';

/** Định nghĩa một mẫu yêu cầu đặc biệt. */
export interface SpecialRequestDef {
  /** id chuẩn dùng trong `SPECIAL_REQUEST_MAP`. */
  id: string;
  /** tên hiển thị (UI — sau này). */
  title: string;
  /** tiêu đề khách nhờ (ngắn, tiếng Việt). */
  request: string;
  /** hạng khách. */
  tier: SpecialRequestTier;
  /** tổ hợp món cần phục vụ (món có thật trong catalog). */
  requiredItems: SpecialRequestItem[];
  /** cửa sổ thời gian (phút game) để hoàn thành kể từ khi mở. */
  timeWindowMinutes: number;
  /** thưởng tiền (VND) khi hoàn thành đúng hạn. */
  rewardMoney: number;
  /** thưởng uy tín khi hoàn thành đúng hạn. */
  rewardReputation: number;
  /** phạt uy tín nếu VIP bực bội vì bị bỏ qua/hết hạn (tier chứa 'vip'). */
  penaltyReputation: number;
  /** cấp người chơi tối thiểu để yêu cầu này xuất hiện. */
  minPlayerLevel: number;
}

/** Ngưỡng cấp nhà bán lẻ để kích hoạt tính năng (provisional). */
export const SPECIAL_REQUEST_UNLOCK_LEVEL = 5;

/** Số yêu cầu đồng thời tối đa có thể mở trên sàn (provisional). */
export const MAX_CONCURRENT_SPECIAL_REQUESTS = 2;

/** Số yêu cầu tối đa mở trong một ngày game (provisional). */
export const MAX_SPECIAL_REQUESTS_PER_DAY = 3;

/** Catalog yêu cầu đặc biệt (PROVISIONAL — tham chiếu món có thật). */
export const SPECIAL_REQUESTS: readonly SpecialRequestDef[] = [
  {
    id: 'sr_qua_tang_ho_hao',
    title: 'Gói quà mì gói',
    request: 'Cô làm gói quà 3 mì Hảo Hảo + 2 sữa Ông Thọ, đóng gói nhanh giúp tui với.',
    tier: 'regular',
    requiredItems: [
      { productId: 'mi_hao_hao', quantity: 3 },
      { productId: 'sua_ong_tho', quantity: 2 },
    ],
    timeWindowMinutes: 6,
    rewardMoney: 4000,
    rewardReputation: 4,
    penaltyReputation: 0,
    minPlayerLevel: 5,
  },
  {
    id: 'sr_tiec_kem_trai_cay',
    title: 'Tiệc kem trái cây',
    request: 'Khách hàng thân thiết nhờ 2 kem trái cây + 1 trà đào cam sả cho bàn, gấp lắm.',
    tier: 'vip',
    requiredItems: [
      { productId: 'kem_trai_cay_tp', quantity: 2 },
      { productId: 'tra_dao_cam_sa_tp', quantity: 1 },
    ],
    timeWindowMinutes: 8,
    rewardMoney: 12000,
    rewardReputation: 10,
    penaltyReputation: 6,
    minPlayerLevel: 10,
  },
  {
    id: 'sr_bep_banh_mi',
    title: 'Bột bánh mì gấp',
    request: 'Ông chủ quán nhờ 2 bột mì + 1 trứng gà kịp giờ lò bánh, làm ơn.',
    tier: 'regular',
    requiredItems: [
      { productId: 'bot_mi', quantity: 2 },
      { productId: 'trung_ga', quantity: 1 },
    ],
    timeWindowMinutes: 5,
    rewardMoney: 6000,
    rewardReputation: 5,
    penaltyReputation: 0,
    minPlayerLevel: 8,
  },
  {
    id: 'sr_tra_dao_xa_xi',
    title: 'Trà đào + Xá xị mát',
    request: 'Chị ơi cho em 2 trà đào cam sả + 1 xá xị Chương Dương, bạn em sắp tới.',
    tier: 'vip',
    requiredItems: [
      { productId: 'tra_dao_cam_sa_tp', quantity: 2 },
      { productId: 'xa_xi_chuong_duong', quantity: 1 },
    ],
    timeWindowMinutes: 7,
    rewardMoney: 10000,
    rewardReputation: 8,
    penaltyReputation: 5,
    minPlayerLevel: 12,
  },
];

export const SPECIAL_REQUEST_MAP: Record<string, SpecialRequestDef> = nullProto(
  Object.fromEntries(SPECIAL_REQUESTS.map((def) => [def.id, def]))
);

/**
 * Kiểm chứng nhất quán catalog (thuần): id duy nhất, requiredItems đủ + số lượng dương, thời hạn/1≤
 * cửa sổ dương, reward/phạt không âm, minPlayerLevel ≥ 1. Trả danh sách lỗi (rỗng = hợp lệ).
 */
export function validateSpecialRequests(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const def of SPECIAL_REQUESTS) {
    if (seen.has(def.id)) errors.push(`Trùng id '${def.id}'`);
    seen.add(def.id);
    if (def.requiredItems.length === 0) errors.push(`'${def.id}' không có món yêu cầu`);
    if (def.requiredItems.some((i) => !i.productId || !(Number.isSafeInteger(i.quantity) && i.quantity >= 1))) {
      errors.push(`'${def.id}' có món thiếu id / số lượng không hợp lệ`);
    }
    if (!(Number.isSafeInteger(def.timeWindowMinutes) && def.timeWindowMinutes >= 1)) {
      errors.push(`'${def.id}' cửa sổ thời gian không hợp lệ`);
    }
    if (def.rewardMoney < 0 || def.rewardReputation < 0 || def.minPlayerLevel < 1) {
      errors.push(`'${def.id}' có giá trị thưởng/cấp không hợp lệ`);
    }
  }
  return errors;
}
