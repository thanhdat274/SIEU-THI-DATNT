import { describe, expect, it } from 'vitest';
import {
  WAIT_LAMP_POS,
  GLOW_NODE,
  waitLampProblems,
  queueUrgency,
  accumulateBackup,
  waitLampIntensity,
  BACKUP_WAITING,
  BACKUP_AFTER_GAME_S,
} from '../world/storefrontWaitLamp';

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

/**
 * GĐ186 — "Sắp mất khách": đèn báo thêm mức KHẨN khi quầy có ~BACKUP_WAITING khách đợi trở lên và
 * giữ lâu — nháy nhanh để chủ biết phải ghé về quầy. Logic thuần (không cần DOM/three) nên soi bằng test.
 */
describe('GĐ186 — mức báo "sắp mất khách"', () => {
  it('mức khẩn chỉ khi hàng đông ĐỦ lâu (queueUrgency)', () => {
    expect(queueUrgency(0, 999)).toBe(0);                    // không ai chờ → tắt
    expect(queueUrgency(2, 999)).toBe(1);                    // dưới ngưỡng tắc → chỉ báo thường
    expect(queueUrgency(BACKUP_WAITING, 0)).toBe(1);         // vừa tắc → chưa khẩn
    expect(queueUrgency(BACKUP_WAITING, BACKUP_AFTER_GAME_S - 1)).toBe(1);
    expect(queueUrgency(BACKUP_WAITING, BACKUP_AFTER_GAME_S)).toBe(2); // giữ lâu → khẩn
    expect(queueUrgency(5, BACKUP_AFTER_GAME_S)).toBe(2);
  });

  it('bộ đếm hàng đông cộng khi tắc, rút dần (2×) khi tiêu tán (accumulateBackup)', () => {
    expect(accumulateBackup(0, BACKUP_WAITING, 5)).toBe(5);          // đông → cộng
    expect(accumulateBackup(30, BACKUP_WAITING, 5)).toBe(35);
    expect(accumulateBackup(30, 0, 5)).toBe(20);                     // tiêu tán → rút nhanh
    expect(accumulateBackup(4, 0, 5)).toBe(0);                       // hết hẳn
    expect(accumulateBackup(58, BACKUP_WAITING, 5)).toBe(60);        // chặn trần
  });

  it('độ sáng lõi theo trạng thái: tắt khi đóng/không chờ; khẩn giữ tối đa (waitLampIntensity)', () => {
    expect(waitLampIntensity({ open: false, waiting: 3 })).toBe(0);  // đóng cửa → tắt
    expect(waitLampIntensity({ open: true, waiting: 0 })).toBe(0);   // không khách → tắt
    expect(waitLampIntensity({ open: true, waiting: 2, urgency: 1 })).toBeCloseTo(1.6, 5);  // bình thường (base kẹp 1)
    expect(waitLampIntensity({ open: true, waiting: 1, urgency: 1 })).toBeCloseTo(1.28, 5); // ít khách → vừa
    expect(waitLampIntensity({ open: true, waiting: 3, urgency: 2 })).toBeCloseTo(1.6, 5);  // khẩn → giữ tối đa
  });

  it('mặc định không có urgency thì coi như bình thường', () => {
    expect(waitLampIntensity({ open: true, waiting: 2 })).toBeCloseTo(1.6, 5);
  });
});
