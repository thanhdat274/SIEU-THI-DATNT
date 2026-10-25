import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { HAPPY_HOURS, happyHourActive, happyTraffic } from '../data/rhythm';
import { productSummary, type Review } from '../data/reviews';

/** Bộ test nhóm B — gói bảo trì, giờ vàng tự đặt, review theo từng món. */

describe('giờ vàng tự đặt', () => {
  it('chạy đúng khung 2 tiếng theo lựa chọn', () => {
    const hh = { from: 14, off: 15 };
    expect(happyHourActive(hh, 14 * 60)).toBe(true);
    expect(happyHourActive(hh, (14 + HAPPY_HOURS) * 60 - 1)).toBe(true);
    expect(happyHourActive(hh, (14 + HAPPY_HOURS) * 60)).toBe(false);
    expect(happyHourActive(null, 14 * 60)).toBe(false);
  });
  it('giảm càng sâu khách càng đông', () => {
    expect(happyTraffic(10)).toBeCloseTo(1.25);
    expect(happyTraffic(20)).toBeCloseTo(1.5);
    expect(happyTraffic(20)).toBeGreaterThan(happyTraffic(10));
  });
  it('priceOf giảm đúng mức trong giờ vàng, ngoài khung thì nguyên giá', () => {
    useGame.setState({ ...newGameData(), prices: { nuoc: 10000 }, happyHour: { from: 14, off: 20 } });
    useGame.setState({ minutes: 15 * 60 });
    expect(useGame.getState().priceOf('nuoc')).toBe(8000);
    useGame.setState({ minutes: 12 * 60 });
    expect(useGame.getState().priceOf('nuoc')).toBe(10000);
  });
});

describe('review theo từng món', () => {
  const r = (stars: number, productId?: string, reason?: Review['reason']): Review =>
    ({ id: Math.random(), day: 1, minute: 500, stars, author: 'A', text: 't', ...(reason ? { reason } : {}), ...(productId ? { productId } : {}) });
  it('tách được món bị chê nhiều nhất và món được khen nhiều nhất', () => {
    const reviews = [
      r(5, 'nuoc'), r(4, 'nuoc'), r(5, 'banh'),
      r(2, 'sua', 'stock'), r(2, 'sua', 'price'), r(3, 'banh', 'price'),
      r(5), // không nhắc món
    ];
    const { worst, best } = productSummary(reviews);
    expect(worst[0]).toMatchObject({ productId: 'sua', complaint: 2 });
    expect(best[0]).toMatchObject({ productId: 'nuoc', praise: 2 });
    expect(worst.length).toBeLessThanOrEqual(3);
  });
  it('món bị chê lẫn khen thì xếp theo chê nhiều trước (cần xử lý trước)', () => {
    const reviews = [r(5, 'mi'), r(2, 'mi', 'stock'), r(2, 'gao', 'price')];
    const { worst } = productSummary(reviews);
    expect(worst[0].productId).toBe('mi'); // cùng 1 lần chê nhưng mi có lời khen → người chơi quan tâm hơn
  });
});

describe('hợp đồng bảo trì', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), day: 10, level: 20, money: 5000000,
      furniture: [
        { uid: 1, type: 'shelf', x: 0, z: 1, rot: 0, wear: 80, broken: true, tiers: [] },
        { uid: 2, type: 'fridge', x: 2, z: 1, rot: 0, wear: 50, tiers: [] },
      ] as Furniture[],
    });
  });
  it('sáng hôm sau: thợ bảo trì sửa kệ hỏng (nửa giá) và chăm kệ mòn', () => {
    // Sang ngày mới qua sleep → endDay; đứng giờ ngủ được
    useGame.setState({ minutes: 19 * 60, biz: { ...useGame.getState().biz, upgrades: ['maintenance'] } });
    useGame.getState().sleep();
    const s = useGame.getState();
    const fixed = s.furniture.find((f) => f.uid === 1)!;
    expect(fixed.broken).toBeFalsy();
    expect(fixed.wear).toBeLessThanOrEqual(10);
    const worn = s.furniture.find((f) => f.uid === 2)!;
    expect(worn.wear).toBeLessThanOrEqual(10);
    // Phí sửa nửa giá kệ gỗ (150k × 25% = 37.5k → nửa 18.75k, làm tròn nghìn) ghi vào chi tiêu ngày
    const summary = s.panel;
    expect(summary?.type).toBe('summary');
    if (summary?.type === 'summary') expect(summary.stats.spent).toBe(19000);
  });
  it('không có hợp đồng: kệ hỏng vẫn hỏng chờ chủ tự sửa, không mất phí', () => {
    useGame.setState({ minutes: 19 * 60 });
    useGame.getState().sleep();
    const s = useGame.getState();
    const fixed = s.furniture.find((f) => f.uid === 1)!;
    expect(fixed.broken).toBe(true);
    const summary = s.panel;
    if (summary?.type === 'summary') expect(summary.stats.spent).toBe(0);
  });
});
