/**
 * GĐ1305 — "Thuê lô sạp hàng rong (5tr) / nâng bậc sạp có đáng? ~hoàn vốn theo thời tiết".
 * ZoneMapSection vốn cho biết "hôm nay Xđ/lô" + nút nâng bậc (chỉ hiện giá `up.cost`), nhưng
 * CHƯA cho con số HOÀN VỐN — người chơi bỏ 5tr/lô (SAP_LOT_COST) mở sạp, 3tr/5tr nâng bậc
 * (SAP_TIERS) mà không biết lấy lại vốn bao lâu (hộp đen, Nguyên tắc a). Helper này THUẦN:
 * TÁI DỰNG ĐÚNG lãi lô `sapRongIncome`/`sapLotIncome` (base × weekday/weekend × weather-mul ×
 * tier-mul × homeXoi; 0 khi mưa/bão) → hoàn vốn = ceil(cost / lãi/ngày). Trung thực: mưa/bão
 * sạp nghỉ → không bịa hoàn vốn (line null). KHÔNG import store (co-op an toàn), không đổi
 * kinh tế/save/seed/state (Luật 5).
 */
import {
  SAP_LOTS,
  SAP_LOT_COST,
  SAP_TIERS,
  SAP_HOME_XOI_MUL,
  sapKindOf,
  sapLotIncome,
  sapTierOf,
} from './sapRong';
import type { Weather } from './weather';
import { fmtNum } from '../core/format';

export interface SapUpPayoff {
  /** Tên bậc kế (Xe đẩy / Quầy). */
  name: string;
  /** Tiền nâng. */
  cost: number;
  /** Lãi thêm/ngày hôm nay nếu nâng (0 khi mưa/bão). */
  gainPerDay: number;
  /** Số ngày hoàn vốn ≈ ceil(cost / gainPerDay). */
  payback: number;
}

export interface SapPayoff {
  /** Còn lô trống để thuê thêm không. */
  canRent: boolean;
  /** Tiền thuê một lô. */
  rentCost: number;
  /** Lãi/ngày HÔM NAY của lô mới (món mặc định, bậc gánh; 0 khi mưa/bão). */
  nextLotDaily: number;
  /** Ngày hoàn vốn nếu mở lô kế (null khi không ước được). */
  rentPayback: number | null;
  /** Bậc nâng đầu tiên đáng nói (null khi hết bậc / mưa / không lãi thêm). */
  up: SapUpPayoff | null;
  /** Dòng soi ngắn (≤90 code point) — null khi không có gì đáng nói. */
  line: string | null;
}

/**
 * Tính hoàn vốn cho khoản đầu tư sạp KẾ TIẾP (mở lô nếu còn trống, chẳng thì bậc nâng đầu tiên
 * có lãi thêm). `homeXoi` = đã mở tiệm xôi (lô xôi +20% khi bán xôi nhà — khớp panel). THUẦN.
 */
export function sapPayoff(opts: {
  lots: number | undefined;
  weather?: Weather;
  day?: number;
  kinds?: readonly string[];
  tiers?: readonly number[];
  homeXoi?: boolean;
}): SapPayoff {
  const n = Math.max(0, Math.min(SAP_LOTS, opts.lots ?? 0));
  const rain = opts.weather === 'rain' || opts.weather === 'storm';

  // Lãi hôm nay nếu mở lô kế (món mặc định + bậc gánh, như panel dòng "hôm nay Xđ").
  const canRent = n < SAP_LOTS;
  let nextLotDaily = 0;
  if (canRent) {
    const k = sapKindOf(opts.kinds, n);
    const home = !!(opts.homeXoi && k.id === 'xoi');
    nextLotDaily = Math.round(sapLotIncome(k, opts.weather, opts.day) * SAP_TIERS[0].mul * (home ? SAP_HOME_XOI_MUL : 1));
  }

  // Bậc nâng đầu tiên có lãi thêm hôm nay (chỉ khi không ưu tiên dòng mở lô).
  let up: SapUpPayoff | null = null;
  if (!canRent || nextLotDaily === 0) {
    for (let i = 0; i < n && !up; i++) {
      const k = sapKindOf(opts.kinds, i);
      const t = SAP_TIERS[sapTierOf(opts.tiers, i)];
      const u = SAP_TIERS[sapTierOf(opts.tiers, i) + 1];
      if (!u) continue;
      const home = !!(opts.homeXoi && k.id === 'xoi');
      const base = Math.round(sapLotIncome(k, opts.weather, opts.day) * t.mul * (home ? SAP_HOME_XOI_MUL : 1));
      const gain = Math.round(base * (u.mul / t.mul - 1));
      if (gain <= 0) continue;
      up = { name: u.name, cost: u.cost, gainPerDay: gain, payback: Math.ceil(u.cost / gain) };
    }
  }

  let line: string | null = null;
  if (canRent && nextLotDaily > 0) {
    line = `🛒 Mở lô ${fmtMoney(SAP_LOT_COST)}: ~${fmtMoney(nextLotDaily)}đ/ngày → hoàn ${Math.ceil(SAP_LOT_COST / nextLotDaily)} ngày.`;
  } else if (up) {
    line = `⬆ ${up.name} ${fmtMoney(up.cost)}: ~${fmtMoney(up.gainPerDay)}đ/ngày → hoàn ${up.payback} ngày.`;
  }

  return {
    canRent,
    rentCost: SAP_LOT_COST,
    nextLotDaily,
    rentPayback: nextLotDaily > 0 ? Math.ceil(SAP_LOT_COST / nextLotDaily) : null,
    up,
    line,
  };
}

const fmtMoney = (v: number) => `${fmtNum(Math.round(v))}đ`;
