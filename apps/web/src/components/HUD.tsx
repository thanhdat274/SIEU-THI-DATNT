import React, { useState } from 'react';
import { PRESTIGE_XP_PER_STAR, getSeasonForDay, seasonDaysLeft } from '@game/data';
import { describeRainForecast, type RainForecast } from '@game/core';
import { useShallow } from 'zustand/react/shallow';
import { sameData, useGameStore } from '../store/useGameStore';
import { money, PixelButton, PixelIcon, PixelProgress, PixelStat } from './pixel';
import { ManagementModal } from './ManagementModal';

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
  onPayWageDebt?: () => void;
  wageDebt?: number;
  market?: { weather: { label: string; icon: string; rain?: RainForecast | null }; forecast: Array<{ label: string; rain?: RainForecast | null }>; events?: Array<{ id: string; label: string; status: string; startsIn: number; notice: string }> };
  onOpenMarket?: () => void;
  /** Mở màn chỉnh giá bán tập trung. */
  onOpenPrices?: () => void;
  onOpenTax?: () => void;
  onOpenLevelRoadmap: () => void;
  customerRating?: number;
  onOpenRegulars?: () => void;
  onOpenSkills?: () => void;
  onOpenTitles?: () => void;
  /** Mở danh sách lời khách nhận xét (bấm vào điểm đánh giá). */
  onOpenReviews?: () => void;
  /** Mở màn An ninh (chỉ truyền khi đã mở khóa). */
  onOpenSecurity?: () => void;
  onOpenAnalytics?: () => void;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  /** Số kệ/tủ mát đang mòn hoặc hỏng; > 0 thì hiện nút Sửa chữa. */
  maintenanceAlerts?: number;
  onOpenMaintenance?: () => void;
  onOpenChain?: () => void;
  onOpenPlanogram?: () => void;
  emptySlotsCount?: number;
  /** Mốc lưu gần nhất (ISO) để hiện trong mục Lưu tiến trình của sổ quản lý. */
  lastSavedAt?: string;
}
const HUDInner: React.FC<HUDProps> = ({onToggleStoreStatus, gameSpeed, onToggleGameSpeed, activeCustomers, onToggleWarehouseDock, isWarehouseDockOpen, onOpenLayout, canEditLayout, onOpenQuests, onOpenStalls, market, onOpenMarket, onOpenPrices, onOpenTax, onOpenStaff, onPayWageDebt, onOpenLevelRoadmap, onOpenRegulars, onOpenSkills, onOpenTitles, onOpenReviews, onOpenSecurity, onOpenAnalytics, audioMuted, onToggleAudioMute, maintenanceAlerts = 0, onOpenMaintenance, onOpenChain, customerRating = 4, wageDebt = 0, onOpenPlanogram, emptySlotsCount = 0, lastSavedAt}) => {
  const {player, worldTime, timeString, toggleSaveModal} = useGameStore(useShallow((s) => ({player: s.player, worldTime: s.worldTime, timeString: s.timeString, toggleSaveModal: s.toggleSaveModal})));
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const season = getSeasonForDay(worldTime.day);
  const weather = market?.weather;
  const rainNote = (rain?: RainForecast | null) => (rain ? ` (${describeRainForecast(rain)})` : '');
  const forecastText = market?.forecast.map(item => `${item.label}${rainNote(item.rain)}`).join(', ') ?? '';
  const todayRainText = rainNote(weather?.rain);
  const forecastFirst = market?.forecast[0]?.label ?? '';

  const hasUrgentAlert = (maintenanceAlerts ?? 0) > 0 || wageDebt > 0;

  return (
    <>
      <header className="game-hud">
        <div className="brand" data-hud="decor" title="Tiệm Tạp Hóa Đầu Hẻm">
          <div className="brand-sign"><PixelIcon name="warehouse" size={26}/></div>
          <div className="brand-copy">
            {player.activeTitle ? <p className="eyebrow" style={{ cursor: onOpenTitles ? 'pointer' : 'default', color: '#ffd56b' }} onClick={onOpenTitles} title="Bấm để xem/đổi danh hiệu">{player.activeTitle}</p> : <p className="eyebrow">Một góc nhỏ · Một đời vui</p>}
            <h1>Tiệm Tạp Hóa Đầu Hẻm</h1>
          </div>
        </div>
        <div className="hud-clock" title={`Ngày ${worldTime.day} · ${timeString} (${worldTime.isStoreOpen ? 'Đang mở cửa' : 'Nghỉ bán'})`}>
          <span className="hud-icon-wrap" data-hud="decor"><PixelIcon name={worldTime.hour >= 18 ? 'moon' : 'sun'} size={24}/></span>
          <div>
            <strong className="tabular">Ngày {worldTime.day} · {timeString}</strong>
            <span className="muted hud-store-status" data-hud="detail">{worldTime.isStoreOpen ? 'Bà con đang ghé tiệm' : 'Tiệm đang nghỉ bán'}</span>
            {weather && <span className="muted hud-weather-badge" title={`Hôm nay${todayRainText}. Dự báo: ${forecastText}`}>{weather.icon} {weather.label} · mai {forecastFirst}</span>}
            {market?.events?.map(event => <span key={event.id} className="muted hud-event-badge" title={event.notice}>{event.status === 'active' ? '⚡' : '⏳'} {event.label}{event.status === 'upcoming' ? ` · sau ${event.startsIn} ngày` : ''}</span>)}
            {season && <span className="muted hud-season-badge" title={season.blurb}>🎉 {season.name} · còn {seasonDaysLeft(worldTime.day)} ngày</span>}
          </div>
        </div>
        <div className="hud-stats">
          <PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin"/>
          {onOpenReviews
            ? <button type="button" onClick={onOpenReviews} title="Xem lời khách nhận xét" aria-label={`Đánh giá khách ${customerRating.toFixed(1)} sao, xem nhận xét`} className="hud-rating"><PixelStat label="Đánh giá khách" value={`${customerRating.toFixed(1)} ★`} icon="heart"/></button>
            : <PixelStat label="Đánh giá khách" value={`${customerRating.toFixed(1)} ★`} icon="heart"/>}
          <button type="button" className="hud-level" data-hud="important" onClick={onOpenLevelRoadmap} title="Xem tiến độ XP và các mốc mở khóa" aria-label={`Cấp ${player.level}, xem lộ trình cấp`}>
            <strong><span className="hud-lv-full">Cấp </span><span className="hud-lv-short">Lv</span>{player.level}{(player.prestigeStars ?? 0) > 0 ? ` · ★${player.prestigeStars}` : ''}</strong>
            <span className="muted"> · {player.experienceToNextLevel > 0 ? `${player.experience}/${player.experienceToNextLevel}` : `Prestige ${player.prestigeXp ?? 0}/${PRESTIGE_XP_PER_STAR}`}</span>
            <PixelProgress label="Kinh nghiệm" value={player.experienceToNextLevel > 0 ? player.experience : (player.prestigeXp ?? 0)} max={player.experienceToNextLevel > 0 ? player.experienceToNextLevel : PRESTIGE_XP_PER_STAR}/>
          </button>
          {wageDebt > 0 && <><button type="button" className="hud-debt" onClick={onOpenStaff} title="Nợ lương nhân viên: bấm để xem" aria-label={`Nợ lương ${money(wageDebt)}`}><PixelIcon name="coin" size={16}/><span>Nợ lương {money(wageDebt)}</span></button>{onPayWageDebt && <button type="button" className="hud-debt" onClick={onPayWageDebt} disabled={player.money <= 0} title="Trả nợ lương ngay bằng tiền đang có" aria-label="Trả nợ lương"><span style={{display:'inline'}}>Trả nợ</span></button>}</>}
          <div className="hud-customers" data-hud="important" title="Khách trong tiệm"><PixelStat label="Khách trong tiệm" value={activeCustomers} icon="person"/></div>
        </div>
        <nav className="hud-actions" aria-label="Điều hành tiệm">
          <PixelButton icon="door" variant={worldTime.isStoreOpen ? 'teal' : 'brick'} onClick={onToggleStoreStatus} aria-label={worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'} title={worldTime.isStoreOpen ? 'Đang mở cửa (Bấm để đóng)' : 'Đang đóng cửa (Bấm để mở)'} className="btn-store-toggle">
            <span>{worldTime.isStoreOpen ? 'Mở cửa' : 'Nghỉ bán'}</span>
          </PixelButton>
          {!worldTime.isStoreOpen && canEditLayout && (
            <PixelButton icon="warehouse" onClick={onOpenLayout} aria-label="Sắp xếp cửa hàng" title="Sắp xếp cửa hàng">
              <span className="button-label">Sắp xếp</span>
            </PixelButton>
          )}
          <PixelButton icon="speed" onClick={onToggleGameSpeed} aria-label={`Tốc độ ${gameSpeed}x`} title={`Tốc độ thời gian ${gameSpeed}x`}>{gameSpeed}×</PixelButton>
          <PixelButton icon="warehouse" onClick={onToggleWarehouseDock} aria-label={emptySlotsCount > 0 ? `Kho hàng, ${emptySlotsCount} ô kệ hết hàng` : 'Kho hàng'} aria-expanded={isWarehouseDockOpen} title="Kho hàng sau tiệm: xem tồn kho, mở sơ đồ kệ và bày hàng nhanh" className="btn-warehouse">
            <span className="button-label">Kho</span>
            {emptySlotsCount > 0 && (
              <span className="hud-management-badge" title={`${emptySlotsCount} ô kệ hết hàng`}>({emptySlotsCount})</span>
            )}
          </PixelButton>
          {onOpenPrices && (
            <PixelButton icon="coin" onClick={onOpenPrices} aria-label="Giá bán" title="Chỉnh giá bán các món">
              <span className="button-label">Giá bán</span>
            </PixelButton>
          )}
          <PixelButton icon="star" onClick={onOpenQuests} aria-label="Nhiệm vụ" title="Nhiệm vụ buôn bán">
            <span className="button-label">Nhiệm vụ</span>
          </PixelButton>
          <PixelButton
            icon="menu"
            variant={hasUrgentAlert ? 'brick' : 'paper'}
            onClick={() => setIsManagementOpen(true)}
            aria-label="Sổ quản lý tiệm"
            title="Sổ quản lý: nhân viên, khách quen, kỹ năng, thị trường, thuế, an ninh và tiện ích"
            className="btn-management"
          >
            <span className="button-label">Quản lý</span>
            {maintenanceAlerts > 0 ? (
              <span className="hud-management-badge" title={`${maintenanceAlerts} đồ cần sửa`}>({maintenanceAlerts})</span>
            ) : wageDebt > 0 ? (
              <span className="hud-management-badge" title="Nợ lương nhân viên">(!)</span>
            ) : null}
          </PixelButton>
        </nav>
      </header>

      {isManagementOpen && (
        <ManagementModal
          onClose={() => setIsManagementOpen(false)}
          onOpenStaff={onOpenStaff}
          wageDebt={wageDebt}
          playerLevel={player.level}
          onOpenRegulars={onOpenRegulars}
          onOpenSkills={onOpenSkills}
          onOpenTitles={onOpenTitles}
          onOpenMarket={onOpenMarket}
          onOpenTax={onOpenTax}
          onOpenStalls={onOpenStalls}
          onOpenSecurity={onOpenSecurity}
          onOpenAnalytics={onOpenAnalytics}
          audioMuted={audioMuted}
          onToggleAudioMute={onToggleAudioMute}
          maintenanceAlerts={maintenanceAlerts}
          onOpenMaintenance={onOpenMaintenance}
          onOpenChain={onOpenChain}
          onOpenLevelRoadmap={onOpenLevelRoadmap}
          onOpenPlanogram={onOpenPlanogram}
          emptySlotsCount={emptySlotsCount}
          onOpenLayout={onOpenLayout}
          canEditLayout={canEditLayout}
          isStoreOpen={worldTime.isStoreOpen}
          onToggleSaveModal={toggleSaveModal}
          lastSavedAt={lastSavedAt}
        />
      )}
    </>
  );
};

/**
 * HUD chỉ render lại khi props thật sự đổi: so sánh nông, riêng `market` (đối tượng mới mỗi lần App render) so theo nội dung.
 * Handler do App truyền có danh tính ổn định (`useStableCallbacks`) nên không làm HUD render lại.
 */
const hudPropsEqual = (a: HUDProps, b: HUDProps): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof HUDProps>;
  for (const k of keys) {
    if (k === 'market') { if (!sameData(a.market, b.market)) return false; continue; }
    if (!Object.is(a[k], b[k])) return false;
  }
  return true;
};
export const HUD = React.memo(HUDInner, hudPropsEqual);
