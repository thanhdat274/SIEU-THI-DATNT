import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { tutorialSteps } from '../ui/tutorialSteps';

/** Playtest P0 T2: bảng "Ngày đầu mở tiệm" không tự tích Nhập hàng / Bày hàng nhờ hàng khai trương có sẵn. */
describe('Playtest P0 T2 — hướng dẫn ngày đầu chỉ tích khi người chơi tự làm', () => {
  beforeEach(() => useGame.setState(newGameData()));
  it('ván mới: kho có hàng khai trương nhưng 2 bước đầu chưa tích', () => {
    const s = useGame.getState();
    expect(Object.values(s.storage).some((q) => q > 0)).toBe(true);
    const [order, shelf] = tutorialSteps(s);
    expect(order.done).toBe(false);
    expect(shelf.done).toBe(false);
  });
  it('tự bày một tầng kệ → tích "Bày hàng"', () => {
    const s = useGame.getState();
    const f = s.furniture.find((x) => x.tiers.length > 0)!;
    const id = Object.keys(s.storage).find((k) => s.storage[k] > 0)!;
    s.stockTier(f.uid, 0, id);
    expect(tutorialSteps(useGame.getState())[1].done).toBe(true);
  });
  it('đã chi tiền nhập hàng → tích "Nhập hàng" (kể cả khi xe đã giao xong)', () => {
    useGame.setState({ totals: { ...useGame.getState().totals, spent: 50_000 }, deliveries: [] });
    expect(tutorialSteps(useGame.getState())[0].done).toBe(true);
  });
});
