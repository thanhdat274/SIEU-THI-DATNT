import { describe, it, expect } from 'vitest';
import { licenseHealth, RENEW_WARN_DAYS } from '../data/licenseHealth';
import { LICENSE_FINE } from '../data/licenses';
import type { LicenseId } from '../data/licenses';

const NEED: LicenseId[] = ['business', 'food', 'alcohol'];

describe('licenseHealth — soi giấy phép bắt buộc + phạt', () => {
  it('thiếu hết → danger, phạt = số phép × 200k', () => {
    const r = licenseHealth({}, NEED, 30);
    expect(r.verdict).toBe('danger');
    expect(r.missing.length).toBe(3);
    expect(r.fineExposure).toBe(3 * LICENSE_FINE);
  });

  it('còn hiệu lực dài → ok', () => {
    const r = licenseHealth({ business: 90, food: 80, alcohol: 100 }, NEED, 30);
    expect(r.verdict).toBe('ok');
    expect(r.missing.length).toBe(0);
    expect(r.expiring.length).toBe(0);
  });

  it('sắp hết hạn (trong RENEW_WARN_DAYS) → warn, daysLeft dương', () => {
    const r = licenseHealth({ business: 90, food: 32, alcohol: 31 }, NEED, 30);
    expect(r.verdict).toBe('warn');
    expect(r.expiring.map((l) => l.id)).toEqual(expect.arrayContaining(['food', 'alcohol']));
    const food = r.expiring.find((l) => l.id === 'food')!;
    expect(food.daysLeft).toBe(2);
    expect(food.missing).toBe(false);
  });

  it('hết hạn (ngày đã qua) → missing, fine vẫn tính', () => {
    // business hết hạn (until 29 < day 30)
    const r = licenseHealth({ business: 29, food: 80, alcohol: 100 }, NEED, 30);
    expect(r.missing.map((l) => l.id)).toEqual(['business']);
    expect(r.fineExposure).toBe(LICENSE_FINE);
    expect(r.verdict).toBe('danger');
  });

  it('chỉ liệt kê những phép trong `need` (không thừa phép chưa cần)', () => {
    const r = licenseHealth({}, ['business'], 30);
    expect(r.lines.length).toBe(1);
    expect(r.missing.length).toBe(1);
    expect(RENEW_WARN_DAYS).toBe(5);
  });
});
