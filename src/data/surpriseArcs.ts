// ============================================================================
// Data: "Sự kiện bất ngờ" thành chuyện kể — mini-arc 2–3 ngày (GĐ164)
// ----------------------------------------------------------------------------
// Audit trải nghiệm 28/10: hệ sự kiện bất ngờ (SURPRISES, core/biz.ts
// maybeSurprise) mật độ ổn nhưng MỖI LẦN LÀ MỘT PHÁT quay số — không kéo dài
// thành chuyện kể. GĐ164 thay 4 def một-phát (mua_roi · bong_da_kinh · mua_dai ·
// livestream) bằng 4 arc 2–3 ngày: mỗi ngày 1 cảnh, hệ quả hôm qua hiện trong
// văn cảnh hôm nay, chọn ấm (good) cộng thưởng cuối. Pattern nhịp theo GĐ80
// (regularArc: def thuần + state khép khi quá hạn, hết hạn không phạt) nhưng
// KHÔNG dùng biz.regularArcs (vòng khép cuối ngày của hệ đó xoá entry lạ, nhịp
// tiến khác hẳn) — arc có state riêng `biz.surpriseArc`, MỘT slot duy nhất.
//
// File này THUẦN dữ liệu + helper thuần (không import store). `EventChoice`
// mượn type-only từ biz.ts — xoá sạch khi compile, không tạo vòng import.
// ============================================================================

import type { EventChoice } from './biz';
import { productById } from './products';
import { SURPRISES } from './biz';

/** Trạng thái arc sự kiện đang/đã chạy trong ván (lưu trong BizState, một slot). */
export interface SurpriseArcState {
  arcId: string;
  /** Số cảnh đã chốt (bằng choices.length — giữ cho dễ đọc ở UI/log). */
  step: number;
  /** Lựa chọn (index option) đã chốt cho từng cảnh, theo đúng thứ tự cảnh. */
  choices: number[];
  /** Ngày phát cảnh đầu (arc mở). */
  startedDay: number;
  /** Ngày cuối cảnh vẫn có thể phát (startedDay + days − 1); quá hạn → khép nhẹ. */
  expiresDay: number;
  /** Đã khép (trả thưởng xong / chọn nhánh khép sớm / để dở quá hạn) — không phát nữa. */
  done?: boolean;
}

/** Thưởng của CẢNH CUỐI: tiền = base + perLevel × cấp + perGood × số lựa chọn ấm cả arc. */
export interface ArcReward {
  base: number;
  perLevel: number;
  perGood: number;
  /** Đánh giá 5★ tặng kèm khi khép (như def một-phát cũ: rating 5 = 1 review 5★). */
  rating?: number;
  xp?: number;
}

/** Một cảnh trong arc: phát đúng MỘT ngày, chốt bằng 1 lựa chọn. */
export interface Scene {
  id: string;
  text: string;
  /** Gợi ý ngắn một mệnh đề cho tin sáng (endDay) — để lời kể không lặp nguyên câu. */
  teaser?: string;
  options: EventChoice[];
  /** Có → cảnh CUỐI: chốt là trả thưởng và arc done. */
  reward?: ArcReward;
  /** Chỉ số scene kế tiếp trong def.scenes theo lựa chọn (index trong options);
   *  −1 = nhánh khép NGAY không thưởng ("khép sớm"); thiếu = hết cảnh, arc khép. */
  nextByChoice?: number[];
}

export interface SurpriseArcDef {
  id: string;
  /** Id def một-phát cũ mà arc này thay thế (pool lọc id này khi arc đang chiếm slot). */
  baseEventId: string;
  title: string;
  icon: string;
  unlock: number;
  /** Số ngày tối đa (mỗi ngày 1 cảnh); expiry = startedDay + days − 1. */
  days: number;
  scenes: Scene[];
}

/** GĐ559: nội dung ở surpriseArcsData.ts (nạp lười cùng loadStories); rỗng tới khi nạp xong — mọi chỗ đọc chịu được không tìm thấy. */
export let SURPRISE_ARCS: SurpriseArcDef[] = [];
export const setSurpriseArcs = (arcs: SurpriseArcDef[]) => { SURPRISE_ARCS = arcs; };

export const surpriseArcById = (id: string) => SURPRISE_ARCS.find((a) => a.id === id);
/** Arc thay thế cho def một-phát id này (core dùng khi pool trúng để mở arc thay vì một-phát). */
export const arcForEvent = (baseEventId: string) => SURPRISE_ARCS.find((a) => a.baseEventId === baseEventId);

// ───── Giờ phát cảnh arc trong ngày (tất định, không RNG runtime) ─────

