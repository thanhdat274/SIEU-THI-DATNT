import React, { useState } from 'react';
import type { WorldSettings } from '@game/shared';
import { PixelButton, PixelDialog } from './pixel';
import { MEMBER_PERMISSION_OPTIONS } from './land-vote-labels';

/** Chủ hẻm chỉnh quyền đất của thành viên và việc bỏ qua phiếu của chính mình (open-world-coop-land D2/D3). */
export const WorldSettingsModal: React.FC<{
  settings?: WorldSettings;
  onSave: (patch: WorldSettings) => Promise<void>;
  onClose: () => void;
}> = ({ settings, onSave, onClose }) => {
  const [permission, setPermission] = useState<'full' | 'vote' | 'none'>(settings?.memberLandPermissions ?? 'vote');
  const [skip, setSkip] = useState(settings?.ownerSkipsVote ?? false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await onSave({ memberLandPermissions: permission, ownerSkipsVote: skip }); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <PixelDialog
      icon="person"
      title="Quyền đất của hẻm"
      subtitle="Chỉ chủ hẻm chỉnh được"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <PixelButton variant="paper" onClick={onClose}>Đóng</PixelButton>
          <PixelButton variant="teal" onClick={() => void save()} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</PixelButton>
        </div>
      }
    >
      <div style={{ padding: '8px 0', fontSize: 13, display: 'grid', gap: 8 }}>
        <strong>Thành viên (không phải chủ) được làm gì với đất?</strong>
        {MEMBER_PERMISSION_OPTIONS.map(option => (
          <label key={option.value} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minHeight: 36, cursor: 'pointer' }}>
            <input type="radio" name="member-land-permission" checked={permission === option.value} onChange={() => setPermission(option.value)} style={{ marginTop: 3 }} />
            <span><strong>{option.label}</strong><br /><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{option.hint}</span></span>
          </label>
        ))}
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minHeight: 36, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} style={{ marginTop: 3 }} />
          <span><strong>Chủ bỏ qua phiếu</strong><br /><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Lệnh đất của chủ chạy ngay, không chờ người kia đồng ý.</span></span>
        </label>
      </div>
    </PixelDialog>
  );
};
