import { describe, it, expect } from 'vitest';
import { wheelPrizesFor, rareWheelPiece, WHEEL_PRIZES, RARE_WHEEL_UNLOCK, RARE_PERIOD_DAYS, wheelOdds } from '../data/gifts';
import { VIET_SET } from '../data/decorSets';
import { useGame } from '../core/store';

describe('GĐ1528 món báu trên vòng quay', () => {
  it('dưới cấp 33 vòng quay y cũ', () => {
    expect(RARE_WHEEL_UNLOCK).toBeGreaterThan(30);
    expect(wheelPrizesFor(RARE_WHEEL_UNLOCK - 1, 5)).toBe(WHEEL_PRIZES);
    expect(wheelPrizesFor(RARE_WHEEL_UNLOCK, 5)).toHaveLength(WHEEL_PRIZES.length + 1);
  });
  it('món báu đổi theo kỳ 28 ngày, xoay vòng', () => {
    expect(rareWheelPiece(1)).toBe(VIET_SET[0]);
    expect(rareWheelPiece(RARE_PERIOD_DAYS)).toBe(VIET_SET[0]);
    expect(rareWheelPiece(RARE_PERIOD_DAYS + 1)).toBe(VIET_SET[1]);
    expect(rareWheelPiece(RARE_PERIOD_DAYS * 5 + 1)).toBe(VIET_SET[0]);
  });
  it('tỉ lệ hiển thị cộng đủ 100% và ô hiếm ~2%', () => {
    const o = wheelOdds(40, 1);
    expect(o.entries.reduce((n, e) => n + e.pct, 0)).toBeCloseTo(100);
    expect(o.entries.at(-1)!.prize.furniture).toBe(VIET_SET[0]);
    expect(o.entries.at(-1)!.pct).toBeLessThan(3);
  });
  it('trúng món báu thì vào kho đồ', () => {
    useGame.setState({ level: 40, day: 1, wheelLastDay: 0, furnStash: {} } as never);
    let got = false;
    for (let i = 0; i < 400 && !got; i++) {
      useGame.setState({ wheelLastDay: 0 } as never);
      const p = useGame.getState().spinWheel();
      if (p?.furniture) got = true;
    }
    expect(got).toBe(true);
    expect(useGame.getState().furnStash[VIET_SET[0]]).toBeGreaterThanOrEqual(1);
  });
});
