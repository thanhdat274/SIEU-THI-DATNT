import React from 'react';
import { PRODUCT_MAP, SEASON_EVENTS, SEASON_YEAR_DAYS, getDayOfYear, type SeasonEvent } from '@game/data';
import { describeRainForecast, type RainForecast } from '@game/core';
import { PixelDialog } from './pixel';

interface MarketSummary {
  weather: { id: string; label: string; icon: string; rain?: RainForecast | null };
  forecast: Array<{ id: string; label: string; icon: string; rain?: RainForecast | null }>;
  season: SeasonEvent | null;
  climate: { name: string };
  timeBand: { label: string };
  weekday: string;
  traffic: { value: number; factors: Array<{ ruleId: string; label: string; factor: number }> };
  events: Array<{ id: string; label: string; notice: string; status: 'active' | 'upcoming'; daysLeft: number; startsIn: number }>;
}

interface PriceRow { category: string; label: string; index: number; target: number; demand: number; scarcity: number; cost: number }

interface PlanRow {
  productId: string; stock: number; incoming: number; soldRecently: number; expectedToday: number; expectedTomorrow: number; trend: 'up' | 'down' | 'flat';
  reasons: string[]; daysOfStock: number | null; recommended: number; note?: string;
  flags: { lowStock: boolean; slowMoving: boolean; expiring: boolean }; expiring?: { quantity: number; earliestDay: number };
}
interface TrendingRow { productId: string; multiplier: number; reasons: string[]; available: boolean }

export interface MarketModalProps {
  summary: MarketSummary;
  prices?: PriceRow[];
  plans?: PlanRow[];
  trending?: TrendingRow[];
  day: number;
  onClose: () => void;
}

/** Lịch mùa tới: sự kiện kế tiếp tính theo ngày trong năm game. */
function upcomingSeasons(day: number) {
  const doy = getDayOfYear(day);
  return SEASON_EVENTS
    .map(season => ({ season, inDays: (season.startDayOfYear - doy + SEASON_YEAR_DAYS) % SEASON_YEAR_DAYS }))
    .filter(item => item.season.startDayOfYear > doy || item.season.endDayOfYear < doy)
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 3);
}

const percent = (factor: number) => `${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%`;

const TREND_LABEL = { up: '↑ tăng', down: '↓ giảm', flat: '→ ổn định' } as const;
const nameOf = (productId: string) => PRODUCT_MAP[productId]?.name ?? productId;

