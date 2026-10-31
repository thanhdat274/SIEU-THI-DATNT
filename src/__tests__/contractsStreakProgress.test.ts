import { describe, expect, it } from 'vitest';
import {
  CONTRACT_RISK_DAYS, CONTRACT_STREAK_BONUS, CONTRACT_STREAK_EVERY, contractStreakProgress, contractValue,
  supplyContractById,
} from '../data/contracts';
import type { ContractState } from '../core/gameTypes';

/** Sổ chuỗi hợp đồng (GĐ125): hiển thị tiến tới mốc thưởng +25% và cảnh báo trước rủi ro đứt chuỗi. */

const def = supplyContractById('quan_nhau')!;
const PAY = contractValue(def);
const BONUS = Math.round((PAY * CONTRACT_STREAK_BONUS) / 1000) * 1000;

const csAt = (over: Partial<ContractState>): ContractState => ({
  defId: def.id, dueDay: 20, delivered: 0, pending: false, streak: 0, overdue: false, ...over,
});

describe('contractStreakProgress — đếm kỳ tới mốc thưởng +25%', () => {
  it('chưa giao (streak 0): chu kỳ 0/5, còn 5 kỳ, chưa đủ mốc', () => {
    const p = contractStreakProgress(csAt({ streak: 0 }), 5);
    expect(p.streak).toBe(0);
    expect(p.cycle).toBe(0);
    expect(p.atMilestone).toBe(false);
    expect(p.toMilestone).toBe(CONTRACT_STREAK_EVERY);
  });

  it('streak 4: chu kỳ 4/5, còn 1 kỳ nữa tới mốc', () => {
    const p = contractStreakProgress(csAt({ streak: 4 }), 5);
    expect(p.cycle).toBe(4);
    expect(p.toMilestone).toBe(1);
    expect(p.atMilestone).toBe(false);
  });

  it('streak 5 (vừa đủ mốc): atMilestone true, chu kỳ quay về 0, mốc kế = 5 kỳ', () => {
    const p = contractStreakProgress(csAt({ streak: 5 }), 5);
    expect(p.atMilestone).toBe(true);
    expect(p.cycle).toBe(0);
    expect(p.toMilestone).toBe(CONTRACT_STREAK_EVERY);
  });

  it('streak 7: chu kỳ 2/5 của mốc thứ 2 (đã qua mốc 5), còn 3 kỳ', () => {
    const p = contractStreakProgress(csAt({ streak: 7 }), 5);
    expect(p.atMilestone).toBe(false);
    expect(p.cycle).toBe(2);
    expect(p.toMilestone).toBe(3);
  });

  it('tiền thưởng mốc khớp NAVIGATE contractValue * bonus, tròn nghìn', () => {
    const p = contractStreakProgress(csAt({ streak: 4 }), 5);
    expect(p.milestoneBonus).toBe(BONUS);
    expect(BONUS).toBe(Math.round((PAY * CONTRACT_STREAK_BONUS) / 1000) * 1000);
  });
});

describe('contractStreakProgress — phân loại rủi ro đứt chuỗi', () => {
  it('quá hạn (overdue) → risk overdue, bất kể còn bao nhiêu ngày', () => {
    const p = contractStreakProgress(csAt({ streak: 4, overdue: true }), 5);
    expect(p.overdue).toBe(true);
    expect(p.risk).toBe('overdue');
  });

  it('kỳ sắp tới hạn (daysLeft <= CONTRACT_RISK_DAYS) → risk due_soon', () => {
    for (let d = 0; d <= CONTRACT_RISK_DAYS; d++) {
      const p = contractStreakProgress(csAt({ dueDay: 5 }), 5 - d);
      expect(p.daysLeft).toBe(d);
      expect(p.risk).toBe('due_soon');
    }
  });

  it('còn nhiều ngày (daysLeft > CONTRACT_RISK_DAYS) → risk ok', () => {
    const p = contractStreakProgress(csAt({ dueDay: 5 }), 1);
    expect(p.daysLeft).toBe(4);
    expect(p.risk).toBe('ok');
  });

  it('save cũ thiếu overdue (undefined) không được coi là quá hạn', () => {
    const p = contractStreakProgress({ defId: def.id, dueDay: 20, delivered: 0, pending: true }, 5);
    expect(p.overdue).toBe(false);
    expect(p.risk).toBe('ok');
  });
});
