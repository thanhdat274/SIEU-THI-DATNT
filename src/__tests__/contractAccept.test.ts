import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { SUPPLY_CONTRACTS } from '../data/contracts';
import { REP_FACTORS, REP_MIN_SAMPLES } from '../data/reputation';

/**
 * acceptContract (orders.ts) — nhận hợp đồng cung cấp: chặn theo cấp và danh tiếng, không nhận hai lần,
 * kỳ đầu hạn = hôm nay + periodDays và chờ giao (pending).
 */

const g = () => useGame.getState();
const def = SUPPLY_CONTRACTS[0];
const stars = (v: number) => Array.from({ length: REP_MIN_SAMPLES + 2 }, () => Object.fromEntries(REP_FACTORS.map((k) => [k, v])));

beforeEach(() => {
  useGame.setState({ ...newGameData(), level: def.unlock, day: 10, contracts: {}, repLog: stars(1) as never });
});

describe('acceptContract', () => {
  it('đủ cấp + danh tiếng: ghi hợp đồng, hạn kỳ đầu = hôm nay + periodDays, chờ giao', () => {
    g().acceptContract(def.id);
    expect(g().contracts[def.id]).toMatchObject({ defId: def.id, dueDay: 10 + def.periodDays, delivered: 0, pending: true });
  });

  it('đang hoạt động thì nhận lại không ghi đè (giữ nguyên tiến độ)', () => {
    g().acceptContract(def.id);
    useGame.setState({ contracts: { [def.id]: { ...g().contracts[def.id], delivered: 4 } } });
    g().acceptContract(def.id);
    expect(g().contracts[def.id].delivered).toBe(4);
  });

  it('thiếu cấp: không nhận', () => {
    useGame.setState({ level: def.unlock - 1 });
    g().acceptContract(def.id);
    expect(g().contracts[def.id]).toBeUndefined();
  });

  it('danh tiếng chưa đủ (tiệm mới, chưa đủ mẫu): không nhận', () => {
    useGame.setState({ repLog: [] });
    g().acceptContract(def.id);
    expect(g().contracts[def.id]).toBeUndefined();
  });

  it('id lạ: bỏ qua', () => {
    g().acceptContract('khong-co');
    expect(g().contracts).toEqual({});
  });
});
