/**
 * GĐ2213 — "Combo này chiết khấu bao nhiêu, mang về bao nhiêu lời?" (định lượng chi phí combo).
 *
 * ComboPanel vốn cho biết combo nào đang chạy, gợi ý combo nên bật (`comboSuggest` GĐ1243) và combo nào
 * hôm nay "chết slot" (`liveWeakCombo` GĐ1242) — nhưng chưa ai nói chiết khấu 6–12% của combo ĂN VÀO
 * MẶT HÀNG nào, tốn bao nhiêu đồng lời trên cặp bán. Helper này THUẦN ĐỌC: lấy giá nhập/bán THẬT của 2
 * món (productById buy/sell) để ra, với MỘT lần combo kích hoạt (bán đủ cặp):
 *   gross  = (sellA−buyA)+(sellB−buyB)          — lời cặp khi bán đủ giá
 *   discount = (sellA+sellB)×discount           — tiền chiết khấu phải trả (đúng comboDiscount, tròn trăm)
 *   keep   = gross − discount                   — lời còn lại sau khi trả chiết khấu
 *   eaten  = discount / gross                   — phần lời bị chiết khấu ăn mất (báo "ăn lời")
 * `comboPayoff` xếp combo đang chạy theo `keep` (đồng) giảm dần — combo nào mỗi lần kích hoạt giữ nhiều
 * lời nhất → ưu tiên giữ slot; `comboRealizedPayoff` dùng số trigger thật hôm nay (byCombo từ comboDiscount)
 * để báo combo nào "kèo lấn lãi bán hàng" (keep×count − discount ≤ 0) — đúng Luật cứng "kèo không lấn lãi".
 * KHÔNG đổi state/save/kinh tế/seed — cùng đầu vào ⇒ cùng kết quả, co-op an toàn (không import store).
 */
import { productById } from './products';
import { comboById, type ComboDef } from './combos';
import { fmtNum } from '../core/format';

export interface ComboMarginRow {
  id: string;
  icon: string;
  name: string;
  /** Lời cặp khi bán đủ giá (KHÔNG tính chiết khấu): (sellA−buyA)+(sellB−buyB). */
  gross: number;
  /** Số tiền chiết khấu trên cặp (sellA+sellB)×discount (đúng comboDiscount, tròn trăm). */
  discount: number;
  /** Lời còn lại sau khi trả chiết khấu cho một lần kích hoạt: gross − discount. */
  keep: number;
  /** Phần lời cặp bị chiết khấu ăn mất (0–1) — số "% ăn lời" dễ hiểu. */
  eaten: number;
}

/** Định lượng chi phí một combo trên giá THẬT của cặp món (cho MỘT lần bán đủ cặp). */
export function comboMargin(c: ComboDef): ComboMarginRow {
  const a = productById(c.items[0]);
  const b = productById(c.items[1]);
  const sellSum = (a?.sell ?? 0) + (b?.sell ?? 0);
  const gross = a && b ? (a.sell - a.buy) + (b.sell - b.buy) : 0;
  const discount = Math.round((sellSum * c.discount) / 100) * 100; // khớp comboDiscount (tròn trăm)
  const keep = gross - discount;
  return {
    id: c.id, icon: c.icon, name: c.name,
    gross, discount, keep,
    eaten: gross > 0 ? Math.round((discount / gross) * 100) / 100 : 1,
  };
}

/** Xếp combo đang chạy theo lời còn lại MỖI LẦN kích hoạt (đồng) giảm dần — combo đáng giữ slot nhất đầu. */
export function comboPayoff(activeIds: readonly string[]): ComboMarginRow[] {
  const rows: ComboMarginRow[] = [];
  for (const id of activeIds) {
    const def = comboById(id);
    if (def) rows.push(comboMargin(def));
  }
  return rows.sort((x, y) => y.keep - x.keep || x.name.localeCompare(y.name));
}

export interface ComboRealizedRow extends ComboMarginRow {
  /** Số lần combo kích hoạt hôm nay (từ comboDiscount). */
  count: number;
  /** Tổng tiền chiết khấu đã trả hôm nay (đúng byDiscount). */
  discountGiven: number;
  /** Lời còn lại HÔM NAY của combo: count×gross − discountGiven. */
  keptToday: number;
  /** Kèo lấn lãi bán hàng: giữ lại ≤ 0 đồng lời sau khi trả chiết khấu (Luật cứng "kèo không lấn lãi"). */
  overrun: boolean;
}

/**
 * Phản hồi cuối ngày theo COMBO: đối chiếu số trigger thật (`byCombo`/`byDiscount` từ comboDiscount) với
 * margin thật của cặp món → combo nào hôm nay trả chiết khấu mà vẫn giữ lời, combo nào "kèo lỗ" (overrun).
 * Chỉ trả combo đã kích hoạt (count>0). Thuần đọc, dùng chung chơi đơn/hẻm online.
 */
export function comboRealizedPayoff(
  byCombo: Record<string, number>,
  byDiscount: Record<string, number>,
  activeIds: readonly string[],
): ComboRealizedRow[] {
  const rows: ComboRealizedRow[] = [];
  for (const id of activeIds) {
    const count = byCombo[id] ?? 0;
    if (count <= 0) continue;
    const def = comboById(id);
    if (!def) continue;
    const m = comboMargin(def);
    const discountGiven = byDiscount[id] ?? 0;
    const keptToday = count * m.gross - discountGiven;
    rows.push({ ...m, count, discountGiven, keptToday, overrun: keptToday <= 0 });
  }
  return rows.sort((x, y) => y.keptToday - x.keptToday || x.name.localeCompare(y.name));
}

/** Một dòng ngắn cho bề mặt combo: ăn bao nhiêu % lời, giữ bao nhiêu đồng mỗi lần bán cặp. */
export function comboMarginLine(m: ComboMarginRow): string {
  const eatenPct = Math.round(m.eaten * 100);
  const keepTxt = fmtNum(m.keep);
  return `${m.icon} ${m.name}: chiết khấu ăn ~${eatenPct}% lời cặp — mỗi lần bán cặp giữ ~${keepTxt}đ.`;
}
