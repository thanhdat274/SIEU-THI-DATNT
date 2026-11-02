import { describe, expect, it } from 'vitest';
import * as split from '../core/dayStats';
import * as types from '../core/gameTypes';

describe('GĐ983 — core/dayStats tách khỏi core/gameTypes', () => {
  it('gameTypes vẫn re-export cùng tham chiếu', () => {
    expect(types.emptyStats).toBe(split.emptyStats);
    expect(types.addHour).toBe(split.addHour);
    expect(types.daySalesProfit).toBe(split.daySalesProfit);
    expect(types.HISTORY_DAYS).toBe(split.HISTORY_DAYS);
  });
  it('addHour cộng dồn theo giờ và daySalesProfit cộng lời dịch vụ', () => {
    const a = split.addHour({}, 8 * 60 + 5, 1, 1000);
    const b = split.addHour(a, 8 * 60 + 50, 2, 500);
    expect(b[8]).toEqual({ customers: 3, revenue: 1500 });
    const st = { ...split.emptyStats(), byItem: { x: { qty: 1, revenue: 300, cost: 100 } }, services: 50 };
    expect(split.daySalesProfit(st)).toBe(250);
  });
});
