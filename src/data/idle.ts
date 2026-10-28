/**
 * Engine gợi ý "việc nên làm lúc vắng khách".
 * Giờ vắng khách là các khung có band traffic < 0.8 trong TIME_BANDS (data/rhythm): giữa buổi
 * (8:30–11:00) và buổi chiều (13:00–17:00). idleTip() duyệt các việc đáng làm theo thứ tự ưu tiên
 * cố định và trả việc đáng làm nhất; hoàn toàn xác định (không Math.random) — cùng state luôn ra
 * cùng gợi ý. Hầu như không bao giờ trả null trong giờ vắng: hết việc đáng làm thì trả gợi ý dịu
 * mặc định (xem sổ đầu ngày).
 */
import type { GameState } from '../core/gameTypes';
import { timeBandAt } from './rhythm';
import { warehouseTier } from './warehouse';
import { casesFor } from './products';
import { ANIMALS, ANIMAL_ORDER, EGG_PER_TRAY, GARDEN_UNLOCK, plotReady } from './garden';
import { SOCIAL_UNLOCK } from './social';
import { FEATURES } from './levels';

/** Một gợi ý việc nên làm lúc vắng khách. */
export interface IdleTip {
  icon: string;
  /** Tiếng Việt, ngắn (≤ 60 ký tự), bắt đầu bằng bối cảnh, ví dụ "🍃 Vắng khách — …". */
  text: string;
  act: 'planogram' | 'order' | 'garden' | 'mop' | 'cook' | 'online' | 'prices' | 'social' | 'morning' | null;
}

/** Mở đầu mọi gợi ý: nêu bối cảnh vắng khách. */
const LEAD = '🍃 Vắng khách — ';

/** Giờ vắng khách: band traffic < 0.8 — giữa buổi (8:30–11:00) và buổi chiều (13:00–17:00).
 *  Ngoài mọi band (trước 6h, sau 22h) và giờ đông (traffic ≥ 0.8) thì không tính là vắng. */
export const isSlowHour = (minutes: number): boolean => {
  const band = timeBandAt(minutes);
  return !!band && band.traffic < 0.8;
};

/** Số ô kệ/tủ đang trống (chưa gán món hoặc hết hàng) — cùng cách đếm với badge "trống" ở HUD. */
const emptySlotCount = (s: GameState) =>
  s.furniture.reduce((n, f) => n + f.tiers.filter((t) => !t.productId || t.count === 0).length, 0);

/** Số thùng kho đang chiếm (tính như storageUsed trong core/gameTypes, tự tính để khỏi kéo core vào). */
const storageCases = (s: GameState) =>
  Object.entries(s.storage).reduce((n, [id, q]) => n + (q > 0 ? casesFor(id, q) : 0), 0);

/** Việc trại đáng làm nhất — tái dùng điều kiện của gardenBadge (ui/Hud.tsx): heo đủ ngày xuất
 *  chuồng → trứng/sữa chờ gom → luống chín → hết cám → vườn khô; chỉ khi trại đã mở (cấp 8). */
const gardenTip = (s: GameState): IdleTip | null => {
  if (s.level < GARDEN_UNLOCK) return null;
  for (const kind of ANIMAL_ORDER) {
    const pen = s.garden.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    // Heo đủ ngày vỗ béo thì xuất chuồng (giữ đúng gardenBadge: chỉ nhắc heo)
    if (kind === 'pig' && (pen.fattened ?? 0) >= (def.fattenDays ?? 0))
      return { icon: '🐖', text: `${LEAD}heo đủ ngày vỗ béo, ra trại xuất chuồng`, act: 'garden' };
    // Bò/dê cho sữa đều đặn mỗi ngày — đủ 1 lốc là đáng ghé trại
    if (def.outputPerDay !== undefined && pen.pending >= 1)
      return { icon: '🥛', text: `${LEAD}sữa chờ vắt, ghé trại gom lốc về kho`, act: 'garden' };
    // Gà/vịt/ngỗng đẻ rời rạc — đủ một vỉ (10 quả) mới đáng gom
    if (def.layChance !== undefined && pen.pending >= EGG_PER_TRAY)
      return { icon: '🥚', text: `${LEAD}trứng đủ vỉ chờ thu, ghé trại gom về kho`, act: 'garden' };
  }
  if (s.garden.plots.some(plotReady))
    return { icon: '🧺', text: `${LEAD}luống đã chín, ra trại thu hoạch`, act: 'garden' };
  const outOfFeed = ANIMAL_ORDER.some((kind) => {
    const pen = s.garden.pens[kind];
    if (!pen?.count || pen.fedDay === s.day) return false;
    const def = ANIMALS[kind];
    return pen.feedKg < pen.count * def.feedKgPerDay && (s.storage[def.feedProduct] ?? 0) === 0;
  });
  if (outOfFeed)
    return { icon: '🌽', text: `${LEAD}chuồng hết cám, bổ sung cám cho vật nuôi`, act: 'garden' };
  // Mưa/giông tưới hộ cả vườn nên không cần nhắc tưới
  const dry = s.weather !== 'rain' && s.weather !== 'storm' && s.garden.plots.some((p) => p.crop && p.wateredDay !== s.day);
  if (dry)
    return { icon: '💧', text: `${LEAD}vườn đang khô, tưới luống cho cây lớn nhanh`, act: 'garden' };
  return null;
};

