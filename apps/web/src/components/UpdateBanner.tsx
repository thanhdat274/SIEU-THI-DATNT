import React, { useState, useSyncExternalStore } from 'react';
import { applyAppUpdate, isAppUpdateReady, subscribeAppUpdate } from '../services/app-update';

/** Thông báo có bản mới; bấm "Cập nhật" sẽ lưu tiến trình rồi tải lại. */
export const UpdateBanner: React.FC = () => {
  const ready = useSyncExternalStore(subscribeAppUpdate, isAppUpdateReady);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!ready || dismissed) return null;
  return (
    <div
      role="status"
      className="update-banner"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.3,
        background: '#33251D', color: '#FFF3D6', border: '2px solid #F2B84B', boxShadow: '3px 3px 0 #33251D55',
      }}
    >
      <span style={{ flex: 1 }}>Đã có bản cập nhật mới. Bấm cập nhật để lưu tiến trình và tải lại game.</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => { setBusy(true); void applyAppUpdate().then(ok => { if (!ok) setBusy(false); }); }}
      >
        {busy ? 'Đang lưu…' : 'Cập nhật'}
      </button>
      <button type="button" disabled={busy} onClick={() => setDismissed(true)} aria-label="Để sau">Để sau</button>
    </div>
  );
};
