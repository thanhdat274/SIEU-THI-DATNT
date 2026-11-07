import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { serviceQuestTarget } from '../data/quests';
import { expectedServiceIncomePerDay, SERVICES } from '../data/services';
import { customersPerDay } from '../data/levels';

// GĐ1653 — mục tiêu "Lời từ dịch vụ" không vượt sức kiếm thật của các dịch vụ đang có.
describe('GĐ1653 — trần mục tiêu lời dịch vụ', () => {
  it('chỉ có nạp tiền ở cấp 10: trước kia 47k > sức kiếm ~27k, nay ≤ 70% sức kiếm', () => {
    const exp = expectedServiceIncomePerDay(['topup'], customersPerDay(10) * 2);
    expect(exp).toBeLessThan(47000);
    expect(serviceQuestTarget(10, ['topup'])).toBeLessThanOrEqual(exp * 0.7);
    expect(serviceQuestTarget(10, ['topup'])).toBeGreaterThanOrEqual(1000);
  });
  it('mọi cấp, mọi tổ hợp 1 dịch vụ hoặc đủ bộ: mục tiêu ≤ 70% sức kiếm (hoặc sàn 1.000đ)', () => {
    const sets = [...SERVICES.map((s) => [s.id]), SERVICES.map((s) => s.id)];
    for (const lv of [3, 10, 30, 60, 100, 200])
      for (const set of sets) {
        const t = serviceQuestTarget(lv, set);
        const exp = expectedServiceIncomePerDay(set, customersPerDay(lv) * 2);
        expect(t, `${lv}/${set.join(',')}`).toBeLessThanOrEqual(Math.max(1000, exp * 0.7));
      }
  });
  it('chưa có dịch vụ: giữ mục tiêu gốc (đã có mô tả chỉ chỗ mở); questContext mang danh sách dịch vụ', () => {
    expect(serviceQuestTarget(10, [])).toBe(serviceQuestTarget(10));
    useGame.setState({ ...newGameData(), level: 10 });
    expect(questContext(useGame.getState()).serviceIds).toEqual([]);
  });
  it('đủ bộ dịch vụ ở cấp thấp: mục tiêu gốc vẫn giữ (không hạ vô cớ)', () => {
    expect(serviceQuestTarget(10, SERVICES.map((s) => s.id))).toBe(serviceQuestTarget(10));
  });
});

describe('GĐ1654 — thử thách tuần/tháng dịch vụ theo sức kiếm', () => {
  it('chỉ nạp tiền ở cấp 10: tuần/tháng ≤ 70% sức kiếm cả kỳ; không truyền dịch vụ thì giữ gốc', async () => {
    const { WEEKLY_CHALLENGES } = await import('../data/bizWeeks');
    const per = expectedServiceIncomePerDay(['topup'], customersPerDay(10) * 2);
    const w = WEEKLY_CHALLENGES.find((c) => c.id === 'wq_service')!;
    const m = WEEKLY_CHALLENGES.find((c) => c.id === 'mq_services') ?? (await import('../data/bizWeeks')).MONTHLY_CHALLENGES.find((c) => c.id === 'mq_services')!;
    expect(w.target(10)).toBeGreaterThan(per * 7); // lỗi cũ: vượt sức
    expect(w.target(10, ['topup'])).toBeLessThanOrEqual(per * 7 * 0.7);
    expect(m.target(10, ['topup'])).toBeLessThanOrEqual(per * 28 * 0.7);
    expect(w.desc(10, ['topup'])).toContain((w.target(10, ['topup'])).toLocaleString('vi-VN'));
  });
});
