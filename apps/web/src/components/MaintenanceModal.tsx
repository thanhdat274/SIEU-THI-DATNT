import React from 'react';
import { MAINTENANCE_RULES } from '@game/data';
import type { MaintenanceAction, MaintenanceEntry } from '@game/core';
import { PixelButton, PixelDialog, money } from './pixel';

interface MaintenanceModalProps {
  entries: MaintenanceEntry[];
  playerMoney: number;
  playerLevel: number;
  onAction: (fixtureId: string, action: MaintenanceAction) => void | Promise<void>;
  onClose: () => void;
}

const STATUS_LABEL: Record<MaintenanceEntry['status'], { text: string; color: string }> = {
  good: { text: 'Còn tốt', color: '#2a7a43' },
  worn: { text: 'Đã mòn, nên bảo trì', color: '#a86b12' },
  broken_minor: { text: 'Hỏng nhẹ: sửa được', color: '#b64c3d' },
  broken_major: { text: 'Hỏng nặng: phải mua mới', color: '#8a1f12' },
};

const TYPE_LABEL: Record<string, string> = { shelf_wooden: 'Kệ gỗ', shelf_glass: 'Kệ kính', refrigerator: 'Tủ mát' };

/** Danh sách kệ/tủ mát kèm độ mòn; bảo trì, sửa nhẹ hoặc mua mới ngay tại đây. */
export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ entries, playerMoney, playerLevel, onAction, onClose }) => {
  const unlocked = playerLevel >= MAINTENANCE_RULES.unlockLevel;
  const sorted = [...entries].sort((a, b) => Number(b.status === 'broken_major') - Number(a.status === 'broken_major') || Number(!!b.broken) - Number(!!a.broken) || b.wear - a.wear);
  return (
    <PixelDialog icon="warning" title="SỬA CHỮA & BẢO TRÌ" subtitle="Kệ và tủ mát mòn dần mỗi đêm; hỏng thì không bán và không châm hàng được. Nhân viên châm hàng tự bảo trì đồ đã mòn mỗi đêm (có phí)" onClose={onClose}>
      {!unlocked && (
        <p className="pixel-panel" style={{ padding: 8 }}>Hao mòn bắt đầu từ cấp {MAINTENANCE_RULES.unlockLevel}; cấp hiện tại {playerLevel}.</p>
      )}
      {unlocked && !sorted.length && <p className="muted">Chưa có kệ hay tủ mát nào.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {sorted.map((entry) => {
          const status = STATUS_LABEL[entry.status];
          return (
            <div key={entry.fixtureId} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{entry.label} <span className="muted">({TYPE_LABEL[entry.type] ?? entry.type})</span></strong>
                <span style={{ color: status.color, fontWeight: 'bold' }}>{status.text}</span>
              </div>
              <div role="progressbar" aria-label={`Độ mòn ${entry.wear}%`} aria-valuenow={entry.wear} aria-valuemin={0} aria-valuemax={100}
                style={{ height: 8, background: '#e5d8c4', border: '1px solid #bfa993' }}>
                <div style={{ width: `${Math.min(100, entry.wear)}%`, height: '100%', background: entry.wear >= MAINTENANCE_RULES.breakFrom ? '#b64c3d' : entry.status === 'worn' ? '#e09f3e' : '#2a7a43' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 11 }}>Mòn {entry.wear}%</span>
                {entry.serviceCost !== undefined && (
                  <PixelButton variant="teal" disabled={!unlocked || playerMoney < entry.serviceCost} onClick={() => onAction(entry.fixtureId, 'service')}>
                    Bảo trì {money(entry.serviceCost)}
                  </PixelButton>
                )}
                {entry.repairCost !== undefined && (
                  <PixelButton variant="teal" disabled={!unlocked || playerMoney < entry.repairCost} onClick={() => onAction(entry.fixtureId, 'repair')}>
                    Sửa {money(entry.repairCost)}
                  </PixelButton>
                )}
                {entry.status === 'broken_major' || entry.status === 'broken_minor' ? (
                  <PixelButton variant="brick" disabled={!unlocked || playerMoney < entry.replaceCost} onClick={() => onAction(entry.fixtureId, 'replace')}>
                    Mua mới {money(entry.replaceCost)}
                  </PixelButton>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </PixelDialog>
  );
};
