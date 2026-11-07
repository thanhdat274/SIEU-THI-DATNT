import { describe, expect, it } from 'vitest';
import { onlineOrderCap } from '../data/online';
import { onlineQuestTarget } from '../data/quests';
import { MONTHLY_CHALLENGES, WEEKLY_CHALLENGES } from '../data/bizWeeks';

// GĐ1641 — cấp tối đa 200: mục tiêu đơn app tăng tuyến tính vượt trần đơn thật app trút về → bất khả thi.
describe('GĐ1641 — mục tiêu đơn app không vượt trần đơn thật', () => {
  it('việc ngày ≤ trần ngày ở 5★ cho mọi cấp 10–200', () => {
    for (let lv = 10; lv <= 200; lv++) expect(onlineQuestTarget(lv), `cấp ${lv}`).toBeLessThanOrEqual(onlineOrderCap(5, lv));
    expect(onlineQuestTarget(10)).toBe(Math.round(3 * (1 + 0.07 * 9))); // cấp thấp giữ công thức cũ
  });
  it('thử thách tuần/tháng đơn app ≤ trần tuần/tháng', () => {
    const wk = WEEKLY_CHALLENGES.find((c) => c.id === 'wq_online')!;
    const mo = MONTHLY_CHALLENGES.find((c) => c.id === 'mq_online')!;
    for (let lv = 10; lv <= 200; lv += 5) {
      expect(wk.target(lv), `tuần cấp ${lv}`).toBeLessThanOrEqual(onlineOrderCap(5, lv) * 7);
      expect(mo.target(lv), `tháng cấp ${lv}`).toBeLessThanOrEqual(onlineOrderCap(5, lv) * 28);
    }
  });
});

describe('GĐ1642 — mục tiêu đơn nấu không vượt số đơn nấu thật', () => {
  it('việc ngày ≤ kỳ vọng đơn nấu/ngày (≥1); tuần ≤ 7 ngày kỳ vọng', async () => {
    const { expectedCookOrdersPerDay } = await import('../data/phoneOrders');
    const { COOK_UNLOCK } = await import('../data/recipes');
    const { newGameData, questContext, useGame } = await import('../core/store');
    const { dailyQuests } = await import('../data/quests');
    const wk = WEEKLY_CHALLENGES.find((c) => c.id === 'wq_cook_orders')!;
    for (const lv of [COOK_UNLOCK, 40, 100, 200]) {
      expect(wk.target(lv), `tuần cấp ${lv}`).toBeLessThanOrEqual(expectedCookOrdersPerDay(lv) * 7);
      for (let d = 1; d <= 40; d++) {
        useGame.setState({ ...newGameData(), level: lv, day: d });
        const q = dailyQuests(questContext(useGame.getState())).find((x) => x.id === 'daily_cook_orders');
        if (q) expect(q.target, `ngày cấp ${lv}`).toBeLessThanOrEqual(Math.max(1, expectedCookOrdersPerDay(lv)));
      }
    }
  });
});
