import { describe, it, expect } from 'vitest';
import { orderSlowdown } from '../data/orderSlowdown';

describe('Playtest T8: mở Nhập hàng hạ tốc độ', () => {
  it('chơi đơn đang 3× → 1×', () => expect(orderSlowdown(3, false)).toBe(1));
  it('đang 1× hoặc dừng → giữ', () => { expect(orderSlowdown(1, false)).toBeNull(); expect(orderSlowdown(0, false)).toBeNull(); });
  it('hẻm online → không đụng đồng hồ chung', () => expect(orderSlowdown(8, true)).toBeNull());
});
