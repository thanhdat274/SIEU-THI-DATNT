// ============================================================================
// Data: Dải "Kế hoạch hôm nay" (GĐ162)
// ----------------------------------------------------------------------------
// Audit trải nghiệm 28/10: giữa game các mốc hẹn giờ nằm RẢI ở 6+ bảng (Sổ đầu
// ngày, Khách quen, Đơn online, Hợp đồng, Sổ nấu, Lịch) — người chơi không có
// MỘT bề mặt nào cho thấy lịch hẹn của hôm nay theo thứ tự thời gian.
// Nguyên lý Stardew ("bảng việc-ngày tự nhìn được") + My Happy Town (đơn hẹn giờ).
// Tất cả nguyên liệu đã có từ các hệ GĐ trước — file này chỉ GHÉP, thuần đọc
// 100%: không đổi bất kỳ slice/state nào, không SAVE_VERSION, không RNG mới
// (mọi nguồn đều deterministic theo seed/ngày đã có sẵn). GĐ163 thêm nguồn thứ
// 7: bước nhờ của khách quen đang chờ (cửa sổ "tiện làm" theo khung vắng).
// GĐ164 thêm nguồn thứ 8: chuyện sự kiện bất ngờ đang kể dở (arc GĐ164).
//
// Mỗi nguồn là một helper riêng, nhận TỪNG tham số cụ thể (không nhận cả
// GameState) để dễ test; `todayAgenda` ghép lại, lọc cái đã qua giờ và sắp
// tăng dần theo phút trong ngày.
// ============================================================================

import { REGULARS, regularById, visitsToday, type RegularProgress, type Reservation } from './regulars';
import type { Reputation } from './reputation';
import { productById } from './products';
import { goldenHourBands } from './rhythm';
import { fmtHour, pickEveningPrep } from './cookSchedule';
import { ANSWER_MINUTES, PHONE_SLOTS, PHONE_UNLOCK } from './phoneOrders';
import { RECIPE_MAP } from './recipes';
import { kitchenValue } from './kitchenValue';
import { supplyContractById } from './contracts';
import { partyOrderById } from './orders';
import type { ActiveOrder } from './orders';
import { errandWindow, pendingErrands, type RegularArcState } from './regularArc';
import { arcScenePending, surpriseArcById, type SurpriseArcState } from './surpriseArcs';
import type { ContractState, CookJob } from '../core/gameTypes';

/** Bảng mở được khi bấm chip — tập con các Panel['type'] có thật (gameTypes.ts). */
export type AgendaPanel = 'regulars' | 'morning' | 'cook' | 'contracts' | 'quests';

/** Một "chip hẹn" trên dải Kế hoạch hôm nay. */
export interface AgendaItem {
  key: string;
  /** Mốc hẹn (phút trong ngày) — dùng để sắp xếp và hiển thị giờ trên chip. */
  atMinutes: number;
  /** Hết giờ còn hiệu lực: qua mốc này chip bị lọc (điểm hẹn đơn lẻ = at + 30). */
  untilMinutes: number;
  icon: string;
  /** Chữ ngắn trên chip, có sẵn giờ ở đầu (vd "14h Bà Tư ghé"). */
  label: string;
  /** Bảng mở khi bấm chip. */
  panel: AgendaPanel;
}

// ───── 1. Khách quen ghé hôm nay (+ lời hẹn giữ món đúng ngày) ─────

/** Tên món ngắn cho chip: bỏ ghi chú lượng pack cuối ("Gạo (túi 5kg)" → "Gạo"). */
const shortProduct = (id: string) => productById(id).name.replace(/\s*\([^)]*\)\s*$/, '');

/** Chip khách quen ghé trong khung `visitFrom–visitUntil` của từng người.
 *  Nếu người đó có lời hẹn giữ món ĐÚNG hôm nay thì chip thành "ghé lấy {món}"
 *  (lời hẹn chỉ chốt được khi khách ghé và món đang bày trên kệ — slices/regulars.ts). */
