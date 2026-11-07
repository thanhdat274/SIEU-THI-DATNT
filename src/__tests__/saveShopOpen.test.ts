import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';

/** Playtest P0 T1: vào lại game giữa ngày không được tự đóng tiệm. */
describe('Playtest P0 T1 — lưu/khôi phục trạng thái mở cửa', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), shopOpen: false }));
  it('đang mở cửa → nạp lại vẫn mở', () => {
    useGame.setState({ shopOpen: true });
    const snap = snapshot();
    expect(snap.shopOpen).toBe(true);
    useGame.setState({ shopOpen: false });
    applySnapshot(snap);
    expect(useGame.getState().shopOpen).toBe(true);
  });
  it('đang đóng → nạp lại vẫn đóng', () => {
    const snap = snapshot();
    useGame.setState({ shopOpen: true });
    applySnapshot(snap);
    expect(useGame.getState().shopOpen).toBe(false);
  });
  it('save cũ thiếu trường shopOpen → mặc định đóng cửa', () => {
    const snap = snapshot() as Record<string, unknown>;
    delete snap.shopOpen;
    useGame.setState({ shopOpen: true });
    applySnapshot(snap);
    expect(useGame.getState().shopOpen).toBe(false);
  });
});
