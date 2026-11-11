import { describe, expect, it } from 'vitest';
import { BATCH_MAX, tBucketKey, TELEMETRY_TTL_DAYS, validateReport } from '../../server/telemetry';

// SPEC-TOI-UU §T1 (L3) — lược đồ telemetry ẩn danh phía server.
const valid = (over: Record<string, unknown> = {}) => ({
  v: 1, install: 'ab12cd34ef56', build: 'dev', day: 47, level: 30, prestige: 0, mode: 'solo',
  realSec: 1280, sessions: 3, moneyBand: 2, customers: 214, unhappy: 9, walkouts: 2, fainted: false,
  shortfall: false, inspectFail: false, panels: { shelf: 3, orders: 2 }, used: ['shelf', 'orders'],
  unlockedToday: 12, fps: 55, gfx: 'medium', device: 'phone', ...over,
});

describe('validateReport (telemetry anon server)', () => {
  it('nhận bản ghi hợp lệ và chuẩn hoá đúng', () => {
    const r = validateReport(valid());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.day).toBe(47);
      expect(r.report.panels).toEqual({ shelf: 3, orders: 2 });
      expect(r.report.install).toBe('ab12cd34ef56');
      expect(r.report.gfx).toBe('medium');
      expect(r.report.used).toEqual(['shelf', 'orders']);
    }
  });

  it('loại bản có khoá lạ (chặn nhét uid/tên)', () => {
    const r = validateReport(valid({ uid: 'th_123', shopName: 'X' }));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain('extra');
  });

  it('loại bản sai kiểu / sai trần / sai enum', () => {
    expect(validateReport(valid({ level: '30' })).ok).toBe(false);
    expect(validateReport(valid({ customers: 999_999_999 })).ok).toBe(false);
    expect(validateReport(valid({ gfx: 'ultra' })).ok).toBe(false);
    expect(validateReport(valid({ mode: 'multi' })).ok).toBe(false);
    expect(validateReport(valid({ panels: ['x'] })).ok).toBe(false);
    expect(validateReport(valid({ used: 'x' })).ok).toBe(false);
    expect(validateReport('nope').ok).toBe(false);
    expect(validateReport(valid({ v: 2 })).ok).toBe(false);
  });

  it('loại bản install sai dạng (quá ngắn / ký tự lạ)', () => {
    expect(validateReport(valid({ install: 'a' })).ok).toBe(false);
    expect(validateReport(valid({ install: 'has space!' })).ok).toBe(false);
  });

  it('xác nhận hằng số phục vụ route', () => {
    expect(TELEMETRY_TTL_DAYS).toBe(180);
    expect(BATCH_MAX).toBe(20);
    expect(tBucketKey('x', '1.2.3.4')).toBe('x:1.2.3.4');
  });
});
