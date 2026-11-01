import type { Festival } from './calendar';
import { festivalOn, upcomingFestival } from './calendar';
import { customersPerDay } from './levels';
import { productById } from './products';

// ───── GĐ245: soi dịp lễ ra khách/tiền (soi sáng THUẦN ĐỌC) ─────
// festivalPrep (GĐ70) chỉ hỏi "đã trữ đủ hàng chưa" và mức thưởng đón lễ một lần. Bản này bổ sung
// mảnh còn thiếu: mỗi dịp lễ THẬT đang diễn ra (festivalOn) hoặc sắp tới (upcomingFestival) có hệ số
// khách traffic (Tết 1.7, mùa hè 1.1...) và hệ số giá nhập cost. Đưa ra deltaKhách/ngày và tiền thêm/ngày
// theo giá giỏ hôm nay (revenue/customers) + số món hot đã mở khóa để trữ. Không đụng state/save.

export interface FestivalValue {
  festival: Festival;
  /** Đang diễn ra ngay hôm nay (0 = còn inDays nữa mới tới). */
  inDays: number;
  onNow: boolean;
  traffic: number;
  cost: number;
  cpd: number;
  khachPerDay: number;
  deltaKhachPerDay: number;
  avgPerVisit: number;
  moneyDeltaPerDay: number;
  hotIds: string[];
  verdict: 'huge' | 'big' | 'modest';
}

/** Ước độ mạnh dịp theo hệ số khách: Tết 1.7 = 'huge', 1.25–1.49 = 'big', còn lại 'modest'. */
export const festivalVerdict = (traffic: number): FestivalValue['verdict'] =>
  traffic >= 1.5 ? 'huge' : traffic >= 1.25 ? 'big' : 'modest';

/** Trả null nếu hôm nay không có lễ và cũng không có lễ nào trong `within` ngày tới. */
export function festivalValue(opts: {
  day: number;
  level: number;
  customers: number;
  revenue: number;
  within?: number;
}): FestivalValue | null {
  const { day, level, customers, revenue, within = 3 } = opts;
  const active = festivalOn(day);
  const upcoming = active ? null : upcomingFestival(day, within);
  if (!active && !upcoming) return null;
  const festival = active ?? upcoming!.festival;
  const traffic = festival.traffic ?? 1;
  const cpd = customersPerDay(level);
  const khachPerDay = cpd * traffic;
  const deltaKhachPerDay = cpd * (traffic - 1);
  const avgPerVisit = customers > 0 ? revenue / customers : 0;
  const moneyDeltaPerDay = deltaKhachPerDay * avgPerVisit;
  const hotIds = (festival.hot ?? []).filter((id) => productById(id).unlock <= level);
  return {
    festival,
    inDays: active ? 0 : upcoming!.inDays,
    onNow: !!active,
    traffic,
    cost: festival.cost ?? 1,
    cpd,
    khachPerDay,
    deltaKhachPerDay,
    avgPerVisit,
    moneyDeltaPerDay,
    hotIds,
    verdict: festivalVerdict(traffic),
  };
}
