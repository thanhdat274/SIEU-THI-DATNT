import React from 'react';
import { SEASON_EVENTS, SEASON_YEAR_DAYS, getDayOfYear, type SeasonEvent } from '@game/data';
import { PixelDialog } from './pixel';

interface MarketSummary {
  weather: { id: string; label: string; icon: string };
  forecast: Array<{ id: string; label: string; icon: string }>;
  season: SeasonEvent | null;
  climate: { name: string };
  timeBand: { label: string };
  weekday: string;
  traffic: { value: number; factors: Array<{ ruleId: string; label: string; factor: number }> };
  events: Array<{ id: string; label: string; notice: string; status: 'active' | 'upcoming'; daysLeft: number; startsIn: number }>;
}

interface MarketModalProps {
  summary: MarketSummary;
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

export const MarketModal: React.FC<MarketModalProps> = ({ summary, day, onClose }) => (
  <PixelDialog icon="sun" title="THỊ TRƯỜNG HẺM" subtitle={`${summary.weekday} · ${summary.timeBand.label} · ${summary.climate.name}`} onClose={onClose}>
    <h3>Thời tiết</h3>
    <p className="pixel-panel" style={{ padding: 8 }}>
      <strong>Hôm nay: {summary.weather.icon} {summary.weather.label}</strong>
      {summary.forecast.map((item, index) => <span key={index} className="muted"> · {index === 0 ? 'Ngày mai' : 'Ngày kia'}: {item.icon} {item.label}</span>)}
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
    <h3>Vì sao lượng khách hôm nay như vậy? ({summary.traffic.value.toFixed(2)}×)</h3>
    {summary.traffic.factors.length
      ? <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{summary.traffic.factors.map(item => <li key={item.ruleId}>{item.label}: <strong className="tabular">{percent(item.factor)}</strong></li>)}</ul>
      : <p className="muted">Không có yếu tố đặc biệt: lượng khách ở mức bình thường.</p>}
  </PixelDialog>
);
