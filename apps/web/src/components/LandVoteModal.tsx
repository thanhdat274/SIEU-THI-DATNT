import React, { useEffect, useState } from 'react';
import { PixelButton, PixelDialog } from './pixel';
import { landCommandLabel } from './land-vote-labels';

export interface LandVoteInfo {
  initiatorId: string;
  command: string;
  /** Mốc thời gian (ms epoch, giờ máy này) phiếu hết hạn, tính từ `expiresInMs` lúc nhận. */
  expiresAt: number;
}

/** Phiếu khoản chi đất (open-world-coop-land D3): người kia đồng ý/từ chối, người đề xuất chờ hoặc hủy. */
export const LandVoteModal: React.FC<{
  vote: LandVoteInfo;
  isInitiator: boolean;
  initiatorName: string;
  onRespond: (agree: boolean) => void;
  onCancel: () => void;
}> = ({ vote, isInitiator, initiatorName, onRespond, onCancel }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((vote.expiresAt - now) / 1000));
  const label = landCommandLabel(vote.command);
  return (
    <PixelDialog
      icon="clock"
      title="Phiếu chi tiêu đất"
      subtitle={`Hết hạn sau ${seconds} giây`}
      onClose={isInitiator ? onCancel : () => onRespond(false)}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          {isInitiator
            ? <PixelButton variant="paper" onClick={onCancel}>Hủy yêu cầu</PixelButton>
            : <>
                <PixelButton variant="paper" onClick={() => onRespond(false)}>Từ chối</PixelButton>
                <PixelButton variant="teal" onClick={() => onRespond(true)}>Đồng ý</PixelButton>
              </>}
        </div>
      }
    >
      <div style={{ padding: '8px 0', fontSize: 13 }}>
        {isInitiator
          ? <p>Đang chờ người cùng hẻm đồng ý cho bạn <strong>{label}</strong>. Quỹ chưa bị trừ cho đến khi họ đồng ý.</p>
          : <p><strong>{initiatorName}</strong> muốn <strong>{label}</strong> bằng quỹ chung. Bạn có đồng ý không?</p>}
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
          * Hết giờ hoặc bị từ chối thì lệnh bị hủy, không trừ tiền. Nếu người kia rời hẻm trong lúc chờ, lệnh được thực hiện ngay.
        </div>
      </div>
    </PixelDialog>
  );
};
