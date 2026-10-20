import React from 'react';
import { PixelButton } from './pixel';
import './building-panel.css';

export interface BuildingPanelAction {
  label: string;
  onClick: () => void;
}

interface Props {
  title: string;
  typeLabel: string;
  /** Tình trạng: mở/đóng cửa. */
  statusLabel: string;
  isOpen: boolean;
  /** Số khách đang ở trong tòa; undefined = không đếm được. */
  customerCount?: number;
  actions: BuildingPanelAction[];
  onClose: () => void;
}

/** Bảng nổi thông tin tòa nhà được chọn trong 3D; chỉ dẫn tới các bảng có sẵn. Mobile (<768px) thành ngăn kéo từ dưới lên. */
export const BuildingPanel: React.FC<Props> = ({ title, typeLabel, statusLabel, isOpen, customerCount, actions, onClose }) => (
  <aside className="building-panel pixel-panel" role="complementary" aria-label={`Thông tin ${title}`}>
    <header className="building-panel-head">
      <div>
        <h2>{title}</h2>
        <p className="muted">{typeLabel}</p>
      </div>
      <PixelButton icon="close" variant="wood" aria-label="Đóng" onClick={onClose} />
    </header>
    <dl className="building-panel-stats">
      <div><dt>Tình trạng</dt><dd className={isOpen ? 'is-open' : 'is-closed'}>{statusLabel}</dd></div>
      {customerCount !== undefined && <div><dt>Khách hiện tại</dt><dd>{customerCount}</dd></div>}
    </dl>
    {actions.length > 0 && (
      <div className="building-panel-actions">
        {actions.map(action => <PixelButton key={action.label} onClick={action.onClick}>{action.label}</PixelButton>)}
      </div>
    )}
  </aside>
);
