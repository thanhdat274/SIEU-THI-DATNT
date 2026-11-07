import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { FEW_FOLLOWERS_DESC, dailyQuests, NO_COURIER_DESC, NO_ONLINE_DESC, NO_SERVICE_DESC, NO_STATION_DESC } from '../data/quests';
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

  it('GĐ1614: có bếp mà chưa có người giao → "Giao đơn nấu" nhắc thuê Giao hàng', () => {
    for (let day = 1; day <= 40; day++) {
      useGame.setState({ ...newGameData(), level: COOK_UNLOCK + 5, day });
      const ctx = { ...questContext(useGame.getState()), hasCookStation: true, hasCourier: false };
      const q = dailyQuests(ctx).find((x) => x.id === 'daily_cook_orders');
      if (!q) continue;
      expect(q.description).toBe(NO_COURIER_DESC.replace('{n}', String(q.target)));
      const ok = dailyQuests({ ...ctx, hasCourier: true }).find((x) => x.id === 'daily_cook_orders')!;
      expect(ok.description).not.toContain('Giao hàng để');
      return;
    }
    throw new Error('không gặp việc giao đơn nấu');
  });

  it('GĐ1616: chưa mở dịch vụ → "Lời từ dịch vụ" chỉ chỗ mở; ván mới tính là chưa có', () => {
    useGame.setState({ ...newGameData(), level: 10 });
    expect(questContext(useGame.getState()).hasService).toBe(false);
    for (let day = 1; day <= 40; day++) {
      useGame.setState({ ...newGameData(), level: 10, day });
      const ctx = questContext(useGame.getState());
      const q = dailyQuests(ctx).find((x) => x.id === 'daily_services');
      if (!q) continue;
      expect(q.description).toBe(NO_SERVICE_DESC.replace('{n}', q.target.toLocaleString('vi-VN')));
      expect(dailyQuests({ ...ctx, hasService: true }).map((x) => x.id)).toEqual(dailyQuests(ctx).map((x) => x.id));
      return;
    }
    throw new Error('không gặp việc dịch vụ');
  });
  it('GĐ1624: gian hàng app chưa mở → "Giao đơn app" chỉ chỗ mở; bộ việc không đổi', () => {
    useGame.setState({ ...newGameData(), level: 30 });
    expect(questContext(useGame.getState()).hasOnlineOpen).toBe(false);
    for (let day = 1; day <= 60; day++) {
      useGame.setState({ ...newGameData(), level: 30, day });
      const ctx = questContext(useGame.getState());
      const q = dailyQuests(ctx).find((x) => x.id === 'daily_online');
      if (!q) continue;
      expect(q.description).toBe(NO_ONLINE_DESC.replace('{n}', q.target.toLocaleString('vi-VN')));
      const open = dailyQuests({ ...ctx, hasOnlineOpen: true });
      expect(open.map((x) => x.id)).toEqual(dailyQuests(ctx).map((x) => x.id));
      expect(open.find((x) => x.id === 'daily_online')!.description).not.toContain('chưa nhận đơn');
      return;
    }
    throw new Error('không gặp việc đơn app');
  });
  it('GĐ1625: dưới 20 người theo dõi → "Lên mạng xã hội" nêu số cần; đủ thì câu gốc', () => {
    for (let day = 1; day <= 60; day++) {
      useGame.setState({ ...newGameData(), level: 30, day });
      const ctx = questContext(useGame.getState());
      const few = dailyQuests({ ...ctx, socialFollowers: 5 }).find((x) => x.id === 'daily_social');
      if (!few) continue;
      expect(few.description).toBe(FEW_FOLLOWERS_DESC(5));
      const ok = dailyQuests({ ...ctx, socialFollowers: 50 });
      expect(ok.find((x) => x.id === 'daily_social')!.description).toContain('Đăng bài quảng bá (hoặc xin lỗi');
      expect(ok.map((x) => x.id)).toEqual(dailyQuests({ ...ctx, socialFollowers: 5 }).map((x) => x.id));
      return;
    }
    throw new Error('không gặp việc MXH');
  });
});

describe('GĐ1626 — thử thách tuần/tháng nêu lý do chưa làm được', () => {
  it('ván mới: dịch vụ/app/MXH/bếp có lý do; doanh thu thì không', async () => {
    const { periodBlocker } = await import('../data/quests');
    useGame.setState({ ...newGameData(), level: 30 });
    const ctx = questContext(useGame.getState());
    expect(periodBlocker('services', ctx)).toContain('📈 Kinh doanh');
    expect(periodBlocker('onlineDone', ctx)).toContain('📲 Online');
    expect(periodBlocker('socialPosts', ctx)).toContain('đang 0');
    expect(periodBlocker('cookedSold', ctx)).toContain('chưa có bếp');
    expect(periodBlocker('revenue', ctx)).toBeNull();
    expect(periodBlocker('combos', ctx)).toContain('🎁 Combo'); // GĐ1639
    expect(periodBlocker('combos', { ...ctx, activeCombos: 2 })).toBeNull();
    expect(periodBlocker('onlineDone', { ...ctx, hasOnlineOpen: true })).toBeNull();
  });
});

describe('GĐ1638 — "Bán theo combo" khi chưa bật combo nào', () => {
  it('ván mới chưa bật → mô tả chỉ chỗ bật; bật rồi thì câu gốc; bộ việc không đổi', async () => {
    const { NO_COMBO_DESC } = await import('../data/quests');
    useGame.setState({ ...newGameData(), level: 30 });
    expect(questContext(useGame.getState()).activeCombos).toBe(0);
    for (let day = 1; day <= 60; day++) {
      useGame.setState({ ...newGameData(), level: 30, day });
      const ctx = questContext(useGame.getState());
      const q = dailyQuests(ctx).find((x) => x.id === 'daily_combo');
      if (!q) continue;
      expect(q.description).toBe(NO_COMBO_DESC.replace('{n}', q.target.toLocaleString('vi-VN')));
      const on = dailyQuests({ ...ctx, activeCombos: 1 });
      expect(on.map((x) => x.id)).toEqual(dailyQuests(ctx).map((x) => x.id));
      expect(on.find((x) => x.id === 'daily_combo')!.description).not.toContain('chưa bật');
      return;
    }
    throw new Error('không gặp việc combo');
  });
});