export function regularVisitAgenda(args: {
  day: number;
  seed: number;
  level: number;
  regulars: Record<string, RegularProgress>;
  rep?: Reputation;
  reservations?: Record<string, Reservation>;
}): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const def of REGULARS) {
    if (!visitsToday(def, args.day, args.seed, args.level, args.regulars[def.id], args.rep)) continue;
    const res = args.reservations?.[def.id];
    const pickup = res && res.day === args.day ? shortProduct(res.productId) : null;
    out.push({
      key: `visit-${def.id}`,
      atMinutes: def.visitFrom,
      untilMinutes: def.visitUntil,
      icon: pickup ? '🤝' : '👋',
      label: `${fmtHour(def.visitFrom)} ${def.name} ${pickup ? `lấy ${pickup}` : 'ghé'}`,
      panel: 'regulars',
    });
  }
  return out;
}

// ───── 2. Giờ vàng còn lại trong ngày ─────

/** Chip "HHh Giờ vàng" cho từng khung đông (traffic ≥ 1.35: sáng/trưa/tối) CHƯA qua.
 *  Đang trong khung thì chip vẫn hiện (còn thời gian bày kệ đón khách). */
export function goldenHourAgenda(minutes: number): AgendaItem[] {
  return goldenHourBands()
    .filter((b) => minutes < b.to)
    .map((b) => ({
      key: `golden-${b.id}`,
      atMinutes: b.from,
      untilMinutes: b.to,
      icon: '⭐',
      label: `${fmtHour(b.from)} Giờ vàng`,
      panel: 'morning' as const,
    }));
}

// ───── 3. Sổ nấu: mẻ đang chạy / mẻ nên bắt đầu kịp giờ vàng tối (GĐ161) ─────

/** Mẻ đang chạy ở trạm: chip "HHh {món} xong" (thời điểm xong = bây giờ + còn lại), sắp theo lúc xong. */
export function runningCookAgenda(minutes: number, jobs: CookJob[]): AgendaItem[] {
  return jobs.flatMap((j) => {
    const r = RECIPE_MAP[j.recipeId];
    if (!r) return [];
    const done = minutes + j.remaining;
    return [{
      key: `cookjob-${j.id}`,
      atMinutes: done,
      untilMinutes: done + 45,
      icon: '🍳',
      label: `${fmtHour(done)} ${r.name} xong`,
      panel: 'cook' as const,
    }];
  }).sort((a, b) => a.atMinutes - b.atMinutes);
}

/** Chưa có mẻ nào chạy: gợi ý bắt đầu mẻ dài nhất vẫn kịp giờ vàng tối 17h
 *  (tái dùng `pickEveningPrep` GĐ161 — mốc bắt đầu muộn nhất còn đúng sự thật).
 *  `stations` là các LOẠI nội thất hiện có trong tiệm; `cookSpeedMul`/`bartenderBoost`
 *  cùng nguồn với tick đồng hồ (slices/orders.ts) để phút trạm là phút thật. */
export function eveningPrepAgenda(args: {
  minutes: number;
  level: number;
  stations: string[];
  storage: Record<string, number>;
  cookSpeedMul: number;
  bartenderBoost: number;
  /** Số mẻ đang chạy: đã bắt đầu rồi thì không gợi ý nữa. */
  cookJobsCount: number;
}): AgendaItem[] {
  if (args.cookJobsCount > 0 || args.minutes >= 17 * 60) return [];
  const cands = Object.values(RECIPE_MAP)
    .filter((r) => !r.festival && args.level >= r.unlock
      && args.stations.includes(r.station)
      && r.inputs.every((i) => (args.storage[i.productId] ?? 0) >= i.quantity))
    .map((r) => ({
      id: r.id,
      name: r.name,
      durationMin: Math.ceil(r.durationMin / (args.cookSpeedMul * (r.station === 'drink_counter' ? args.bartenderBoost : 1))),
      perMinute: kitchenValue(r).perMinute,
    }));
  const pick = pickEveningPrep(cands, args.minutes);
  if (!pick) return [];
  const name = pick.name ?? RECIPE_MAP[pick.id]?.name ?? pick.id;
  return [{
    key: 'cook-prep',
    atMinutes: pick.startBy,
    untilMinutes: 17 * 60,
    icon: '🍳',
    label: `trước 17h Nấu ${name}`,
    panel: 'cook',
  }];
}

