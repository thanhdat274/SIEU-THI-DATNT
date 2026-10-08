import React from 'react';
import { MAINTENANCE_RULES } from '@game/data';
import type { MaintenanceAction, MaintenanceEntry } from '@game/core';
import { PixelButton, PixelDialog, money } from './pixel';

export interface MaintenanceModalProps {
  entries: MaintenanceEntry[];
  playerMoney: number;
  playerLevel: number;
  onAction: (fixtureId: string, action: MaintenanceAction) => void | Promise<void>;
  onMaintainAll: () => void | Promise<void>;
  onClose: () => void;
}

const STATUS_LABEL: Record<MaintenanceEntry['status'], { text: string; color: string }> = {
  good: { text: 'Còn tốt', color: 'var(--color-green-dark)' },
  worn: { text: 'Đã mòn, nên bảo trì', color: 'var(--color-warning-dark)' },
  broken_minor: { text: 'Hỏng nhẹ: sửa được', color: 'var(--color-brick)' },
  broken_major: { text: 'Hỏng nặng: phải mua mới', color: 'var(--color-brick-dark)' },
};

const TYPE_LABEL: Record<string, string> = { shelf_wooden: 'Kệ gỗ', shelf_glass: 'Kệ kính', refrigerator: 'Tủ mát' };

/** Danh sách kệ/tủ mát kèm độ mòn; bảo trì, sửa nhẹ hoặc mua mới ngay tại đây. */
export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ entries, playerMoney, playerLevel, onAction, onMaintainAll, onClose }) => {
  const unlocked = playerLevel >= MAINTENANCE_RULES.unlockLevel;
  const sorted = [...entries].sort((a, b) => Number(b.status === 'broken_major') - Number(a.status === 'broken_major') || Number(!!b.broken) - Number(!!a.broken) || b.wear - a.wear);
  const serviceable = entries.filter((e) => e.serviceCost !== undefined);
  const serviceTotal = serviceable.reduce((sum, e) => sum + (e.serviceCost ?? 0), 0);
  return (
    <PixelDialog icon="warning" title="Sửa chữa & bảo trì" subtitle="Kệ và tủ mát mòn dần mỗi đêm; hỏng thì không bán và không bày hàng được. Nhân viên bày hàng tự bảo trì đồ đã mòn mỗi đêm (có phí)" onClose={onClose}>
      {!unlocked && (
        <p className="pixel-panel" style={{ padding: 8 }}>Hao mòn bắt đầu từ cấp {MAINTENANCE_RULES.unlockLevel}; cấp hiện tại {playerLevel}.</p>
      )}
      {unlocked && !sorted.length && <p className="muted">Chưa có kệ hay tủ mát nào.</p>}
      {unlocked && serviceable.length > 0 && (
        <div className="maintenance-batch" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelButton variant="teal" disabled={!unlocked || serviceTotal <= 0 || playerMoney < serviceTotal} onClick={onMaintainAll}>
            Bảo trì tất cả ({serviceable.length})
          </PixelButton>
          <span className="muted" style={{ fontSize: 12 }}>Tổng phí bảo trì: <strong style={{ color: 'var(--color-green-dark)' }}>{money(serviceTotal)}</strong></span>
        </div>
      )}
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
                style={{ height: 8, background: 'var(--color-panel-dark)', border: '1px solid var(--color-outline-soft)' }}>
                <div style={{ width: `${Math.min(100, entry.wear)}%`, height: '100%', background: entry.wear >= MAINTENANCE_RULES.breakFrom ? 'var(--color-brick)' : entry.status === 'worn' ? 'var(--color-wheat)' : 'var(--color-green)' }} />
              </div>
              <div className="maintenance-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
