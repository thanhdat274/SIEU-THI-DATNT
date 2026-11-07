import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { dailyQuests, NO_STATION_DESC } from '../data/quests';
import { COOK_UNLOCK } from '../data/recipes';

// GĐ1612 — việc nấu trong bộ ngày khi tiệm CHƯA có bếp: giữ chỗ (không xáo bộ) nhưng chỉ chỗ mua bếp.
describe('GĐ1612 — nhiệm vụ nấu khi chưa có bếp', () => {
  const findCook = (hasStation: boolean) => {
    for (let day = 1; day <= 40; day++) {
      useGame.setState({ ...newGameData(), level: COOK_UNLOCK + 5, day });
      const ctx = { ...questContext(useGame.getState()), hasCookStation: hasStation };
      const q = dailyQuests(ctx).find((x) => x.id === 'daily_cooked' || x.id === 'daily_cook_orders');
      if (q) return { q, ids: dailyQuests(ctx).map((x) => x.id), ctx };
    }
    throw new Error('không gặp việc nấu trong 40 ngày');
  };

  it('ván mới (chỉ kệ) được tính là chưa có bếp', () => {
    useGame.setState({ ...newGameData(), level: COOK_UNLOCK });
    expect(questContext(useGame.getState()).hasCookStation).toBe(false);
  });

  it('chưa có bếp → mô tả chỉ chỗ mua; bộ việc giữ nguyên như khi có bếp', () => {
    const none = findCook(false);
    expect(none.q.description).toContain('mua ở 🛠️ Xây dựng');
    const withSt = dailyQuests({ ...none.ctx, hasCookStation: true });
    expect(withSt.map((x) => x.id)).toEqual(none.ids);
    expect(withSt.find((x) => x.id === none.q.id)!.description).not.toContain('chưa có bếp');
    expect(NO_STATION_DESC('X')).toBe('X — tiệm chưa có bếp: mua ở 🛠️ Xây dựng');
  });
});
