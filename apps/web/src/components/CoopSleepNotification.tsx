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
        top: 'calc(var(--top-ui-height, 96px) + var(--space-3, 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(440px, calc(100% - var(--space-3, 16px) * 2 - var(--safe-l, 0px) - var(--safe-r, 0px)))',
        backgroundColor: 'var(--paper, #f5efe6)',
        color: 'var(--ink, #2a1f14)',
        padding: 'var(--space-2) var(--space-3)',
        border: '3px solid var(--wood-dark, #3b2518)',
        fontSize: 'var(--fs-sm, 0.8rem)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        boxShadow: '4px 4px 0 var(--wood-dark, #3b2518)',
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
