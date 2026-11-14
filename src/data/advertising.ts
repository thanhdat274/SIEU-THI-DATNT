/**
 * GĐ2219 — QUẢNG CÁO / TRUYỀN THÔNG (mở rộng, theo chủ trương "hết chiều sâu thì mở rộng").
 *
 * Tiệm tạp hóa trong hẻm chưa từng có kênh chủ động kéo khách ngoài trang trí (decor). Đây là hệ mới:
 * người chơi BỎ TIỀN mua tờ rơi / băng rôn / "tiếng lành hẻm" để trong vài NGÀY tiệm được cộng thêm
 * điểm "hút khách" (như điểm 🩷 decor) → kéo thêm người đi đường ghé (đúng công thức decorVisitBoost
 * ở customers.ts:174 — quảng cáo là "điểm decor ảo có hạn").
 *
 * AN TOÀN sim/seed: tác động chỉ là MỘT số hạng cộng thêm (`adBoost`) trong tổng điểm decor ở
 * customers.ts:174, vốn là đường đã được decor/đèn vùng/khu thêm an toàn (GĐ1495/1505/1943). Vì
 * helper trả 0 khi chưa có hoặc hết hạn (`ad === undefined` mặc định trong save cũ) và chỉ mua được
 * từ cấp 42 > mốc golden L30 mà autoplay KHÔNG tự mua quảng cáo → golden sim giữ NGUYÊN byte.
 *
 * Helper THUẦN đọc (adPayoff/adBoost): không import store, không đổi state — dùng đúng decorVisitBoost
 * + customersPerDay như decorPayoff (GĐ2214) để quy ra khách/đ mỗi ngày và mức "đáng hay không".
 */
import { formatMoney } from './products';
import { decorVisitBoost } from './layout';
import { customersPerDay } from './levels';
import { fmtNum } from '../core/format';

export interface AdDef {
  id: string;
  name: string;
  icon: string;
  /** Giá mua một chiến dịch. */
  cost: number;
  /** Điểm "hút khách" (decor-ảo) cộng trong thời gian hiệu lực. */
  boost: number;
  /** Số ngày hiệu lực. */
  days: number;
  /** Mở từ cấp này (> golden 30 nên autoplay không bao giờ tự bấm → sim đứng). */
  unlock: number;
  desc: string;
}

export const ADS: AdDef[] = [
  { id: 'to_roi', name: 'Tờ rơi phát đầu hẻm', icon: '📄', cost: 60000, boost: 20, days: 2, unlock: 42, desc: 'Phát tờ rơi 2 ngày — dân hẻm biết tiệm mới có món hay.' },
  { id: 'bang_ron', name: 'Băng rôn trước tiệm', icon: '🪧', boost: 40, cost: 150000, days: 4, unlock: 46, desc: 'Băng rôn treo 4 ngày, người đi qua để ý hơn.' },
  { id: 'tien_lanh', name: 'Tiếng lành hẻm', icon: '📣', boost: 70, cost: 300000, days: 7, unlock: 50, desc: 'Loa tin xóm nhắc tên tiệm trong 7 ngày — "tiếng lành đồn xa".' },
];

export interface AdCampaign {
  defId: string;
  /** Ngày cuối còn hiệu lực. */
  until: number;
}

export const adById = (id: string): AdDef | undefined => ADS.find((a) => a.id === id);

/** Điểm hút khách còn hiệu lực hôm nay (0 khi chưa có / hết hạn). */
export const adBoost = (ad: AdCampaign | undefined, day: number): number =>
  ad && day <= ad.until ? (adById(ad.defId)?.boost ?? 0) : 0;

export interface AdPayoff {
  def: AdDef;
  /** decorBoost biên của quảng cáo (cộng nền lượt ghé như decorPayoff). */
  boost: number;
  /** Khách THÊM mỗi ngày trong thời gian hiệu lực. */
  extraKhach: number;
  /** Tiền thêm mỗi ngày theo phí chi tiêu bình quân (0 nếu không kê). */
  moneyPerDay: number;
  /** Tổng khách kéo thêm trong cả đợt. */
  totalKhach: number;
  /** Tổng tiền ước trong cả đợt (moneyPerDay × days). */
  totalMoney: number;
  /** % so vốn sau đợt: (totalMoney − cost)/cost; âm = lỗ nếu không kéo thêm khách trả tiền. */
  roiPct: number;
}

/** Lượng hoá 1 đợt quảng cáo: kéo thêm khách/đ, và đáng hay không so với giá. THUẦN đọc. */
export function adPayoff(def: AdDef, overallStars: number, level: number, avgPerVisit = 0): AdPayoff {
  const boost = decorVisitBoost(def.boost, overallStars); // (boost/100)×(sao/5)
  const extraKhach = Math.round(boost * customersPerDay(level));
  const moneyPerDay = Math.round(extraKhach * avgPerVisit);
  const totalKhach = extraKhach * def.days;
  const totalMoney = moneyPerDay * def.days;
  const roiPct = def.cost > 0 ? Math.round(((totalMoney - def.cost) / def.cost) * 100) : 0;
  return { def, boost, extraKhach, moneyPerDay, totalKhach, totalMoney, roiPct };
}

/** Dòng ngắn cho bề mặt mua quảng cáo. */
export function adPayoffLine(p: AdPayoff): string {
  const daily = p.extraKhach > 0 ? `~${p.extraKhach} khách/ngày trong ${p.def.days} ngày` : 'không kéo thêm khách đáng kể';
  const money = p.moneyPerDay > 0 ? ` (~${fmtNum(p.totalMoney)}đ cả đợt)` : '';
  const verdict = p.moneyPerDay > 0
    ? (p.roiPct >= 0 ? ` · ~${p.roiPct}% so vốn` : ` · lỗ ~${-p.roiPct}% nếu chỉ tính doanh thu thêm`)
    : '';
  return `${p.def.icon} ${p.def.name} (${formatMoney(p.def.cost)}): ${daily}${money}${verdict}.`;
}

/**
 * GĐ2223 — DÒNG SỐNG "hôm nay" cho chiến dịch ĐANG chạy: băng-rôn/tờ-rơi/tiếng lành hôm nay đang
 * kéo thêm ~bao nhiêu khách và ~bao nhiêu tiền, tính bằng phí chi tiêu bình quân THẬT của hôm nay
 * (stats.revenue / stats.customers). Trước GĐ2223, banner đang chạy chỉ hiện "+N🩷 hút khách" (điểm
 * decor ảo) mà không quy ra người chơi thấy được khách/tiền — nguyên tắc Không hộp đen (như GĐ2218
 * đã làm cho bảng hiệu). THUẦN đọc, tái dùng adPayoff (không đổi state/sim/save). avgPerVisit = 0
 * (chưa có khách hôm nay) thì chỉ nêu khách, không bịa tiền.
 */
export function adTodayLine(def: AdDef, stars: number, level: number, avgPerVisit: number): string {
  const p = adPayoff(def, stars, level, avgPerVisit);
  if (p.extraKhach <= 0) return `Hôm nay chưa kéo thêm khách đáng kể.`;
  const money = p.moneyPerDay > 0 ? ` ≈ ${fmtNum(p.moneyPerDay)}đ hôm nay` : '';
  return `Hôm nay đang kéo thêm ~${p.extraKhach} khách${money}.`;
}
