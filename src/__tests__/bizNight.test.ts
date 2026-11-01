import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { loanInterest } from '../data/biz';
import { setSimSeed, clearSimSeed } from '../core/rand';
import type { DayStats } from '../core/gameTypes';

/**
 * GĐ698 — phủ khối đêm kinh doanh còn lộ (biz.ts 671-702, covlines GĐ693):
 *  vay ngân hàng: trả lãi mỗi tối / quá hạn bị thu gốc / cảnh báo còn 3 ngày
 *  hụi: hốt đúng lượt, vỡ hụi, mãn vòng
 * bizEndOfDay là hàm thuần (state → {biz, money, news}) nên test trực tiếp.
 */

const DAY = 12;
const emptyStats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, byItem: {} } as unknown as DayStats;

/** Quét seed tới khi tin mong muốn xuất hiện (tránh trúng vỡ hụi khi cần phe "ổn"). out.money là ĐỘ CHÊNH. */
function nightWith(hui: Record<string, unknown> | null, want: string, maxSeed = 60) {
  for (let seed = 1; seed <= maxSeed; seed++) {
    setSimSeed(seed);
    useGame.setState({ biz: { ...useGame.getState().biz, hui } as never });
    const out = bizEndOfDay(useGame.getState(), emptyStats);
    if (out.news.some((n) => n.includes(want))) return { seed, out };
  }
  throw new Error(`Không seed nào 1..${maxSeed} cho tin "${want}"`);
}

beforeEach(() => {
  useGame.setState({
    ...newGameData(),
    day: DAY,
    level: 20,
    money: 10_000_000,
    notify: () => {},
  });
});
afterEach(() => clearSimSeed());

describe('đêm kinh doanh: vay ngân hàng (GĐ698)', () => {
  it('còn hạn: trừ lãi mỗi tối, ghi interestPaid, báo còn nợ + hạn', () => {
    setSimSeed(1);
    useGame.setState({
      money: 10_000_000,
      biz: { ...useGame.getState().biz, loan: { principal: 3_000_000, takenDay: 2, dueDay: DAY + 10, interestPaid: 0 } },
    });
    const out = bizEndOfDay(useGame.getState(), emptyStats);
    const interest = loanInterest(3_000_000);
    expect(out.money).toBe(-interest); // out.money là ĐỘ CHÊNH tiền két
    expect(out.biz.loan?.principal).toBe(3_000_000);
    expect(out.biz.loan?.interestPaid).toBe(interest);
    expect(out.news.some((n) => n.includes('Trả lãi vay'))).toBe(true);
  });

  it('còn đúng 3 ngày tới hạn: thêm dòng cảnh báo ⚠️', () => {
    setSimSeed(1);
    useGame.setState({
      money: 10_000_000,
      biz: { ...useGame.getState().biz, loan: { principal: 2_000_000, takenDay: 2, dueDay: DAY + 4, interestPaid: 0 } },
    });
    const out = bizEndOfDay(useGame.getState(), emptyStats);
    expect(out.news.some((n) => n.includes('Còn 3 ngày tới hạn trả nợ'))).toBe(true);
  });

  it('quá hạn: ngân hàng thu thẳng gốc + lãi, xoá nợ, báo rõ', () => {
    setSimSeed(1);
    useGame.setState({
      money: 10_000_000,
      biz: { ...useGame.getState().biz, loan: { principal: 2_000_000, takenDay: 2, dueDay: DAY, interestPaid: 0 } },
    });
    const out = bizEndOfDay(useGame.getState(), emptyStats);
    expect(out.money).toBe(-loanInterest(2_000_000) - 2_000_000);
    expect(out.biz.loan).toBeNull();
    expect(out.news.some((n) => n.includes('quá hạn, ngân hàng thu'))).toBe(true);
  });
});

describe('đêm kinh doanh: hụi (GĐ698)', () => {
  it('tới lượt hốt: góp hôm đó + hốt cả vòng, lãi ròng (members-1)×daily', () => {
    const { out } = nightWith(
      { daily: 100_000, members: 10, startDay: 2, turnDay: DAY + 1, received: false, paidDays: 3 },
      'Tới lượt hốt hụi',
    );
    expect(out.money).toBe(-100_000 + 100_000 * 10);
    expect(out.biz.hui?.received).toBe(true);
  });

  it('vỡ hụi: mất toàn bộ đã góp, xoá hụi, báo 😱 (quét seed)', () => {
    const { out } = nightWith(
      { daily: 100_000, members: 10, startDay: 2, turnDay: 999, received: false, paidDays: 3 },
      'Vỡ hụi',
      3000,
    );
    expect(out.biz.hui).toBeNull();
    // đêm vỡ không trừ thêm: tiền góp đã mất dần qua các đêm trước (money -= h.daily mỗi tối)
    expect(out.money).toBe(0);
  });

  it('góp đủ vòng: mãn vòng, xoá hụi, báo có thể vào vòng mới', () => {
    const { out } = nightWith(
      { daily: 30_000, members: 10, startDay: 2, turnDay: DAY + 5, received: true, paidDays: 9 },
      'Mãn vòng hụi',
    );
    expect(out.biz.hui).toBeNull();
    expect(out.money).toBe(-30_000); // góp ngày cuối, không hốt lại
  });
});
