import React from 'react';
import type { PlayerData } from '@game/shared';
import { getLevelUnlocks, MAX_PLAYER_LEVEL, LEVEL_XP_THRESHOLDS } from '@game/core';
import { xpForLevel } from '@game/data';
import { PixelDialog, PixelProgress } from './pixel';

export interface Props { player: PlayerData; onClose: () => void }

const xp = (value: number) => `${Math.max(0, Math.ceil(value)).toLocaleString('vi-VN')} XP`;

export const LevelRoadmapModal: React.FC<Props> = ({ player, onClose }) => {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, player.level));
  const capped = level >= MAX_PLAYER_LEVEL;
  const rows = Array.from({ length: MAX_PLAYER_LEVEL - 1 }, (_, index) => index + 2).map(targetLevel => ({
    level: targetLevel,
    xpFromCurrent: Math.max(0, xpForLevel(targetLevel) - xpForLevel(level) - player.experience),
    unlocks: getLevelUnlocks(targetLevel),
  }));

  return <PixelDialog icon="star" title="LỘ TRÌNH CẤP ĐỘ" subtitle={`Tiến trình đến cấp ${MAX_PLAYER_LEVEL} · xem XP và từng mốc mở khóa`} onClose={onClose}>
    <section className="pixel-panel" style={{ padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong>{capped ? `Cấp tối đa ${MAX_PLAYER_LEVEL}` : `Cấp ${level} → ${level + 1}`}</strong>
        <span className="muted">{capped ? 'Bạn đã đạt cấp tối đa' : `${xp(player.experience)} / ${xp(player.experienceToNextLevel)}`}</span>
      </div>
      {!capped && <>
        <PixelProgress label="Tiến độ lên cấp" value={player.experience} max={player.experienceToNextLevel}/>
        <p className="muted" style={{ margin: '6px 0 0' }}>Còn {xp(player.experienceToNextLevel - player.experience)} để lên cấp {level + 1}.</p>
      </>}
    </section>

    <h3>Các mốc mở khóa</h3>
    <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
      {rows.map(({ level: targetLevel, xpFromCurrent, unlocks }) => {
        const reached = targetLevel <= level;
        const hasUnlock = unlocks.products.length + unlocks.suppliers.length + unlocks.stalls.length + unlocks.plots.length + unlocks.staffSlots + unlocks.customerCapacity > 0 || unlocks.trafficMultiplier > 0 || targetLevel === MAX_PLAYER_LEVEL;
        return <li key={targetLevel} className="pixel-panel" style={{ padding: 10, borderColor: targetLevel === level + 1 ? 'var(--teal)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <strong>{reached ? '✓ ' : '🔒 '}Cấp {targetLevel}</strong>
            <span className="muted">{reached ? 'Đã đạt' : `Cần thêm ${xp(xpFromCurrent)}`}</span>
          </div>
          {hasUnlock ? <div style={{ marginTop: 5, display: 'grid', gap: 4 }}>
            {unlocks.staffUnlocked && <span>🧑‍💼 Mở tuyển nhân viên</span>}
            {unlocks.staffSlots > 0 && <span>🧑‍💼 Thêm {unlocks.staffSlots} chỗ nhân viên</span>}
            {unlocks.trafficMultiplier > 0 && <span>🚶 Lưu lượng khách tăng thêm {unlocks.trafficMultiplier.toFixed(1)}×</span>}
            {unlocks.customerCapacity > 0 && <span>👥 Tăng sức chứa {unlocks.customerCapacity} khách đồng thời</span>}
            {unlocks.suppliers.map(name => <span key={name}>🚚 Nhà cung cấp: {name}</span>)}
            {unlocks.stalls.map(name => <span key={name}>🥤 Có thể mở quầy: {name}</span>)}
            {unlocks.plots.map(plot => <span key={plot.name}>🏠 Có thể mua {plot.name} ({plot.cost.toLocaleString('vi-VN')} ₫){plot.prerequisite ? ` · cần ${plot.prerequisite}` : ''}</span>)}
            {unlocks.products.length > 0 && <details open={targetLevel === level + 1}>
              <summary>🛒 {unlocks.products.length} mặt hàng mới</summary>
              <span>{unlocks.products.join(' · ')}</span>
            </details>}
            {targetLevel === MAX_PLAYER_LEVEL && <span>⭐ Đạt giới hạn cấp hiện tại; tiếp tục XP không làm tăng cấp.</span>}
          </div> : <p className="muted" style={{ margin: '5px 0 0' }}>Chưa có mở khóa riêng được thiết kế cho mốc này.</p>}
        </li>;
      })}
    </ol>
    <p className="muted">XP tích lũy để đạt từng cấp: {LEVEL_XP_THRESHOLDS.slice(1).map((threshold, index) => `C${index + 2}: ${threshold.toLocaleString('vi-VN')}`).join(' · ')}.</p>
    <p className="muted">Mở khóa là quyền sử dụng; mua đất/quầy vẫn cần đủ tiền và điều kiện. Lưu lượng spawn được giới hạn trong core để giữ nhịp chơi và bản đồ hiện tại.</p>
  </PixelDialog>;
};
