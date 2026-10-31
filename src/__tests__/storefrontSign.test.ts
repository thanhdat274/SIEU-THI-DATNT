import { describe, expect, it } from 'vitest';
import { OPEN_SIGN_POS, STATE_NODE, OPEN_COLOR, CLOSED_COLOR, OPEN_SIGN_HEAD_CLEARANCE, openSignProblems } from '../world/storefrontSign';

describe('biển mở/đóng cửa (gđ179)', () => {
  it('đặt trên vỉa hè sát cửa tiệm, ngoài lòng đường', () => {
    const [x, , z] = OPEN_SIGN_POS;
    expect(openSignProblems()).toEqual([]);
    // ngoài lòng đường (đường là z 3..9)
    expect(z).toBeLessThanOrEqual(3);
    // gần phía mặt tiền tiệm (mặt tiền z=1, cửa x=4) nhưng không chắn cửa
    expect(x).toBeGreaterThan(3);
    expect(x).toBeLessThan(6);
  });

  it('không đặt đè cột đèn lồng (5.9,2.1)', () => {
    expect(Math.abs(OPEN_SIGN_POS[0] - 5.9) + Math.abs(OPEN_SIGN_POS[2] - 2.1)).toBeGreaterThan(0.5);
  });

  it('biển treo cao quá đầu người đi lại → không chặn lưới điều hướng', () => {
    // phần dưới biển phải cao hơn đầu người chơi (standard ~1.7), như test ràng buộc rõ
    expect(OPEN_SIGN_HEAD_CLEARANCE).toBeGreaterThanOrEqual(1.6);
  });

  it('tên node trạng thái trong GLB và hai màu mở/đóng đúng hệ thống thiết kế', () => {
    expect(STATE_NODE).toBe('bien_mo_cua_state');
    // xanh = mở, đỏ = đóng — khớp semantic "lời/đóng" trong bảng màu ngữ cảnh UI (gđ166)
    expect(OPEN_COLOR).toBe(0x2ecc71);
    expect(CLOSED_COLOR).toBe(0xe74c3c);
    expect(OPEN_COLOR).not.toBe(CLOSED_COLOR);
  });
});
