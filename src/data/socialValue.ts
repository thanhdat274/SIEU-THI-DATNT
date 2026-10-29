/**
 * GĐ244 "Buzz mạng xã hội đang thêm/mất bao nhiêu khách? — có nên xin lỗi?" — soi ảnh hưởng mạng xã hội.
 *
 * socialTraffic(social, day) = hệ số khách ghé do buzz × bài quảng bá hôm nay (social.ts:77): hype
 * ×1.25, khủng hoảng ×0.72, đã xin lỗi ×0.92, promo boost ≤ +15% theo followers. SocialPanel chỉ hiện
 * "khách ×mul" — không có con số "buzz này đang thêm/mất ~N khách/ngày ≈ tiền". Helper này THUẦN ĐỌC
 * (social + day + level + customers/revenue thật) — khách đi đường ≈ customersPerDay(level) × traffic;
 * tiền = khách lệch × doanh thu TB mỗi lượt. Kèm lựa chọn khủng hoảng: xin lỗi tốn APOLOGY_COST (150k)
 * nhưng nâng hệ số lên 0.92 thay vì 0.72 → khách giữ lại được ~cpd×0.2/ngày. Không RNG, không đổi state.
 */
import {
  activeBuzz, APOLOGY_COST, APOLOGY_MUL, CRISIS_MUL, socialTraffic,
} from './social';
import type { SocialState } from './social';
import { customersPerDay } from './levels';

export interface SocialValue {
  /** Hệ số khách ghé hôm nay do mạng xã hội (buzz × promo). */
  traffic: number;
  khachPerDay: number;
  /** Khách thêm(+)/mất(−) mỗi ngày so với không có buzz. */
  deltaKhachPerDay: number;
  avgPerVisit: number;
  moneyDeltaPerDay: number;
  buzzKind: 'hype' | 'crisis' | null;
  buzzResponded: boolean;
  apologyCost: number;
  /** Nếu đang khủng hoảng chưa đáp lại: khách giữ lại được nếu xin lỗi (cpd × (APOLOGY−CRISIS))/ngày. */
  apologyGainKhach: number;
  apologyGainMoney: number;
  verdict: 'hype' | 'crisis' | 'calm' | 'crisisApologize';
}

export function socialValue(opts: {
  social: SocialState | undefined;
  day: number;
  level: number;
  customers: number;
  revenue: number;
}): SocialValue {
  const { social, day, level, customers, revenue } = opts;
  const traffic = socialTraffic(social, day);
  const cpd = customersPerDay(level);
  const khachPerDay = cpd * traffic;
  const deltaKhachPerDay = cpd * (traffic - 1);
  const avgPerVisit = customers > 0 ? revenue / customers : 0;
  const moneyDeltaPerDay = deltaKhachPerDay * avgPerVisit;

  const buzz = activeBuzz(social ?? ({ buzz: null } as SocialState), day);
  const buzzKind = buzz?.kind ?? null;
  const buzzResponded = buzz?.responded === true;

  const apologyGainKhach = buzz?.kind === 'crisis' && !buzzResponded ? cpd * (APOLOGY_MUL - CRISIS_MUL) : 0;
  const apologyGainMoney = apologyGainKhach * avgPerVisit;

  let verdict: SocialValue['verdict'];
  if (buzz?.kind === 'crisis') verdict = buzzResponded ? 'crisis' : 'crisisApologize';
  else if (buzz?.kind === 'hype') verdict = 'hype';
  else verdict = 'calm';

  return {
    traffic, khachPerDay, deltaKhachPerDay, avgPerVisit, moneyDeltaPerDay,
    buzzKind, buzzResponded, apologyCost: APOLOGY_COST, apologyGainKhach, apologyGainMoney, verdict,
  };
}
