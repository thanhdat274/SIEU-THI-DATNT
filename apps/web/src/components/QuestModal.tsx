import React from 'react';
import type { QuestProgress } from '@game/core';
import { getLevelUnlocks } from '@game/core';
import { money, PixelButton, PixelDialog, PixelProgress } from './pixel';

interface QuestModalProps {
  daily: QuestProgress[];
  story: QuestProgress | null;
  level: number;
  onClaim: (questId: string) => void;
  onClose: () => void;
}

const QuestRow: React.FC<{ quest: QuestProgress; onClaim: (id: string) => void }> = ({ quest, onClaim }) => (
  <li className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
    <strong>{quest.title}</strong>
    <span className="muted">{quest.description}</span>
    <PixelProgress label={quest.title} value={quest.current} max={quest.target} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span className="tabular">Thưởng {money(quest.reward.money)}{quest.reward.experience > 0 ? ` · ${quest.reward.experience} XP` : ''}</span>
      <PixelButton variant="teal" disabled={!quest.done || quest.claimed} onClick={() => onClaim(quest.id)}>
        {quest.claimed ? 'Đã nhận' : quest.done ? 'Nhận thưởng' : 'Chưa xong'}
      </PixelButton>
    </div>
  </li>
);

export const QuestModal: React.FC<QuestModalProps> = ({ daily, story, level, onClaim, onClose }) => {
  const next = getLevelUnlocks(level + 1);
  const nextItems = [...next.products, ...next.suppliers];
  return (
    <PixelDialog icon="star" title="NHIỆM VỤ" subtitle="Việc trong ngày và chuyện xóm nhỏ" onClose={onClose}>
      <h3>Chuyện xóm nhỏ</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8 }}>
        {story ? <QuestRow quest={story} onClaim={onClaim} /> : <li className="muted">Bạn đã hoàn thành toàn bộ chuyện xóm hiện có.</li>}
      </ul>
      <h3>Nhiệm vụ hôm nay</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8 }}>
        {daily.map(quest => <QuestRow key={quest.id} quest={quest} onClaim={onClaim} />)}
      </ul>
      <h3>Mốc cấp tiếp theo (cấp {level + 1})</h3>
      <p className="muted">{nextItems.length ? `Mở khóa: ${nextItems.join(', ')}` : 'Cấp này chưa mở khóa món hay mối hàng mới.'}</p>
    </PixelDialog>
  );
};
