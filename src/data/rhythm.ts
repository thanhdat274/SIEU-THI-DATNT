/** Nhịp trong ngày: giờ cao điểm đông khách hơn, và mỗi khung giờ khách thèm món khác nhau. */
import { productById } from './products';

export interface TimeBand {
  id: string;
  name: string;
  from: number;
  to: number;
  /** Nhân lượng người đi đường. */
  traffic: number;
  /** Món khách hay mua trong khung giờ này. */
  wants: string[];
}

export const TIME_BANDS: TimeBand[] = [
  { id: 'sang', name: 'Cao điểm sáng', from: 6 * 60, to: 8 * 60 + 30, traffic: 1.6, wants: ['sua', 'banhmi', 'caphe', 'trung', 'nuoc', 'banh_mi_trung_nuong', 'xoi_man', 'xoi_trung', 'xoi_dau_xanh', 'ca_phe_sua_da', 'bac_xiu', 'banh_bao_hap', 'tra_gung_nong'] },
  { id: 'giua_sang', name: 'Giữa buổi', from: 8 * 60 + 30, to: 11 * 60, traffic: 0.6, wants: ['ca_phe_sua_da', 'banh_bao_hap', 'bap_xao'] },
  { id: 'trua', name: 'Cao điểm trưa', from: 11 * 60, to: 13 * 60, traffic: 1.35, wants: ['nuoc', 'ngot', 'mi', 'dochin', 'suachua', 'com_hop_ga', 'com_chien_trung', 'mi_trung_nong', 'ca_vien_chien', 'nuoc_mia', 'sinh_to_trai_cay'] },
  { id: 'chieu', name: 'Buổi chiều', from: 13 * 60, to: 17 * 60, traffic: 0.6, wants: ['kem', 'banh', 'snack', 'che_dau_xanh', 'banh_trang_tron', 'kem_trai_cay', 'tra_sua', 'tra_dao_cam_sa', 'bap_xao', 'ca_phe_den_da'] },
  { id: 'toi', name: 'Cao điểm tối', from: 17 * 60, to: 20 * 60, traffic: 1.7, wants: ['rau', 'thit', 'ca', 'gao', 'dauan', 'giavi', 'trung', 'com_suon_nuong', 'canh_rau_thit', 'xoi_thap_cam'] },
  { id: 'khuya', name: 'Tối muộn', from: 20 * 60, to: 22 * 60, traffic: 0.8, wants: ['mi', 'bia', 'snack', 'tangluc', 'mi_trung_nong', 'xuc_xich_nuong', 'ca_vien_chien'] },
];

/** Bình quân `traffic` cả ngày ≈ 1, nên tổng khách/ngày gần như không đổi, chỉ dồn vào giờ cao điểm. */
export const timeBandAt = (minutes: number) => TIME_BANDS.find((b) => minutes >= b.from && minutes < b.to);

// ───── Giờ vàng hôm nay (dự báo) — rút ra từ chính nhịp traffic, không random ─────

/** Khung giờ có `traffic` ≥ ngưỡng này là "giờ vàng" (đông khách đáng kể). */
export const GOLDEN_TRAFFIC = 1.3;

/** Các khung giờ vàng (đông khách) trong ngày, theo nhịp cố định — dùng để báo trước cho người chơi. */
export const goldenHourBands = () => TIME_BANDS.filter((b) => b.traffic >= GOLDEN_TRAFFIC);

/** Gộp danh sách khung giờ thành chuỗi "6h–8h30 · 11h–13h · 17h–20h". */
export function describeHours(bands: TimeBand[]): string {
  return bands.map((b) => {
    const from = Math.floor(b.from / 60);
    const toH = Math.floor(b.to / 60);
    const toM = b.to % 60 ? '30' : '';
    return `${from}h–${toH}h${toM}`;
  }).join(' · ');
}

/** Phút này có đang nằm trong một khung giờ vàng không. */
export const inGoldenHour = (minutes: number) => goldenHourBands().some((b) => minutes >= b.from && minutes < b.to);

/** Khung giờ vàng kế tiếp sau `minutes` (trong hôm nay); hết ngày (đã qua hết các khung) thì null. */
export function nextGoldenBand(minutes: number): TimeBand | null {
  const now = ((minutes % 1440) + 1440) % 1440;
  return goldenHourBands().find((b) => now < b.to) ?? null;
}

/** Còn bao nhiêu phút nữa tới giờ vàng kế tiếp (0 nếu đang trong khung; -1 nếu hôm nay hết giờ vàng). */
export function minutesToGolden(minutes: number): number {
  const now = ((minutes % 1440) + 1440) % 1440;
  const next = nextGoldenBand(minutes);
  if (!next) return -1;
  return now >= next.from ? 0 : next.from - now;
}

/** Gợi ý châm kệ cho giờ vàng sắp tới: món khách thèm trong khung, lọc theo hàng đã mở khóa ở cấp. */
export function goldenPrepWants(minutes: number, level: number, n = 4): string[] {
  const next = nextGoldenBand(minutes);
  if (!next) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of next.wants) {
    if (seen.has(id)) continue;
    seen.add(id);
    const p = productById(id);
    if (p && p.unlock <= level) out.push(p.name);
    if (out.length >= n) break;
  }
  return out;
}

// ───── Giờ vàng tự đặt (happy hour): tự chọn khung giảm giá kéo khách ─────

/** Lựa chọn của người chơi: giờ bắt đầu (9–20) và mức giảm giá (%); cửa sổ kéo dài 2 tiếng. */
export interface HappyHour { from: number; off: number }

