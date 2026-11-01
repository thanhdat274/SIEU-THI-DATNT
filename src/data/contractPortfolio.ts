/**
 * Bộ hợp đồng đang có đóng góp bao nhiêu/ngày + vốn cột (GĐ234)?
 *
 * contractAcceptRoi (GĐ151) soi TỪNG hợp đồng; chưa có một con số TỔNG cho cả CHÙM đang active:
 * "các hợp đồng này mỗi ngày đóng góp ~Xđ lời, nhưng mỗi kỳ phải cột ~Yđ vốn hàng dự trữ để giao."
 * Helper này gộp các hợp đồng đang hoạt động: netPerDayTotal = Σ netPerDay (lời ròng/ngày),
 * capitalPerPeriod = Σ costOfGoods (vốn cần trữ hàng cho một kỳ giao của cả chùm) — để chủ tiệm thấy
 * lợi nhuận tổng và vốn kẹt, đối chiếu với kho/dòng tiền (nối GĐ213 stockCapital / GĐ224 dailyBurn).
 * THUẦN ĐỌC: chỉ gộp contractAcceptRoi theo defId — không đổi state/kinh tế.
 */
import { supplyContractById, contractAcceptRoi } from './contracts';

export interface ContractPortfolio {
  /** Số hợp đồng đang active. */
  count: number;
  /** Lời ròng/ngày tổng (Σ netPerDay). */
  netPerDayTotal: number;
  /** Vốn hàng cần trữ cho một kỳ giao của cả chùm (Σ costOfGoods). */
  capitalPerPeriod: number;
  /** Phần lời bị nhượng lại cho khách sỉ (Σ giveUp của chùm trong một kỳ). */
  giveUpPeriod: number;
  /** Có hợp đồng nào đang lỗ thật (contractNet ≤ 0) không. */
  anyLosing: boolean;
  verdict: 'ok' | 'warn' | 'empty';
}

export function contractPortfolio(activeDefIds: string[]): ContractPortfolio {
  let net = 0;
  let capital = 0;
  let giveUp = 0;
  let losing = false;
  let count = 0;
  for (const id of activeDefIds) {
    const def = supplyContractById(id);
    if (!def) continue;
    const roi = contractAcceptRoi(def);
    count++;
    net += roi.netPerDay;
    capital += roi.costOfGoods;
    giveUp += roi.giveUp;
    if (roi.contractNet <= 0) losing = true;
  }
  let verdict: ContractPortfolio['verdict'] = 'empty';
  if (count > 0) verdict = losing || net <= 0 ? 'warn' : 'ok';
  return { count, netPerDayTotal: net, capitalPerPeriod: capital, giveUpPeriod: giveUp, anyLosing: losing, verdict };
}