// ───── 4. Khe điện thoại còn lại hôm nay ─────

/** Chip "HHh Điện thoại" cho từng khe giờ hàng xóm gọi CHƯA tới. Chỉ khi đã mở
 *  điện thoại (cấp 3) và CÓ nhân viên giao hàng — không có người giao thì không
 *  bao giờ có cuộc gọi (slices/orders.ts), chip sẽ nói dối. */
export function phoneSlotAgenda(minutes: number, level: number, hasCourier: boolean): AgendaItem[] {
  if (level < PHONE_UNLOCK || !hasCourier) return [];
  return PHONE_SLOTS
    .filter((slot) => minutes <= slot)
    .map((slot, i) => ({
      key: `phone-${i}`,
      atMinutes: slot,
      untilMinutes: slot + ANSWER_MINUTES,
      icon: '📞',
      label: `${fmtHour(slot)} Điện thoại`,
      panel: 'morning' as const,
    }));
}

// ───── 5. Hợp đồng / đơn tiệc hạn giao hôm nay ─────

/** Hợp đồng cung cấp kỳ hạn đúng hôm nay: giao được mọi lúc trong ngày nên chip
 *  hiện CẢ NGÀY (mốc xếp ở 20h — nhắc trước khi khuya, tới 23h mới ẩn). */
export function contractAgenda(day: number, contracts: Record<string, ContractState>): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const cs of Object.values(contracts)) {
    if (cs.dueDay !== day) continue;
    const def = supplyContractById(cs.defId);
    if (!def) continue;
    out.push({
      key: `contract-${cs.defId}`,
      atMinutes: 20 * 60,
      untilMinutes: 23 * 60,
      icon: def.icon,
      label: `Giao ${def.title}`,
      panel: 'contracts',
    });
  }
  return out;
}

/** Đơn tiệc ĐÃ NHẬN và hôm nay là ngày cuối được giao — cùng mốc 20h như hợp đồng. */
export function partyOrderAgenda(day: number, order: ActiveOrder | null | undefined): AgendaItem[] {
  if (!order?.accepted || order.dueDay !== day) return [];
  const def = partyOrderById(order.id);
  if (!def) return [];
  return [{
    key: `party-${order.id}`,
    atMinutes: 20 * 60,
    untilMinutes: 23 * 60,
    icon: def.icon,
    label: `Giao ${def.title}`,
    panel: 'quests',
  }];
}

// ───── 7. Bước nhờ của khách quen đang chờ (GĐ163) ─────

/** Chip "HHh Việc {khách} nhờ" cho bước nhờ vả (GĐ80) đang chờ, đặt ở ĐẦU cửa sổ "tiện làm"
 *  (khung ghé của khách ∩ giờ vắng — errandWindow GĐ163). Chip hiện MỌI NGÀY đợt còn dở (đúng
 *  chữ thiết kế: "hôm nay có cửa sổ nhờ (bước đang chờ)"): cửa sổ là giờ TIỆN trữ hàng chờ
 *  khách, không hứa "khách ghé hôm nay" — ngày khách ghé thật thì chip "👋 {khách} ghé" ở nguồn
 *  1 nói riêng. Đợt chờ thưởng / đã xong / đã quá hạn không chip (pendingErrands lọc sẵn). */
export function errandAgenda(args: {
  day: number;
  arcs?: Record<string, RegularArcState>;
}): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const e of pendingErrands(args.arcs, args.day)) {
    const def = regularById(e.arc.regularId);
    if (!def) continue;
    const w = errandWindow(def);
    out.push({
      key: `errand-${e.regularId}`,
      atMinutes: w.from,
      untilMinutes: w.to,
      icon: '🤝',
      label: `${fmtHour(w.from)} Việc ${def.name} nhờ`,
      panel: 'regulars',
    });
  }
  return out;
}

