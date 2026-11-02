import type { ReactNode } from 'react';
import { formatMoney } from '../../data/products';
import type { loyaltyPayoff } from '../../data/biz';
import type { happyPayoff } from '../../data/rhythm';
import type { spoilNightReport, storeMissRevenue } from '../../data/advice';
import { Callout } from './shared';

type P = {
  loyaltyPay: ReturnType<typeof loyaltyPayoff>;
  happyPay: ReturnType<typeof happyPayoff>;
  missRev: ReturnType<typeof storeMissRevenue>;
  spoilNite: ReturnType<typeof spoilNightReport>;
  openPanel: (p: any) => void;
};

/** Các thẻ cảnh báo/đánh giá cuối ngày (thẻ tích điểm, giờ vàng, hết hàng bỏ lỡ, hỏng đêm qua). */
export function SummaryMoneyCards({ loyaltyPay, happyPay, missRev, spoilNite, openPanel }: P): ReactNode {
  return (
    <>
          {loyaltyPay && loyaltyPay.verdict !== 'soon' && (
            <Callout tone={loyaltyPay.verdict === 'keep' ? 'ok' : 'warn'} style={{ marginTop: 8 }} title="🎫 Thẻ tích điểm hôm nay">
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {loyaltyPay.verdict === 'keep'
                  ? `Nhờ +${loyaltyPay.boostPct}% khách, kéo thêm ~${loyaltyPay.extraCustomers} khách (~${formatMoney(loyaltyPay.extraValue)}/ngày) — so với quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}) là ĐÁNG giữ.`
                  : `Quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}) cao hơn giá trị khách kéo thêm (~${formatMoney(loyaltyPay.extraValue)}/ngày) — nâng lên ${5}/${10}/${15} tem hoặc tắt cho đỡ tốn.`}
              </div>
            </Callout>
          )}
          {happyPay && (
            <Callout tone={happyPay.verdict === 'great' ? 'ok' : happyPay.verdict === 'ok' ? 'accent' : 'danger'} style={{ marginTop: 8 }}
              title={`🌞 Giờ vàng hôm nay (${happyPay.from}h–${happyPay.to}h)`}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {happyPay.verdict === 'great'
                  ? `Kéo thêm ~${happyPay.extraCustomers} khách (~${formatMoney(happyPay.extraValue)} lợi) so tiền giảm giá ~${formatMoney(happyPay.discountCost)} — hiệu quả ~${happyPay.efficiency.toFixed(1)}×, giữ mức này.`
                  : happyPay.verdict === 'ok'
                  ? `Kéo thêm ~${happyPay.extraCustomers} khách (~${formatMoney(happyPay.extraValue)} lợi) nhưng tiền giảm giá ~${formatMoney(happyPay.discountCost)} chiếm phần lớn (hiệu quả ~${happyPay.efficiency.toFixed(1)}×) — cân nhắc hạ mức chiết khấu để lời hơn.`
                  : `Tiền giảm giá ~${formatMoney(happyPay.discountCost)} vượt lợi khách kéo thêm (~${formatMoney(happyPay.extraValue)}) — giờ vàng đang tốn, nên hạ mức giảm hoặc đổi giờ sang giờ vắng.`}
              </div>
            </Callout>
          )}
          {missRev && missRev.totalLoss > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>📦 Hết hàng bỏ lỡ ~{formatMoney(missRev.totalLoss)} hôm nay</>}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {missRev.inStorageCount > 0 && missRev.outOfStockCount > 0
                  ? `${missRev.rows.length} món khách tìm mà kệ trống: ${missRev.inStorageCount} món còn trong kho (chỉ thiếu chỗ bày — xếp thêm lên kệ) · ${missRev.outOfStockCount} món hết cả kho (nhập thêm). ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : missRev.inStorageCount > 0
                  ? `${missRev.rows.length} món còn hàng trong kho nhưng kệ hết chỗ — bày thêm lên kệ để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : `${missRev.rows.length} món hết cả kho — nhập thêm để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`}
              </div>
            </Callout>
          )}
          {spoilNite && spoilNite.totalCost > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>🥀 Đêm qua hỏng ~{formatMoney(spoilNite.totalCost)} hàng</>}>
              <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                {spoilNite.rows.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => openPanel({ type: 'order' })}
                    style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    <span style={{ minWidth: 150 }}>{r.name}: {r.spoiled} món · vốn {formatMoney(r.cost)} →</span>
                    <span style={{ opacity: 0.8 }}>
                      {r.kind === 'cold' ? 'cần lạnh để ngoài tủ' : r.kind === 'short' ? 'món tươi hạn ngắn, nhập nhiều không kịp bán' : 'để lâu hết hạn'}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>Giảm bớt nhập món hay hỏng hoặc cất tủ lạnh hàng mát — chỉnh ở Nhập hàng.</div>
            </Callout>
          )}
    </>
  );
}
