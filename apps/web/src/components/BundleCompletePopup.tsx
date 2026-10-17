import React from 'react';
import type { BundleCardView } from '@game/core';

/** Popup "Sổ góp hoàn thành": App dựng ở cấp cao nhất để CẢ HAI người chơi trong hẻm thấy (không phụ thuộc panel đang mở). */
export const BundleCompletePopup: React.FC<{ buildingName: string; view: Pick<BundleCardView, "buildingTypeId" | "donors" | "remainingCost">; /** Nút xây (App tính bằng `bundleBuildAction`: khóa khi chưa đủ cấp người chơi / chưa có lô trống). */ buildAction: { disabled: boolean; label: string }; donorName: (playerId: string) => string; buildableParcelIds: readonly string[]; onBuildOnParcel?: (parcelId: string, buildingTypeId?: string) => void; onClose: () => void }> = ({ buildingName, view: completed, buildAction: action, donorName, buildableParcelIds, onBuildOnParcel, onClose }) => {
  return <div role="dialog" aria-label="Sổ góp hoàn thành" data-bundle-complete style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
    <div className="pixel-panel" style={{ padding: 16, maxWidth: 420, width: '100%', display: 'grid', gap: 8, maxHeight: '90vh', overflowY: 'auto' }}>
      <strong style={{ fontSize: 18 }}>Trang {buildingName} đã hoàn thành!</strong>
      <span className="muted">Người góp:</span>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{completed.donors.map(d => <li key={d.playerId}>{donorName(d.playerId)} — {d.percent}%</li>)}</ul>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="pixel-button button-paper" style={{ minHeight: 44, flex: 1 }} onClick={() => onClose()}>Để sau</button>
        <button type="button" className="pixel-button button-green" style={{ minHeight: 44, flex: 2, whiteSpace: 'normal' }} disabled={!onBuildOnParcel || action.disabled} onClick={() => { onClose(); onBuildOnParcel?.(buildableParcelIds[0], completed.buildingTypeId); }}>{action.label}</button>
      </div>
    </div>
  </div>;
};
