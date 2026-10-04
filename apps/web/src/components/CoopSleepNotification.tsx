import React from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * CoopSleepNotification — Hiển thị khi một player đã ngủ nhưng player kia chưa.
 * Dùng trong co-op mode để thông báo "Đang chờ người chơi còn lại nghỉ ngơi..."
 */
export const CoopSleepNotification: React.FC = () => {
  const isWaitingForPartner = useGameStore((state) => state.isWaitingForPartner);
  const coopRoutineStates = useGameStore((state) => state.coopRoutineStates);
  const worldTime = useGameStore((state) => state.worldTime);

  if (!isWaitingForPartner || coopRoutineStates.length === 0) {
    return null;
  }

  // Count sleeping vs awake players
  const sleepingCount = coopRoutineStates.filter(s => s.isSleeping).length;
  const totalCount = coopRoutineStates.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '18px' }}>💤</span>
      <span>
        Đang chờ người chơi còn lại nghỉ ngơi... ({sleepingCount}/{totalCount} đã ngủ)
      </span>
      <span style={{ opacity: 0.7, marginLeft: '8px' }}>
        {worldTime.hour.toString().padStart(2, '0')}:{worldTime.minute.toString().padStart(2, '0')}
      </span>
    </div>
  );
};
