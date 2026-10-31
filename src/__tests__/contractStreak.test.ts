import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONTRACT_STREAK_BONUS, CONTRACT_STREAK_EVERY, contractMilestoneDue, contractValue, supplyContractById,
} from '../data/contracts';
import { newGameData, useGame } from '../core/store';
import type { ContractState } from '../core/gameTypes';

/** Chuỗi giao đúng hẹn: giữ kỳ giao liên tiếp đúng hạn để nhận thưởng mốc — câu giữ chân quay lại đúng ngày. */

const activeContractDefs = () => supplyContractById('quan_nhau')!;

const fill = (id = 'quan_nhau') => {
  const def = supplyContractById(id)!;
  const st: Record<string, number> = {};
  for (const [pid, q] of Object.entries(def.items)) st[pid] = q + 5;
  return st;
};

describe('contractMilestoneDue', () => {
  it('mốc đúng mỗi CONTRACT_STREAK_EVERY kỳ (5, 10, 15…), không trùng giữa', () => {
    expect(CONTRACT_STREAK_EVERY).toBe(5);
    for (let n = 1; n <= 25; n++) {
      expect(contractMilestoneDue(n)).toBe(n > 0 && n % CONTRACT_STREAK_EVERY === 0);
    }
  });
});

describe('deliverContract — giữ chuỗi đúng hẹn + thưởng mốc', () => {
  const def = activeContractDefs();
  const PAY = contractValue(def);
  const BONUS = Math.round((PAY * CONTRACT_STREAK_BONUS) / 1000) * 1000;
  const at = (day: number, over: Partial<ContractState> = {}) => ({
    ...newGameData(), day, level: 30, storage: fill(),
    contracts: { [def.id]: { defId: def.id, dueDay: day, delivered: 0, pending: false, streak: 0, overdue: false, ...over } },
    money: 0,
  });

  it('giao 5 kỳ đúng hẹn liên tiếp: streak 1→5, kỳ 5 nhận thưởng mốc +25%', () => {
    useGame.setState(at(5));
    for (let i = 1; i <= 5; i++) {
      const ok = useGame.getState().deliverContract(def.id);
      expect(ok).toBe(true);
      const s = useGame.getState();
      const cs = s.contracts[def.id]!;
      expect(cs.streak).toBe(i);
      expect(s.money).toBe(PAY * i + (i === CONTRACT_STREAK_EVERY ? BONUS : 0));
      expect(cs.overdue).toBe(false);
      // Sang kỳ kế (đúng hạn): ngày + periodDays, đầy kho lại — deliverContract tự cập nhật dueDay
      useGame.setState({ ...s, day: s.day + def.periodDays, storage: fill() });
    }
  });

  it('giao muộn (quá hạn) thì chuỗi về 0, không thưởng mốc dù đủ số kỳ', () => {
    useGame.setState(at(10, { streak: 4, delivered: 4, overdue: true }));
    const ok = useGame.getState().deliverContract(def.id);
    expect(ok).toBe(true);
    const s = useGame.getState();
    expect(s.contracts[def.id]!.streak).toBe(0);
    expect(s.contracts[def.id]!.delivered).toBe(5);
    expect(s.money).toBe(PAY); // chỉ giá kỳ, không bonus dù streak mới là 0 (không phải bội 5)
  });

  it('endDay đánh dấu quá hạn khi hết hạn kỳ mà chưa giao', () => {
    useGame.setState({
      ...newGameData(), day: 10, minutes: 19 * 60, storage: fill(),
      contracts: { [def.id]: { defId: def.id, dueDay: 8, delivered: 1, pending: false, streak: 3 } },
    });
    expect((useGame.getState().contracts[def.id]!.overdue ?? false)).toBe(false);
    const slept = useGame.getState().sleep();
    expect(slept).toBe(true);
    expect(useGame.getState().contracts[def.id]!.overdue).toBe(true);
  });

  it('save cũ (thiếu streak/overdue, kỳ chưa tới hạn) không bị gán quá hạn', () => {
    useGame.setState({
      ...newGameData(), day: 3, minutes: 19 * 60, storage: fill(),
      contracts: { [def.id]: { defId: def.id, dueDay: 10, delivered: 0, pending: true } },
    });
    useGame.getState().sleep();
    expect(useGame.getState().contracts[def.id]!.overdue ?? false).toBe(false);
  });
});