export const MarketModal: React.FC<MarketModalProps> = ({ summary, prices, plans, trending, day, onClose }) => {
  const attention = (plans ?? []).filter(plan => (plan.stock > 0 || plan.soldRecently > 0 || plan.incoming > 0) && (plan.flags.lowStock || plan.flags.slowMoving || plan.flags.expiring)).slice(0, 12);
  return (
  <PixelDialog icon="sun" title="THỊ TRƯỜNG HẺM" subtitle={`${summary.weekday} · ${summary.timeBand.label} · ${summary.climate.name}`} onClose={onClose}>
    <h3>Thời tiết</h3>
    <p className="pixel-panel" style={{ padding: 8 }}>
      <strong>Hôm nay: {summary.weather.icon} {summary.weather.label}{summary.weather.rain ? ` (${describeRainForecast(summary.weather.rain)})` : ''}</strong>
      {summary.forecast.map((item, index) => <span key={index} className="muted"> · {index === 0 ? 'Ngày mai' : 'Ngày kia'}: {item.icon} {item.label}{item.rain ? ` (${describeRainForecast(item.rain)})` : ''}</span>)}
    </p>
    <h3>Sự kiện trong hẻm</h3>
    {summary.events.length
      ? <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{summary.events.map(event => (
          <li key={event.id}><strong>{event.label}</strong> — {event.status === 'active' ? `đang diễn ra, còn ${event.daysLeft} ngày` : `bắt đầu sau ${event.startsIn} ngày`}. <span className="muted">{event.notice}</span></li>
        ))}</ul>
      : <p className="muted">Hiện không có sự kiện nào đang diễn ra hoặc sắp tới.</p>}
    <h3>Mùa</h3>
    {summary.season
      ? <p className="pixel-panel" style={{ padding: 8 }}><strong>{summary.season.name}</strong> — {summary.season.blurb}</p>
      : <p className="muted">Hiện chưa có sự kiện mùa nào.</p>}
    <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
      {upcomingSeasons(day).map(({ season, inDays }) => <li key={season.id} className="muted">{season.name}: sau {inDays} ngày</li>)}
    </ul>
    {prices && prices.length > 0 && <>
      <h3>Giá thị trường theo nhóm hàng</h3>
      <p className="muted">Giá tham chiếu so với giá gợi ý; đổi dần mỗi ngày. Giá bán hiện cố định theo giá gợi ý, nên khi thị trường đắt hơn khách dễ lấy hàng, khi rẻ hơn khách có thể bỏ hàng.</p>
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {prices.map(row => {
          const reasons = [
            Math.abs(row.demand - 1) >= 0.02 ? `nhu cầu ${percent(row.demand)}` : '',
            Math.abs(row.scarcity - 1) >= 0.01 ? `${row.scarcity > 1 ? 'khan hiếm' : 'ứ đọng'} ${percent(row.scarcity)}` : '',
            Math.abs(row.cost - 1) >= 0.01 ? `chi phí nhập ${percent(row.cost)}` : '',
          ].filter(Boolean).join(', ');
          const trend = row.target > row.index + 0.001 ? '↑' : row.target < row.index - 0.001 ? '↓' : '→';
          return <li key={row.category}>{row.label}: <strong className="tabular">{percent(row.index)}</strong> {trend} <span className="muted">{reasons || 'ổn định'}</span></li>;
        })}
      </ul>
    </>}
    {trending && trending.length > 0 && <>
      <h3>Món đang được ưa chuộng</h3>
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {trending.map(item => <li key={item.productId}><strong>{nameOf(item.productId)}</strong> <span className="tabular">{percent(item.multiplier)}</span> — {item.available ? 'có tồn hoặc nhập được' : 'chưa có hàng'} <span className="muted">{item.reasons.join(', ')}</span></li>)}
      </ul>
    </>}
    {plans && <>
      <h3>Kế hoạch tồn kho</h3>
      <p className="muted">Chỉ để tham khảo: bảng này không tự đặt hàng hay đổi giá. Nhu cầu dự kiến là số món/ngày, tính cho ngày mai theo dự báo.</p>
      {attention.length === 0
        ? <p className="muted">Chưa có món nào cần chú ý.</p>
        : <ul style={{ margin: '4px 0', paddingLeft: 18 }} aria-label="Món cần chú ý">
            {attention.map(plan => (
              <li key={plan.productId}>
                <strong>{nameOf(plan.productId)}</strong>: tồn {plan.stock}{plan.incoming ? ` (+${plan.incoming} đang về)` : ''}, cần ~{plan.expectedTomorrow}/ngày {TREND_LABEL[plan.trend]}
                {plan.flags.lowStock && <strong> · Sắp hết{plan.recommended > 0 ? `, nên nhập ${plan.recommended}` : ''}</strong>}
                {plan.flags.slowMoving && <strong> · Chậm bán</strong>}
                {plan.flags.expiring && plan.expiring && <strong> · Sắp hết hạn: {plan.expiring.quantity} món, ngày {plan.expiring.earliestDay}</strong>}
                {plan.note && <span className="muted"> · {plan.note}</span>}
                {plan.reasons.length > 0 && <span className="muted"> · {plan.reasons.join(', ')}</span>}
              </li>
            ))}
          </ul>}
    </>}
    <h3>Vì sao lượng khách hôm nay như vậy? ({summary.traffic.value.toFixed(2)}×)</h3>
    {summary.traffic.factors.length
      ? <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{summary.traffic.factors.map(item => <li key={item.ruleId}>{item.label}: <strong className="tabular">{percent(item.factor)}</strong></li>)}</ul>
      : <p className="muted">Không có yếu tố đặc biệt: lượng khách ở mức bình thường.</p>}
  </PixelDialog>
  );
};