// ───── 8. Chuyện sự kiện bất ngờ đang kể dở (GĐ164) ─────

/** Chip "📖 {tên chuyện} còn dở" cho arc sự kiện (GĐ164) đang dở mà cảnh hôm nay CHƯA chốt.
 *  Mốc 10h = khung phát cảnh arc (arcSceneAt 10h–11h30), giữ tới 20h = cảnh arc không tự mất.
 *  Cảnh hôm nay đã chọn / đợt đã khép / đã quá hạn → không chip (arcScenePending lọc sẵn). */
export function arcAgenda(args: { day: number; arc?: SurpriseArcState }): AgendaItem[] {
  const st = args.arc;
  if (!st || !arcScenePending(st, args.day)) return [];
  const def = surpriseArcById(st.arcId);
  if (!def) return [];
  return [{
    key: `arc-${st.arcId}`,
    atMinutes: 10 * 60,
    untilMinutes: 20 * 60,
    icon: '📖',
    label: `${def.title} còn dở`,
    panel: 'morning' as const,
  }];
}

// ───── Ghép lại: lọc quá giờ, sắp tăng dần ─────

export interface TodayAgendaArgs {
  /** Phút trong ngày hiện tại (có thể > 1440 sau nửa đêm — mọi mốc đều trong 0–1440 nên tự ẩn). */
  minutes: number;
  day: number;
  seed: number;
  level: number;
  regulars: Record<string, RegularProgress>;
  rep?: Reputation;
  reservations?: Record<string, Reservation>;
  /** Đợt nhờ vả đang chạy/đã xong (biz.regularArcs — GĐ80). */
  regularArcs?: Record<string, RegularArcState>;
  /** Chuyện sự kiện bất ngờ đang kể dở (biz.surpriseArc — GĐ164). */
  surpriseArc?: SurpriseArcState;
  cookJobs?: CookJob[];
  stations?: string[];
  storage?: Record<string, number>;
  cookSpeedMul?: number;
  bartenderBoost?: number;
  hasCourier?: boolean;
  contracts?: Record<string, ContractState>;
  order?: ActiveOrder | null;
}

/** Dải "Kế hoạch hôm nay": ghép 8 nguồn có sẵn, lọc cái đã qua giờ (trừ cái đang
 *  trong khung), sắp tăng dần. Chip ĐẦU TIÊN = việc kế tiếp đang đến hạn/đang trong
 *  khung — UI nhấn mạnh chip đó. 0 hẹn → mảng rỗng (UI ẩn dải, trả slot IdleChip). */
export function todayAgenda(args: TodayAgendaArgs): AgendaItem[] {
  const all: AgendaItem[] = [
    ...regularVisitAgenda(args),
    ...goldenHourAgenda(args.minutes),
    ...runningCookAgenda(args.minutes, args.cookJobs ?? []),
    ...eveningPrepAgenda({
      minutes: args.minutes,
      level: args.level,
      stations: args.stations ?? [],
      storage: args.storage ?? {},
      cookSpeedMul: args.cookSpeedMul ?? 1,
      bartenderBoost: args.bartenderBoost ?? 1,
      cookJobsCount: (args.cookJobs ?? []).length,
    }),
    ...phoneSlotAgenda(args.minutes, args.level, args.hasCourier ?? false),
    ...contractAgenda(args.day, args.contracts ?? {}),
    ...partyOrderAgenda(args.day, args.order),
    ...errandAgenda({ day: args.day, arcs: args.regularArcs }),
    ...arcAgenda({ day: args.day, arc: args.surpriseArc }),
  ];
  return all
    .filter((it) => args.minutes < it.untilMinutes)
    .sort((a, b) => a.atMinutes - b.atMinutes || a.key.localeCompare(b.key));
}
