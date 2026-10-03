import React from 'react';
import type { SecurityIncident, SecurityState } from '@game/shared';
import { SECURITY_RULES } from '@game/data';
import { PixelButton, PixelDialog, money } from './pixel';

export interface SecurityModalProps {
  security: SecurityState;
  level: number;
  playerMoney: number;
  /** Có nhân viên bảo vệ trong biên chế (chặn trộm đột nhập) và đang trực ca hiện tại (phát hiện trộm lẻ). */
  hasGuard: boolean;
  guardOnShift: boolean;
  onBuyCamera: () => void | Promise<void>;
  onSetPolice: (enabled: boolean) => void | Promise<void>;
  onClose: () => void;
}

const KIND_LABEL: Record<SecurityIncident['kind'], { icon: string; color: string }> = {
  burglary: { icon: '🌙', color: '#b64c3d' },
  burglary_repelled: { icon: '💂', color: '#2a7a43' },
  shoplift_caught: { icon: '🕵️', color: '#2a7a43' },
  shoplift_escaped: { icon: '🧺', color: '#b64c3d' },
  police_recovered: { icon: '🚓', color: '#2a7a43' },
  police_closed: { icon: '🚓', color: '#a86b12' },
};

/** An ninh tiệm: camera, bảo vệ, báo công an và các sự cố gần đây. */
export const SecurityModal: React.FC<SecurityModalProps> = ({ security, level, playerMoney, hasGuard, guardOnShift, onBuyCamera, onSetPolice, onClose }) => {
  const unlocked = level >= SECURITY_RULES.unlockLevel;
  const totalLoss = security.incidents.reduce((sum, i) => sum + (i.loss ?? 0), 0);
  const totalRecovered = security.incidents.reduce((sum, i) => sum + (i.recovered ?? 0), 0);
  const shown = [...security.incidents].reverse();
  return (
    <PixelDialog icon="person" title="AN NINH TIỆM" subtitle="Trộm lẻ giờ bán và trộm đột nhập ban đêm; bảo vệ và camera giúp phòng ngừa" onClose={onClose}>
      {!unlocked && <p className="pixel-panel" style={{ padding: 8 }}>Trộm cắp bắt đầu từ cấp {SECURITY_RULES.unlockLevel}; cấp hiện tại {level}.</p>}
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <div className="pixel-panel" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span><strong>📷 Camera</strong> <span className="muted">phát hiện trộm lẻ {Math.round(SECURITY_RULES.detect.camera * 100)}%, giảm một nửa trộm đột nhập, tăng cơ hội công an bắt được</span></span>
          {security.camera
            ? <strong style={{ color: '#2a7a43' }}>Đã lắp</strong>
            : <PixelButton variant="teal" disabled={!unlocked || playerMoney < SECURITY_RULES.cameraCost} onClick={() => onBuyCamera()}>Lắp camera {money(SECURITY_RULES.cameraCost)}</PixelButton>}
        </div>
        <div className="pixel-panel" style={{ padding: 8 }}>
          <strong>💂 Bảo vệ</strong>{' '}
          <span className="muted">
            {hasGuard
              ? `Có trong biên chế: đuổi được trộm đột nhập ban đêm${guardOnShift ? '; đang trực nên phát hiện trộm lẻ ' + Math.round(SECURITY_RULES.detect.guard * 100) + '%' : '; ngoài ca trực không phát hiện được trộm lẻ'}.`
              : 'Chưa có. Thuê ở màn Nhân viên (vai trò bảo vệ).'}
          </span>
        </div>
        <div className="pixel-panel" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span><strong>🚓 Báo công an</strong> <span className="muted">khi bị trộm đột nhập; vài ngày sau có thể đòi lại tiền ({security.policeCases.length} hồ sơ đang mở)</span></span>
          <PixelButton variant={security.callPolice ? 'teal' : 'paper'} onClick={() => onSetPolice(!security.callPolice)}>{security.callPolice ? 'Đang bật' : 'Đang tắt'}</PixelButton>
        </div>
      </div>
      <h3>Sự cố gần đây</h3>
      {shown.length === 0
        ? <p className="muted">Chưa có sự cố nào.</p>
        : (
          <>
            <p className="muted" style={{ fontSize: 11 }}>{shown.length} sự cố gần nhất · mất {money(totalLoss)} · thu hồi {money(totalRecovered)}</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {shown.map((incident) => {
                const kind = KIND_LABEL[incident.kind];
                return (
                  <article key={incident.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 2 }}>
                    <div style={{ color: kind.color }}><span aria-hidden="true">{kind.icon}</span> {incident.text}</div>
                    <div className="muted" style={{ fontSize: 10 }}>Ngày {incident.day}</div>
                  </article>
                );
              })}
            </div>
          </>
        )}
    </PixelDialog>
  );
};
