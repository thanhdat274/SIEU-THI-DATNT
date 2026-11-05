import type { CSSProperties } from 'react';
import { formatMoney, productById } from '../data/products';
import { PREP_MIN_QTY } from '../data/festivalPrep';
import type { festivalRestockPlan } from '../data/festivalRestock';
import type { quanNuocRestockTip } from '../data/quanNuocInsights';
import type { supplyRestockManifest } from '../data/supplyChain';
import type { guideProducts } from '../data/onboarding';
import { dayTraffic, describeDay } from '../data/weather';
import { monthlyRelRebate, tierProgress } from '../data/supplierRel';
import { Callout } from './panels/shared';

/** GĐ947: các banner/callout đầu OrderPanel, tách nguyên văn. Hành động (điền giỏ) truyền qua props. */
const btn: CSSProperties = { border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11, marginTop: 6 };
const guideBanner: CSSProperties = { background: 'rgba(52, 152, 219, 0.14)', border: '1px solid #3498db', borderRadius: 8, padding: '10px 12px', margin: '6px 0 10px', fontSize: 13 };
const guideBannerReady: CSSProperties = { border: '1px solid #2ecc71', background: 'rgba(46, 204, 113, 0.12)' };

export function GuideBanner({ guideItems, guideIn }: { guideItems: ReturnType<typeof guideProducts>; guideIn: string[] }) {
  return (
    <div style={{ ...guideBanner, ...(guideIn.length ? guideBannerReady : {}) }}>
      <div style={{ fontWeight: 700 }}>🧭 Ngày đầu tiên: nhập 3 món trước</div>
      <div style={{ marginTop: 3, fontSize: 12 }}>
        {guideItems.map((g, gi) => (
          <span key={g.id}>
            {guideIn.includes(g.id) ? '✅' : '⬜'} {g.name}
            {gi < guideItems.length - 1 && <span style={{ opacity: 0.6 }}> · </span>}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: guideIn.length ? '#2ecc71' : '#f1c40f' }}>
        {guideIn.length ? 'Sẵn sàng đặt hàng!' : 'Mỗi món một thùng là đủ cho ngày đầu.'}
      </div>
    </div>
  );
}

export function QuanDrinkTipCallout({ tip: restockTip, onFill }: { tip: NonNullable<ReturnType<typeof quanNuocRestockTip>>; onFill: () => void }) {
  return (
    <Callout
      tone={restockTip.verdict}
      title={restockTip.verdict === 'danger' ? '🚨 Nạp thêm đồ uống cho quán nước' : '🥤 Quán nước sắp ăn khô kho chung'}
      style={{ margin: '8px 0 6px' }}
    >
      <div style={{ fontSize: 12 }}>
        {restockTip.verdict === 'danger'
          ? `Hôm qua quán nước bỏ lỡ ~${restockTip.missedRevenue.toLocaleString('vi-VN')}đ vì kho thiếu đồ uống. `
          : 'Quán nước chung kho với kệ tiệm chính — '}
        tối nay quán cần ~{restockTip.wanted} ly mà kho chỉ còn {restockTip.have}{restockTip.shortfall > 0
          ? <> — nhập thêm ít nhất <b>{restockTip.shortfall} ly</b> nước/ngọt/cà phê</>
          : ' (đã đủ, chỉ nhắc lại tín hiệu hôm qua)'}.
        {restockTip.bottleneck && <> Nút thắt: <b>{restockTip.bottleneck}</b> — mua đúng thứ đó mới pha thêm ly.</>}
      </div>
      {restockTip.shortfall > 0 && (
        <button style={btn} onClick={onFill}>
          ➕ Nạp đồ uống quán nước vào giỏ
        </button>
      )}
    </Callout>
  );
}

export function FestivalPrepCallout({ plan: festivalPlan, onFill }: { plan: NonNullable<ReturnType<typeof festivalRestockPlan>>; onFill: () => void }) {
  return (
    <Callout tone="accent" title={`⏳ ${festivalPlan.festival.icon} ${festivalPlan.festival.name} ${festivalPlan.inDays === 1 ? 'ngày mai' : `sau ${festivalPlan.inDays} ngày`} — trữ lễ còn thiếu ${festivalPlan.lines.length} món`} style={{ margin: '8px 0 6px' }}>
      <div style={{ fontSize: 12 }}>
        Trữ đủ mỗi món ≥ {PREP_MIN_QTY} trong kho trước khi lễ bắt đầu → thưởng đón lễ <b style={{ color: '#2ecc71' }}>+{formatMoney(festivalPlan.bonus)}</b>.
        {festivalPlan.skipped.length > 0 && <> Món mối này không bán: {festivalPlan.skipped.map((id) => productById(id).name).join(', ')} — đổi mối để trữ nốt.</>}
      </div>
      <button style={btn} onClick={onFill}>
        ➕ Trữ lễ vào giỏ
      </button>
    </Callout>
  );
}

export function NetworkFillCallout({ manifest: netManifest, onFillBranch }: { manifest: ReturnType<typeof supplyRestockManifest>; onFillBranch: () => void }) {
  return (
    <Callout tone={netManifest.buyNeed > 0 ? 'warn' : 'info'} title="🔗 Nạp liền mạng lưới (rốn kho chung)" style={{ margin: '8px 0 6px' }}>
      <div style={{ fontSize: 12 }}>
        <div>{netManifest.line}.</div>
        {netManifest.lines.filter((l) => l.outlet === 'branch').length > 0 && (
          <div style={{ marginTop: 3, fontSize: 11, opacity: 0.9 }}>
            Chi nhánh kệ cần: {netManifest.lines.filter((l) => l.outlet === 'branch').map((l) => `${l.label} ${l.need}${l.source === 'buy' ? ' (mua)' : ''}`).join(' · ')}
          </div>
        )}
        {netManifest.lines.some((l) => l.outlet === 'branch') && (
          <button style={btn} onClick={onFillBranch}>
            ➕ Điền kệ chi nhánh vào giỏ
          </button>
        )}
      </div>
    </Callout>
  );
}

/** GĐ957: dòng mối quen nhà cung cấp (bậc, tiến độ, hoàn cuối tháng), tách nguyên văn. */
export function SupplierRelLine({ life, monthSpent }: { life: number; monthSpent: number }) {
  const { cur, next, pct } = tierProgress(life);
  const rebate = monthlyRelRebate(life, monthSpent);
  const monthLeft = Math.max(0, cur.commit - monthSpent);
  return (
    <span>
      🤝 Mối quen: <b style={{ color: cur.level >= 3 ? '#e74c3c' : '#fff' }}>{cur.icon} {cur.name}</b>
      {next ? ` · ${pct}% tới ${next.icon} ${next.name}` : ' · đã tối đa'}
      {" "}· tháng này mua <b>{formatMoney(monthSpent)}</b>
      {cur.level > 0 && (rebate > 0
        ? <span style={{ color: '#2ecc71' }}> → sẽ hoàn {formatMoney(rebate)} cuối tháng ✓</span>
        : <span style={{ opacity: 0.8 }}> · còn {formatMoney(monthLeft)} nữa đạt cam kết ({Math.round(cur.rate * 100)}% hoàn)</span>)}
    </span>
  );
}

/** GĐ957: dòng dự báo thời tiết 2 ngày tới, tách nguyên văn. */
export function ForecastLine({ forecast, weatherSeed, day }: { forecast: Parameters<typeof describeDay>[2][]; weatherSeed: number; day: number }) {
  return (
    <>
          🌦️ Dự báo: {forecast.map((w, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <b>{i ? 'Ngày kia' : 'Mai'}</b> {describeDay(weatherSeed, day + 1 + i, w)} · khách {Math.round(dayTraffic(weatherSeed, day + 1 + i, w) * 100)}% ngày thường
            </span>
          ))}
          <span style={{ opacity: 0.75 }}> · Số gợi ý đã tính theo thời tiết. Hàng mát, đông lạnh, tươi để trong kho hỏng nhanh: nên bày vào tủ.</span>
    </>
  );
}