/** Salt riêng của GĐ164 cho hàm hash roll (cùng kiểu phoneOrders/calendar). */
const ARC_SALT = 0x164;
function roll(seed: number, day: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ (day * 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Giờ phát cảnh arc hôm nay: 10h–11h30, tất định theo seed ván + ngày (cùng một ngày luôn cùng giờ). */
export function arcSceneAt(seed: number, day: number): number {
  return 10 * 60 + Math.floor(roll(seed, day, ARC_SALT) * 90);
}

// ───── Đi theo đường choices: cảnh hiện tại + đếm "ấm" ─────

/**
 * Cảnh ĐANG CHỜ của arc theo những lựa chọn đã ghi: đi từ scenes[0], mỗi lựa chọn
 * rẽ theo nextByChoice (thiếu mảng → hết cảnh). Hết nhánh / choice lạ (save lệch) → null.
 * Thuần, không state — gọi bao nhiêu lần cùng kết quả.
 */
export function sceneFor(def: SurpriseArcDef, state: Pick<SurpriseArcState, 'choices'>): Scene | null {
  let cur: Scene | undefined = def.scenes[0];
  for (const c of state.choices) {
    if (!cur) return null;
    const next: number | undefined = cur.nextByChoice ? cur.nextByChoice[c] : undefined;
    if (next === undefined || next < 0 || !def.scenes[next]) return null;
    cur = def.scenes[next];
  }
  return cur ?? null;
}

/** Số lựa chọn "ấm" (good) đã chốt trên đường đã đi — cộng vào thưởng cuối của arc. */
export function arcGoodCount(def: SurpriseArcDef, state: Pick<SurpriseArcState, 'choices'>): number {
  let n = 0;
  let cur: Scene | undefined = def.scenes[0];
  for (const c of state.choices) {
    if (!cur) break;
    if (cur.options[c]?.good) n++;
    const next: number | undefined = cur.nextByChoice ? cur.nextByChoice[c] : undefined;
    if (next === undefined || next < 0 || !def.scenes[next]) break;
    cur = def.scenes[next];
  }
  return n;
}

/** Thưởng cảnh cuối (tiền phụ cấp theo cấp + lựa chọn ấm, kèm rating/xp tặng nếu def có). */
export function arcReward(scene: Scene, goodCount: number, level: number): { money: number; rating?: number; xp?: number } {
  const r = scene.reward;
  if (!r) return { money: 0 };
  return { money: r.base + r.perLevel * level + r.perGood * goodCount, rating: r.rating, xp: r.xp };
}

/** Cảnh của arc CHƯA chốt cho ngày `day` chưa: arc còn dở, trong hạn, và số cảnh đã chốt
 *  chưa vượt số ngày đã trôi (cảnh hôm nay — hoặc hôm trước bị lỡ — vẫn chờ). */
export function arcScenePending(st: SurpriseArcState, day: number): boolean {
  if (st.done || day < st.startedDay || day > st.expiresDay) return false;
  return st.choices.length <= day - st.startedDay;
}

// ───── findSurprise: tra arc TRƯỚC rồi mới tới SURPRISES (dùng bởi UI + core) ─────

/** Mặt hiển thị chung cho alert: cả arc lẫn một-phát đều có đủ icon/title/text/choices. */
export type SurpriseView =
  | { kind: 'one'; id: string; icon: string; title: string; text: string; choices: EventChoice[] }
  | { kind: 'arc'; id: string; icon: string; title: string; text: string; choices: EventChoice[]; arc: SurpriseArcDef; scene: Scene };

/**
 * Tra sự kiện đang hiện theo id lưu trong `biz.surprise.id`: id của ARC tra trước
 * (cảnh hiện tại resolve theo `choices` đã chốt), không thấy mới tới pool SURPRISES.
 * `choices` chỉ dùng cho arc — truyền `biz.surpriseArc?.choices` từ store.
 */
export function findSurprise(id: string, choices: number[] = []): SurpriseView | null {
  const arc = surpriseArcById(id);
  if (arc) {
    const scene = sceneFor(arc, { choices });
    if (!scene) return null;
    return { kind: 'arc', id, icon: arc.icon, title: arc.title, text: scene.text, choices: scene.options, arc, scene };
  }
  const ev = SURPRISES.find((e) => e.id === id);
  if (!ev) return null;
  return { kind: 'one', id, icon: ev.icon, title: ev.title, text: ev.text, choices: ev.choices };
}

/** Tên ngắn của món cho cảnh báo "kho hết {món} rồi". */
export const needStockLabel = (need: { productId: string; qty: number }) =>
  `${productById(need.productId).name} (cần ${need.qty})`;
