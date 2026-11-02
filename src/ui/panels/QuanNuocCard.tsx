import type { BizState } from "../../data/biz";
import { formatMoney } from "../../data/products";
import { QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS } from "../../data/quanNuoc";
import { quanNuocHealth } from "../../data/quanNuocInsights";
import { Callout } from "./shared";

type Health = NonNullable<ReturnType<typeof quanNuocHealth>>;
type QuanState = Parameters<typeof quanNuocHealth>[0];

/** GĐ923: tách khỏi MorningPanel (nguyên văn thẻ "Quán nước"). */
export function QuanNuocCard({ quanNuoc, quanNuocLast, quanHealth }: { quanNuoc: QuanState; quanNuocLast: NonNullable<BizState['quanNuocLast']> | null; quanHealth: Health | null }) {
  const biz = { quanNuoc, quanNuocLast };
  return (
  <Callout tone={biz.quanNuocLast && biz.quanNuocLast.served < biz.quanNuocLast.wanted ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title="🧋 Quán nước">
    {biz.quanNuocLast ? (
      <>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Hôm qua: {biz.quanNuocLast.served}/{biz.quanNuocLast.wanted} ly · {formatMoney(biz.quanNuocLast.revenue)}
        </div>
        {quanHealth?.shortYesterday && quanHealth.missedRevenue > 0 && (
          <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>💸 Hôm qua bỏ lỡ ~{formatMoney(quanHealth.missedRevenue)} vì kho thiếu — nhập nước/ngọt/cà phê để bán đủ.</div>
        )}
      </>
    ) : (
      <div style={{ fontSize: 12, marginTop: 2 }}>Mới mở — kết quả có sau đêm đầu.</div>
    )}
    <div style={{ fontSize: 12, marginTop: 2 }}>
      Hôm nay: {biz.quanNuoc.staff} nhân viên · giá {QUAN_PRICE_OPTIONS[biz.quanNuoc.price].label} · lương {formatMoney(biz.quanNuoc.staff * QUAN_NUOC_WAGE)}/ngày
    </div>
    {quanHealth && !quanHealth.driesMain && quanHealth.hire && quanHealth.hireMarginal !== null && (
      <div style={{ fontSize: 12, marginTop: 2, color: quanHealth.hireMarginal >= 0 ? '#2ecc71' : '#e67e22' }}>
        {quanHealth.hireMarginal >= 0
          ? `💰 Tuyển 1 người: lời ròng ~${formatMoney(quanHealth.hire.profit)} (đang ~${formatMoney(quanHealth.tonight.profit)}, +${formatMoney(quanHealth.hireMarginal)}/ngày) — đáng so với lương ${formatMoney(QUAN_NUOC_WAGE)}.`
          : `💰 Tuyển thêm 1 người chưa đáng: bán thêm ${formatMoney(quanHealth.hire.served - quanHealth.tonight.served)} ly nhưng lương ${formatMoney(QUAN_NUOC_WAGE)}/ngày cao hơn lời tăng (lời ròng ~${formatMoney(quanHealth.hire.profit)} vs ~${formatMoney(quanHealth.tonight.profit)}).`}
      </div>
    )}
    {quanHealth?.driesMain && (
      <div style={{ fontSize: 12, marginTop: 2, color: '#e74c3c' }}>
        🥤 Kho chỉ còn {quanHealth.drinkUnitsNow} ly đồ uống (quán tiêu {quanHealth.consumedYesterday} ly hôm qua) — tối nay ăn hết là kệ tiệm chính cạn nước. Nhập nước/ngọt/cà phê.
      </div>
    )}
  </Callout>
  );
}
