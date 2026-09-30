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
}
export const HUD: React.FC<HUDProps> = ({onToggleStoreStatus, gameSpeed, onToggleGameSpeed, activeCustomers, onToggleWarehouseDock, isWarehouseDockOpen, onOpenLayout, canEditLayout, onOpenQuests, onOpenStalls}) => {
  const {player, worldTime, timeString, toggleSaveModal} = useGameStore();
  const season = getSeasonForDay(worldTime.day);
  return <header className="game-hud">
    <div className="brand"><div className="brand-sign"><PixelIcon name="warehouse" size={28}/></div><div><p className="eyebrow">Một góc nhỏ · Một đời vui</p><h1>Tiệm Tạp Hóa Đầu Hẻm</h1></div></div>
    <div className="hud-clock"><PixelIcon name={worldTime.hour >= 18 ? 'moon' : 'sun'} size={26}/><div><strong className="tabular">Ngày {worldTime.day} · {timeString}</strong><span className="muted">{worldTime.isStoreOpen ? 'Bà con đang ghé tiệm' : 'Tiệm đang nghỉ bán'}</span>{season && <span className="muted" title={season.blurb}>🎉 {season.name} · còn {seasonDaysLeft(worldTime.day)} ngày</span>}</div></div>
    <div className="hud-stats">
      <PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin"/>
      <div className="hud-level" title={`${player.experience}/${player.experienceToNextLevel} XP`}><strong>Cấp {player.level}</strong><span className="muted"> · {player.experience}/{player.experienceToNextLevel}</span><PixelProgress label="Kinh nghiệm" value={player.experience} max={player.experienceToNextLevel}/></div>
      <div className="hud-customers"><PixelStat label="Khách trong tiệm" value={activeCustomers} icon="person"/></div>
    </div>
    <nav className="hud-actions" aria-label="Điều hành tiệm">
      <PixelButton icon="door" variant={worldTime.isStoreOpen ? 'teal' : 'brick'} onClick={onToggleStoreStatus} aria-label={worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'}><span>{worldTime.isStoreOpen ? 'Mở cửa' : 'Nghỉ bán'}</span></PixelButton>
      {!worldTime.isStoreOpen && canEditLayout && <PixelButton icon="warehouse" onClick={onOpenLayout} aria-label="Sắp xếp cửa hàng"><span className="button-label">Sắp xếp</span></PixelButton>}
      <PixelButton icon="speed" onClick={onToggleGameSpeed} aria-label={`Tốc độ ${gameSpeed}x`}>{gameSpeed}×</PixelButton>
      <PixelButton icon="warehouse" onClick={onToggleWarehouseDock} aria-label="Kho hàng" aria-expanded={isWarehouseDockOpen}><span className="button-label">Kho</span></PixelButton>
      <PixelButton icon="coin" onClick={onOpenStalls} aria-label="Quầy ăn uống"><span className="button-label">Quầy</span></PixelButton>
      <PixelButton icon="star" onClick={onOpenQuests} aria-label="Nhiệm vụ"><span className="button-label">Nhiệm vụ</span></PixelButton>
      <PixelButton icon="save" onClick={toggleSaveModal} aria-label="Lưu tiến trình"/>
    </nav>
  </header>;
};
