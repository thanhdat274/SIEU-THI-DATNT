/**
 * Giá trị mỗi Ô KỆ (GĐ226): món đang bày trên kệ có đáng chỗ không?
 *
 * Sức khoẻ món hàng (itemHealthList) và lời/m² kệ (shelfEfficiency) đã xếp hạng theo TỔNG lời,
 * nhưng bỏ qua câu hỏi mà chủ tiệm hỏi mỗi sáng khi bày kệ: "ô kệ này đang bày món X — món X kiếm
 * được bao nhiêu MỖI Ô mỗi ngày?" Một món vẫn có thể lời tổng ổn nhưng bày quá nhiều ô, mỗi ô bán
 * ì ạch — trong khi món bán nhanh khác chỉ có ít ô. Helper này soi GÓC "năng suất ô kệ" để quyết
 * bày bớt / đổi món, khác hẳn profitMix (tập trung lời) và ABC (xếp hạng lời).
 *
 * Định nghĩa (THUẦN ĐỌC, không đổi kinh tế/state):
 *   - profitPerDay = profit30 / 30  (lời trung bình mỗi ngày theo sổ 30 ngày của kệ)
 *   - perSlot      = profitPerDay / onShelf  (lời mỗi ô kệ mỗi ngày, sau khi chia cho số ô món đó
 *     đang chiếm) — cao = ô đang "đẻ" đều; thấp = ô chiếm chỗ ít sinh lời.
 *   - flag 'lose'  = món đang LỖ (profit30 ≤ 0): chiếm chỗ, nên dọn.
 *   - flag 'slow'  = món đang bày ≥ 3 ô nhưng perSlot < ngang nửa món khoẻ nhất trên kệ: ô kém hiệu
 *     suất, nên bày bớt / đổi món bán nhanh hơn.
 * Chỉ đọc ItemHealth + shelfCount — không chạm SAVE_VERSION / persist / sim.
 */
import type { ItemHealth } from './analytics';

export interface SlotHealth {
  id: string;
  name: string;
  /** Số ô (đơn vị) món này đang bày trên toàn bộ kệ. */
  onShelf: number;
  /** Bán trung bình món/ngày (14 ngày gần). */
  dailyQty: number;
  /** Lãi bình quân một món bán ra; null nếu chưa bán món nào. */
  unitProfit: number | null;
  /** Lời trung bình mỗi ngày (profit30/30). */
  profitPerDay: number;
  /** Lời mỗi ô kệ mỗi ngày; null nếu không bày ô nào. */
  perSlot: number | null;
  flag: 'earn' | 'slow' | 'lose';
}

export interface ShelfSlotRead {
  /** Các món đang bày trên kệ (onShelf > 0), xếp perSlot tăng dần (ô lép vốn lên đầu). */
  items: SlotHealth[];
  /** perSlot cao nhất trong các món đang lời; null nếu chưa có món nào lời. */
  best: number | null;
  /** Các món cần xử lý: đang lỗ hoặc ô kém hiệu suất. */
  slow: SlotHealth[];
  /** Có món nào cần xử lý không. */
  actionable: boolean;
}

/** Ngưỡng "bày ít nhất bấy nhiêu ô" mới coi là chiếm chỗ đáng nói. */
export const SLOT_ACTIONABLE_ON_SHELF = 3;
/** Kém dưới ngang nửa món khoẻ nhất thì coi là ô kém hiệu suất. */
export const SLOT_SLOW_RATIO = 0.5;

export function shelfSlotValue(list: ItemHealth[], onShelf: Record<string, number>): ShelfSlotRead {
  const items: SlotHealth[] = [];
  for (const h of list) {
    const units = onShelf[h.id] ?? 0;
    if (units <= 0) continue; // chỉ soi món ĐANG bày — quyết định là đổi chỗ trên kệ
    const profitPerDay = h.profit30 / 30;
    const perSlot = profitPerDay / units;
    let flag: SlotHealth['flag'] = 'earn';
    if (h.profit30 <= 0) flag = 'lose';
    items.push({
      id: h.id,
      name: h.name,
      onShelf: units,
      dailyQty: h.dailyQty,
      unitProfit: h.qty30 > 0 ? h.profit30 / h.qty30 : null,
      profitPerDay,
      perSlot,
      flag,
    });
  }
  const best = items.reduce((m, it) => (it.flag !== 'lose' && it.perSlot != null && it.perSlot > (m ?? -Infinity) ? it.perSlot : m), null as number | null);
  for (const it of items) {
    if (it.flag === 'earn' && best != null && best > 0 && it.perSlot != null && it.onShelf >= SLOT_ACTIONABLE_ON_SHELF && it.perSlot < best * SLOT_SLOW_RATIO) {
      it.flag = 'slow';
    }
  }
  const slow = items.filter((it) => it.flag !== 'earn');
  return {
    items: [...items].sort((a, b) => (a.perSlot ?? -Infinity) - (b.perSlot ?? -Infinity)),
    best,
    slow,
    actionable: slow.length > 0,
  };
}
