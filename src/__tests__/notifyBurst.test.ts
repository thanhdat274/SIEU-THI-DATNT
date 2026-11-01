import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/** GĐ571: hai tin cùng một lượt xử lý không đè nhau mà gộp một toast ≤90. */
describe('notify gộp tin cùng lượt', () => {
  it('gộp tin liên tiếp, bỏ trùng, lượt sau bắt đầu lại', async () => {
    useGame.setState({ ...newGameData() });
    const n = useGame.getState().notify;
    n('🛒 Bán được gói mì'); n('⭐ Lên cấp 2'); n('⭐ Lên cấp 2');
    expect(useGame.getState().message).toBe('⭐ Lên cấp 2 · 🛒 Bán được gói mì') // tin mới nhất đứng đầu như trước;
    await Promise.resolve();
    n('🔔 Tin mới');
    expect(useGame.getState().message).toBe('🔔 Tin mới');
  });
  it('nhiều tin dài vẫn ≤90 ký tự', () => {
    const n = useGame.getState().notify;
    for (let i = 0; i < 6; i++) n(`📦 Tin số ${i} khá là dài dòng để thử giới hạn độ dài của toast`);
    expect([...(useGame.getState().message ?? '')].length).toBeLessThanOrEqual(90);
  });
});
