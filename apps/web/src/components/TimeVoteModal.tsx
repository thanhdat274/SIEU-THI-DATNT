import React from 'react';
import { PixelButton, PixelDialog } from './pixel';

export interface TimeVoteModalProps {
  vote: {
    type: 'advance_day' | 'change_speed';
    targetSpeed?: number;
    initiatedBy: string;
    expiresInMs: number;
    approvalsCount: number;
    totalRequired: number;
  };
  currentUserId?: string;
  onApprove: () => void;
  onCancel: () => void;
}

export const TimeVoteModal: React.FC<TimeVoteModalProps> = ({
  vote,
  currentUserId,
  onApprove,
  onCancel,
}) => {
  const isInitiator = vote.initiatedBy === currentUserId;
  const remainingSeconds = Math.max(0, Math.ceil(vote.expiresInMs / 1000));

  return (
    <PixelDialog
      icon="clock"
      title="Bình chọn thời gian hẻm"
      subtitle={`Yêu cầu hết hạn sau ${remainingSeconds} giây`}
      onClose={onCancel}
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <PixelButton variant="paper" onClick={onCancel}>
            {isInitiator ? 'Hủy yêu cầu' : 'Từ chối'}
          </PixelButton>
          {!isInitiator && (
            <PixelButton variant="teal" onClick={onApprove}>
              Đồng ý
            </PixelButton>
          )}
        </div>
      }
    >
      <div style={{ padding: '8px 0', fontSize: '13px' }}>
        <p style={{ marginBottom: '10px' }}>
          {vote.type === 'advance_day' ? (
            <>
              Đối tác trong hẻm yêu cầu <strong>qua ngày mới (07:00 ngày tiếp theo)</strong>.
            </>
          ) : (
            <>
              Đối tác yêu cầu đổi tốc độ sang <strong>{vote.targetSpeed}x</strong>.
            </>
          )}
        </p>
        <div
          className="timevote-box"
          style={{
            background: '#f5ecd7',
            padding: '10px',
            border: '2px dashed #b89772',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        >
          <div>
            Số người đã đồng ý: <strong>{vote.approvalsCount} / {vote.totalRequired}</strong>
          </div>
          <div className="timevote-note" style={{ fontSize: '11px', color: '#7a5a41', marginTop: '4px' }}>
            * Cả hai người phải cùng đồng ý trong 30 giây để xác nhận. Nếu một người rời hẻm hoặc hết giờ, yêu cầu sẽ tự động hủy.
          </div>
        </div>
      </div>
    </PixelDialog>
  );
};
