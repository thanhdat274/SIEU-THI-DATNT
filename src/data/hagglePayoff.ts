/**
 * GĐ1312 — "Chính sách quầy (mặc cả): nên Luôn bớt / Trả nửa / Giữ giá — cái nào LỜI NHẤT?
 * ~EV mỗi đơn mặc cả." DebtBook (Chính sách quầy) chỉ kèm note ĐỊNH TÍNH cho từng stance
 * ("thu nhập giảm nhẹ", "mất 40% khách mặc cả") — CHƯA ai lượng hóa mỗi stance được bao nhiêu tiền
 * cho một đơn mặc cả (hộp đen, Nguyên tắc a). Helper này THUẦN TÁI DỰNG ĐÚNG cơ chế chốt `haggleSettle`
 * / `haggleCounterOutcome`: EV thu về = xác suất × số tiền theo hằng số game (Luôn bớt hợp tất, Trả nửa
 * rút 1 lượt, Giữ giá rút 1 lượt) → xếp hạng + mất bao nhiêu so với tốt nhất. CHỈ nhân/gộp số ghi sẵn,
 * không bịa (Nguyên tắc c). KHÔNG import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
import {
  HAGGLE_COUNTER_ACCEPT_P,
  HAGGLE_MIN_TOTAL,
  HAGGLE_REFUSE_OK,
  haggleCounterOff,
  haggleOff,
  type HagglePolicy,
} from './counterDeals';
import { fmtNum } from '../core/format';

export type HaggleChoice = 'accept' | 'counter' | 'refuse';

export interface HagglePolicyEarn {
  /** Tổng hóa đơn mặc cả dùng neo EV (mặc định HAGGLE_MIN_TOTAL). */
  total: number;
  /** EV thu về mỗi đơn mặc cả theo từng stance tự động. */
  accept: number;
  counter: number;
  refuse: number;
  /** Stance thu về nhiều nhất. */
  best: HaggleChoice;
  bestEarn: number;
  /** Stance tự động đang đặt (null = 'ask' — chủ tự quyết từng đơn). */
  current: HaggleChoice | null;
  /** EV của stance hiện tại (khớp `current` khi có; ngược lại = bestEarn). */
  currentEarn: number;
  /** Mất ~bao nhiêu/đơn so với tốt nhất (0 khi đang tối ưu / 'ask'). */
  loss: number;
  /** Dòng soi ngắn (≤90 code point) — đặt cạnh đầu mục Mặc cả. */
  line: string | null;
}

/**
 * EV thu về của một stance cho một đơn mặc cả giá `T` — TÁI DỰNG ĐÚNG `haggleSettle`/`haggleCounterOutcome`.
 *  - accept (choice 0): cắt `off`, khách luôn mua → T − off.
 *  - refuse (choice 2): giữ giá, <REFUSE_OK mua đầy, ngược lại bỏ 0 → T × REFUSE_OK.
 *  - counter (choice 1): 70% gật giá giữa (T − counterOff), 30% còn lại: 60% mua đầy T, 40% bỏ 0.
 * THUẦN — chỉ từ hằng số, không RNG/đổi state.
 */
export function hagglePolicyEarn(current: HagglePolicy | undefined, total: number = HAGGLE_MIN_TOTAL): HagglePolicyEarn {
  const T = Math.max(0, total);
  const off = haggleOff(T);
  const counterOff = haggleCounterOff(T);

  const accept = T - off;
  const refuse = Math.round(T * HAGGLE_REFUSE_OK);
  const counter = Math.round(
    HAGGLE_COUNTER_ACCEPT_P * (T - counterOff) + (1 - HAGGLE_COUNTER_ACCEPT_P) * HAGGLE_REFUSE_OK * T,
  );

  const entries: Record<HaggleChoice, number> = { accept, counter, refuse };
  const best: HaggleChoice = (Object.keys(entries) as HaggleChoice[]).sort((a, b) => entries[b] - entries[a])[0];
  const bestEarn = entries[best];

  const auto: HaggleChoice | null = current && current !== 'ask' ? current : null;
  const currentEarn = auto ? entries[auto] : bestEarn;
  const loss = auto && auto !== best ? bestEarn - entries[auto] : 0;

  const line = policyLine({ total: T, auto, best, bestEarn, loss, entries });
  return { total: T, accept, counter, refuse, best, bestEarn, current: auto, currentEarn, loss, line };
}

const NAME: Record<HaggleChoice, string> = { accept: 'Luôn bớt', counter: 'trả nửa', refuse: 'giữ giá' };
const fmt = (v: number) => `${fmtNum(Math.round(v))}đ`;
const kOf = (v: number) => (v % 1000 === 0 ? `${Math.round(v / 1000)}k` : `${v}`);

function policyLine(o: {
  total: number;
  auto: HaggleChoice | null;
  best: HaggleChoice;
  bestEarn: number;
  loss: number;
  entries: Record<HaggleChoice, number>;
}): string {
  const { total, auto, best, bestEarn, loss, entries } = o;
  if (auto && loss > 0) {
    return `Mặc cả: đang để ${NAME[auto]} — mất ~${fmt(loss)}/đơn so với ${NAME[best]} (${fmt(bestEarn)}).`;
  }
  return `Mặc cả ~EV/đơn ${kOf(total)}: ${NAME.accept} ${fmt(entries.accept)} · ${NAME.counter} ${fmt(entries.counter)} · ${NAME.refuse} ${fmt(entries.refuse)}.`;
}
