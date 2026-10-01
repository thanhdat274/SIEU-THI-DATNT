import React from 'react';
import { getSeasonForDay, seasonDaysLeft } from '@game/data';
import { useGameStore } from '../store/useGameStore';
import { money, PixelButton, PixelIcon, PixelProgress, PixelStat } from './pixel';

interface HUDProps {
  onToggleStoreStatus: () => void;
  gameSpeed: number;
  onToggleGameSpeed: () => void;
  activeCustomers: number;
  onToggleWarehouseDock: () => void;
  isWarehouseDockOpen: boolean;
  onOpenLayout: () => void;
  canEditLayout: boolean;
  onOpenQuests: () => void;
  onOpenStalls: () => void;
  onOpenStaff: () => void;
  wageDebt?: number;
  market?: { weather: { label: string; icon: string }; forecast: Array<{ label: string }>; events?: Array<{ id: string; label: string; status: string; startsIn: number; notice: string }> };
  onOpenMarket?: () => void;
  onOpenTax?: () => void;
  onOpenLevelRoadmap: () => void;
  customerRating?: number;
  onOpenRegulars?: () => void;
  onOpenSkills?: () => void;
  onOpenTitles?: () => void;
}
export const HUD: React.FC<HUDProps> = ({onToggleStoreStatus, gameSpeed, onToggleGameSpeed, activeCustomers, onToggleWarehouseDock, isWarehouseDockOpen, onOpenLayout, canEditLayout, onOpenQuests, onOpenStalls, market, onOpenMarket, onOpenTax, onOpenStaff, onOpenLevelRoadmap, onOpenRegulars, onOpenSkills, onOpenTitles, customerRating = 4, wageDebt = 0}) => {
  const {player, worldTime, timeString, toggleSaveModal} = useGameStore();
  const season = getSeasonForDay(worldTime.day);
  const weather = market?.weather;
  const forecastText = market?.forecast.map(item => item.label).join(', ') ?? '';
  const forecastFirst = market?.forecast[0]?.label ?? '';
  return <header className="game-hud">
    <div className="brand" title="Tiệm Tạp Hóa Đầu Hẻm"><div className="brand-sign"><PixelIcon name="warehouse" size={26}/></div><div className="brand-copy">{player.activeTitle ? <p className="eyebrow" style={{ cursor: onOpenTitles ? 'pointer' : 'default', color: '#ffd56b' }} onClick={onOpenTitles} title="Bấm để xem/đổi danh hiệu">{player.activeTitle}</p> : <p className="eyebrow">Một góc nhỏ · Một đời vui</p>}<h1>Tiệm Tạp Hóa Đầu Hẻm</h1></div></div>
    <div className="hud-clock" title={`Ngày ${worldTime.day} · ${timeString} (${worldTime.isStoreOpen ? 'Đang mở cửa' : 'Nghỉ bán'})`}><PixelIcon name={worldTime.hour >= 18 ? 'moon' : 'sun'} size={24}/><div><strong className="tabular">Ngày {worldTime.day} · {timeString}</strong><span className="muted hud-store-status">{worldTime.isStoreOpen ? 'Bà con đang ghé tiệm' : 'Tiệm đang nghỉ bán'}</span>{weather && <span className="muted hud-weather-badge" title={`Dự báo: ${forecastText}`}>{weather.icon} {weather.label} · mai {forecastFirst}</span>}{market?.events?.map(event => <span key={event.id} className="muted hud-event-badge" title={event.notice}>{event.status === 'active' ? '⚡' : '⏳'} {event.label}{event.status === 'upcoming' ? ` · sau ${event.startsIn} ngày` : ''}</span>)}{season && <span className="muted hud-season-badge" title={season.blurb}>🎉 {season.name} · còn {seasonDaysLeft(worldTime.day)} ngày</span>}</div></div>
    <div className="hud-stats">
      <PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin"/>
      <PixelStat label="Đánh giá khách" value={`${customerRating.toFixed(1)} ★`} icon="heart"/>
      <button type="button" className="hud-level" onClick={onOpenLevelRoadmap} title="Xem tiến độ XP và các mốc mở khóa" aria-label={`Cấp ${player.level}, xem lộ trình cấp`}><strong>Cấp {player.level}</strong><span className="muted"> · {player.experience}/{player.experienceToNextLevel}</span><PixelProgress label="Kinh nghiệm" value={player.experience} max={player.experienceToNextLevel}/></button>
      {wageDebt > 0 && <button type="button" className="hud-debt" onClick={onOpenStaff} title="Nợ lương nhân viên: bấm để xem" aria-label={`Nợ lương ${money(wageDebt)}`}><PixelIcon name="coin" size={16}/><span>Nợ lương {money(wageDebt)}</span></button>}
      <div className="hud-customers"><PixelStat label="Khách trong tiệm" value={activeCustomers} icon="person"/></div>
    </div>
    <nav className="hud-actions" aria-label="Điều hành tiệm">
      <PixelButton icon="door" variant={worldTime.isStoreOpen ? 'teal' : 'brick'} onClick={onToggleStoreStatus} aria-label={worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'} title={worldTime.isStoreOpen ? 'Đang mở cửa (Bấm để đóng)' : 'Đang đóng cửa (Bấm để mở)'} className="btn-store-toggle"><span>{worldTime.isStoreOpen ? 'Mở cửa' : 'Nghỉ bán'}</span></PixelButton>
      {!worldTime.isStoreOpen && canEditLayout && <PixelButton icon="warehouse" onClick={onOpenLayout} aria-label="Sắp xếp cửa hàng" title="Sắp xếp cửa hàng"><span className="button-label">Sắp xếp</span></PixelButton>}
      <PixelButton icon="speed" onClick={onToggleGameSpeed} aria-label={`Tốc độ ${gameSpeed}x`} title={`Tốc độ thời gian ${gameSpeed}x`}>{gameSpeed}×</PixelButton>
      <PixelButton icon="warehouse" onClick={onToggleWarehouseDock} aria-label="Kho hàng" aria-expanded={isWarehouseDockOpen} title="Kho hàng sau tiệm"><span className="button-label">Kho</span></PixelButton>
      <PixelButton icon="person" onClick={onOpenStaff} aria-label="Nhân viên" title={player.level >= 2 ? 'Tuyển và xếp ca nhân viên' : 'Nhân viên: mở tuyển ở cấp 2'}><span className="button-label">Nhân viên</span></PixelButton>
      {onOpenRegulars && <PixelButton icon="heart" onClick={onOpenRegulars} aria-label="Khách quen" title="Sổ khách quen đầu hẻm"><span className="button-label">Khách quen</span></PixelButton>}
      {onOpenSkills && <PixelButton icon="star" onClick={onOpenSkills} aria-label="Kỹ năng" title="Kỹ năng & Đặc quyền buôn bán"><span className="button-label">Kỹ năng</span></PixelButton>}
      {onOpenTitles && <PixelButton icon="star" onClick={onOpenTitles} aria-label="Danh hiệu" title="Danh hiệu chủ tiệm"><span className="button-label">Danh hiệu</span></PixelButton>}
      {onOpenMarket && <PixelButton icon="sun" onClick={onOpenMarket} aria-label="Thị trường và thời tiết" title="Thời tiết, mùa, lượng khách"><span className="button-label">Thị trường</span></PixelButton>}
      {onOpenTax && <PixelButton icon="book" onClick={onOpenTax} aria-label="Thuế và sổ kinh doanh" title="Theo dõi doanh thu năm, thông tin thuế"><span className="button-label">Thuế</span></PixelButton>}
      <PixelButton icon="coin" onClick={onOpenStalls} aria-label="Quầy ăn uống" title="Quầy ăn uống & dịch vụ"><span className="button-label">Quầy</span></PixelButton>
      <PixelButton icon="star" onClick={onOpenQuests} aria-label="Nhiệm vụ" title="Nhiệm vụ buôn bán"><span className="button-label">Nhiệm vụ</span></PixelButton>
      <PixelButton icon="save" onClick={toggleSaveModal} aria-label="Lưu tiến trình" title="Lưu tiến trình"/>
    </nav>
  </header>;
};
