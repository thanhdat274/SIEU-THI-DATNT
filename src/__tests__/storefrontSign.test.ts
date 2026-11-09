import { describe, expect, it } from 'vitest';
import { OPEN_SIGN_POS, OPEN_COLOR, CLOSED_COLOR, OPEN_SIGN_HEAD_CLEARANCE, openSignProblems } from '../world/storefrontSign';

describe('biển mở/đóng cửa (gđ179, treo tường GĐ1819)', () => {
  it('treo sát tường mặt tiền cạnh cửa, không đè khung cửa, cao hơn đầu người', () => {
    expect(openSignProblems()).toEqual([]);
    const [x, , z] = OPEN_SIGN_POS;
    expect(Math.abs(z - 1)).toBeLessThan(0.2);
    expect(x).toBeGreaterThan(4.7);
    expect(x).toBeLessThan(6);
  });

  it('không còn cột đứng trên vỉa hè (y > 0 = treo tường)', () => {
    expect(OPEN_SIGN_POS[1]).toBeGreaterThan(OPEN_SIGN_HEAD_CLEARANCE);
  });

  it('hai màu mở/đóng đúng hệ thống thiết kế', () => {
    expect(OPEN_COLOR).toBe(0x2ecc71);
    expect(CLOSED_COLOR).toBe(0xe74c3c);
  });
});