export const HAPPY_FROM_MIN = 9;
export const HAPPY_FROM_MAX = 20;
/** Giờ vàng kéo dài bao nhiêu tiếng. */
export const HAPPY_HOURS = 2;
export const HAPPY_OFF_OPTIONS = [10, 15, 20] as const;
/** Khách kéo về thêm theo mức giảm: giảm 10% → +25% khách, giảm 20% → +50%. */
export const happyTraffic = (off: number) => 1 + (off / 100) * 2.5;

/** Giờ vàng có đang chạy ở phút này không. */
export const happyHourActive = (hh: HappyHour | null | undefined, minutes: number) =>
  !!hh && minutes >= hh.from * 60 && minutes < (hh.from + HAPPY_HOURS) * 60;

// ───── Giờ vàng tự đặt: cửa sổ này nằm vào giờ vắng hay trùng giờ vàng tự nhiên? ─────

export interface HappyWindowFit {
  /** Nhịp tự nhiên bình quân của cửa sổ (khoảng 0.6–1.7): càng thấp càng là giờ vắng nên kéo khách. */
  traffic: number;
  /** Số phút cửa sổ trùng vào giờ vàng tự nhiên (đông khách sẵn), 0–120. */
  goldenMinutes: number;
  /** 'golden' trùng giờ vàng phần lớn (giảm giá cho khách vốn đã tới — lãng phí) · 'dead' giờ vắng (thêm khách biên rẻ nhất) · 'mixed' xen kẽ. */
  verdict: 'golden' | 'mixed' | 'dead';
}

/** Đánh giá khung giờ vàng tự đặt so với nhịp tự nhiên — đặt vào giờ vắng để "mua" khách biên rẻ nhất. */
export function happyWindowFit(from: number): HappyWindowFit {
  const start = from * 60;
  const end = start + HAPPY_HOURS * 60;
  let goldenMinutes = 0;
  let minutesSum = 0;
  let trafficSum = 0;
  for (const b of TIME_BANDS) {
    const overlap = Math.min(end, b.to) - Math.max(start, b.from);
    if (overlap <= 0) continue;
    minutesSum += overlap;
    trafficSum += overlap * b.traffic;
    if (b.traffic >= GOLDEN_TRAFFIC) goldenMinutes += overlap;
  }
  const traffic = minutesSum > 0 ? trafficSum / minutesSum : 0;
  const verdict = goldenMinutes >= 90 ? 'golden' : goldenMinutes >= 30 ? 'mixed' : 'dead';
  return { traffic, goldenMinutes, verdict };
}

// ───── Giờ vàng tự đặt: khung này hôm nay chạy ra sao (đóng vòng "chọn giờ → xem kết quả") ─────

/** Sổ theo giờ đang được dựng trong `stats.byHour` — số khách ghé và tiền thu từng giờ trong ngày. */
type HourBook = Record<number, { customers: number; revenue: number }> | undefined;

export interface HappyHourReport {
  /** Cửa sổ (giờ bắt đầu → giờ +HAPPY_HOURS). */
  from: number;
  to: number;
  /** Có dữ liệu nào rơi vào khung chưa (giờ đã có dòng bán/khách). */
  present: boolean;
  customers: number;
  revenue: number;
  /** Khách ước tính nhờ giờ vàng kéo về thêm: phần vượt nhịp tự nhiên. */
  extraCustomers: number;
  /** Tiền đã giảm giá trong khung (ước tính theo mức giảm). */
  discountCost: number;
}

/** Báo cáo hiệu quả khung giờ vàng tự đặt từ sổ theo giờ (`stats.byHour`) — thuần đọc, không đổi state. */
export function happyHourReport(hh: HappyHour, byHour: HourBook): HappyHourReport {
  const from = hh.from;
  const to = hh.from + HAPPY_HOURS;
  let customers = 0;
  let revenue = 0;
  let present = false;
  for (let h = from; h < to; h++) {
    const line = byHour?.[h];
    if (!line) continue;
    present = true;
    customers += line.customers;
    revenue += line.revenue;
  }
  const mul = happyTraffic(hh.off); // 1.25 / 1.375 / 1.5 — khách kéo về thêm theo mức giảm
  const extraCustomers = present ? Math.round(customers * (1 - 1 / mul)) : 0;
  const discountCost = Math.round(revenue * hh.off / 100);
  return { from, to, present, customers, revenue, extraCustomers, discountCost };
}

// ───── Giờ vàng có đáng? (đưa verdict ra ranh giới ngày — đóng vòng "chọn giờ → xem kết quả") ─────

/** Chi phí–lợi ích khung giờ vàng tự đặt hôm nay: khách kéo thêm (extraCustomers) quy ra giá trị
 *  so với tiền đã giảm giá (discountCost). THUẦN đọc từ `happyHourReport` — không đổi state/kinh tế.
 *  `efficiency = extraValue/discountCost`: giảm 10% thường ~3.3×, 20% ~1.7× — nên mức giảm cao tuy
 *  kéo nhiều khách hơn nhưng chi phí chiết khấu ăn phần lớn lợi ('ok' → gợi ý hạ mức giảm). */
export function happyPayoff(hh: HappyHour | null | undefined, byHour: HourBook): HappyHourReport & {
  extraValue: number;
  efficiency: number;
  verdict: 'great' | 'ok' | 'weak';
} | null {
  if (!hh) return null;
  const r = happyHourReport(hh, byHour);
  if (!r.present || r.customers <= 0 || r.discountCost <= 0) return null;
  const avgPerCustomer = r.revenue / r.customers;
  const extraValue = Math.round(r.extraCustomers * avgPerCustomer);
  const efficiency = extraValue / r.discountCost;
  const verdict = efficiency >= 2 ? 'great' : efficiency >= 1 ? 'ok' : 'weak';
  return { ...r, extraValue, efficiency, verdict };
}
