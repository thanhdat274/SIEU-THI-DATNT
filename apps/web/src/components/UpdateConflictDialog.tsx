import React from 'react';
import type { SaveGameData } from '@game/shared';
import type { CloudSaveSummary } from '../services/api';
import { PixelButton, PixelDialog } from './pixel';

export type UpdateConflictChoice = 'keep-local' | 'overwrite' | 'download' | 'cancel';

const money = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

/** Cloud đã có bản khác khi cập nhật app: cho chọn bản nào giữ trước khi tải lại. */
export const UpdateConflictDialog: React.FC<{ local?: SaveGameData; remote: CloudSaveSummary; onChoose: (choice: UpdateConflictChoice) => void }> = ({ local, remote, onChoose }) => (
  <PixelDialog title="Chọn bản lưu để giữ" subtitle="Cloud đã có bản khác (thiết bị khác ghi sau)" icon="save" onClose={() => onChoose('cancel')}
    footer={<PixelButton onClick={() => onChoose('cancel')}>Hủy cập nhật</PixelButton>}>
    <div className="save-actions">
      <div className="info-card"><strong>Bản trên máy</strong><p>{local ? `Ngày ${local.worldTime.day} · cấp ${local.player.level} · ${money(local.player.money)} · doanh thu ${money(local.statistics.totalRevenue)}` : 'Không đọc được bản trên máy'}</p></div>
      <div className="info-card"><strong>Bản cloud</strong><p>Ngày {remote.day} · cấp {remote.level} · {money(remote.money)} · doanh thu {money(remote.totalRevenue)} · {new Date(remote.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></div>
      <PixelButton variant="teal" onClick={() => onChoose('keep-local')}>Giữ bản máy, không đụng cloud rồi cập nhật</PixelButton>
      <PixelButton variant="brick" onClick={() => onChoose('overwrite')}>Ghi đè cloud bằng bản máy rồi cập nhật</PixelButton>
      <PixelButton variant="brick" onClick={() => onChoose('download')}>Dùng bản cloud (thay bản máy, giữ dự phòng) rồi cập nhật</PixelButton>
    </div>
  </PixelDialog>
);
