import { describe, expect, it } from 'vitest';
import { WAIT_LAMP_POS, GLOW_NODE, waitLampProblems } from '../world/storefrontWaitLamp';

describe('đèn báo khách đang đợi (gđ180)', () => {
  it('đặt bên trái cửa tiệm, sát tường, ngoài lòng đường', () => {
    expect(waitLampProblems()).toEqual([]);
    const [x, , z] = WAIT_LAMP_POS;
    // ngoài lòng đường (đường là z 3..9)
    expect(z).toBeLessThanOrEqual(3);
    // bên trái cửa (cửa x=4) — đối xứng cột đèn lồng bên phải (x=5.9, z=2.1)
    expect(x).toBeLessThan(4);
    expect(x).toBeGreaterThan(0);
  });

  it('không đè cột đèn lồng (5.9,2.1) hay biển mở/đóng cửa (5.05,1.45)', () => {
    expect(waitLampProblems()).not.toContain('đè đúng cột đèn lồng');
    expect(waitLampProblems()).not.toContain('đè đúng biển mở/đóng cửa');
    expect(Math.abs(WAIT_LAMP_POS[0] - 5.9) + Math.abs(WAIT_LAMP_POS[2] - 2.1)).toBeGreaterThan(1);
  });

  it('không chắn trước cửa tiệm (cửa ở x=4, z=1)', () => {
    expect(waitLampProblems()).not.toContain('chắn trước cửa tiệm (x=4,z=1)');
  });

  it('tên node phát sáng trong GLB đúng', () => {
    expect(GLOW_NODE).toBe('cho_doi_glow');
  });
});