/** Gợi ý ưu tiên cao nhất theo state; null khi state bất thường (thực tế luôn có mục 9 thay null).
 *  Duyệt theo thứ tự cố định, không random — gọi bao nhiêu lần cũng ra một kết quả. */
export const idleTip = (s: GameState): IdleTip | null => {
  // 1. Bày hàng: còn ô kệ trống mà kho còn hàng bày được
  const empty = emptySlotCount(s);
  if (empty > 0 && Object.values(s.storage).some((q) => q > 0))
    return { icon: '🗺️', text: `${LEAD}${empty} ô kệ trống, bày hàng từ kho vào`, act: 'planogram' };
  // 2. Nhập hàng: kho chiếm dưới 25% sức chứa theo cấp nhà kho
  const used = storageCases(s);
  const cap = warehouseTier(s.warehouseTier).cases;
  if (used * 4 < cap)
    return { icon: '📦', text: `${LEAD}kho còn ${used}/${cap} thùng, nhập hàng bổ sung`, act: 'order' };
  // 3. Trang trại: luống chín, trứng/sữa chờ lấy, heo xuất chuồng, hết cám, chưa tưới
  const garden = gardenTip(s);
  if (garden) return garden;
  // 4. Lau nhà: sàn bẩn đáng kể thì khách ngại vào
  if (s.dirt >= 30)
    return { icon: '🧹', text: `${LEAD}sàn bẩn (${Math.round(s.dirt)}/100), lau qua một lượt`, act: 'mop' };
  // 5. Mẻ nấu xong: CookJob không có cờ done riêng — mẻ xong (remaining ≤ 0) được tick bơm thẳng
  //    vào kho rồi gỡ khỏi cookJobs, nên "nấu xong chờ lấy" chỉ còn thấy khi game đang tạm dừng.
  if (s.cookJobs.some((j) => j.remaining <= 0))
    return { icon: '🍲', text: `${LEAD}mẻ nấu xong rồi, thu thành phẩm vào kho`, act: 'cook' };
  // 6. Đơn app chờ nhận: status 'new' — bỏ không thì app tự huỷ sau ACCEPT_WINDOW phút
  const newOrders = s.online.orders.filter((o) => o.status === 'new').length;
  if (newOrders > 0)
    return { icon: '🛵', text: `${LEAD}${newOrders} đơn app chờ nhận, vào bảng nhận`, act: 'online' };
  // 7. Đặt giờ vàng: happyHour là cài đặt cả ván (null = chưa đặt/tắt); đặt được trong bảng
  //    Giá bán (PricePanel) mở cùng FEATURES.prices (cấp 3)
  if (!s.happyHour && s.level >= FEATURES.prices)
    return { icon: '⏰', text: `${LEAD}chưa đặt giờ vàng, đặt khung giảm giá`, act: 'prices' };
  // 8. Đăng bài xã hội: "đã đăng hôm nay" đọc social.promoDay (ngày đăng bài quảng bá gần nhất);
  //    stats.socialPosts là bộ đếm mọi bài trong ngày (kể cả xin lỗi) nên không dùng ở đây
  if (s.level >= SOCIAL_UNLOCK && s.social.promoDay !== s.day)
    return { icon: '📱', text: `${LEAD}chưa đăng bài hôm nay, quảng bá tiệm`, act: 'social' };
  // 9. Mặc định dịu: tới được đây là tiệm đã gọn gàng — hợp lúc xem lại sổ đầu ngày
  return { icon: '📋', text: `${LEAD}hợp lúc xem lại sổ đầu ngày`, act: 'morning' };
};
