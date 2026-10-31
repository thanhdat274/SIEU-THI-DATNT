import { describe, expect, it } from 'vitest';
import { ZONES, canOpenZone, openZones, zoneAt } from '../data/zones';

/** GĐ497 — khung khu bản đồ (bước 1 mở rộng bản đồ). */
describe('khu bản đồ', () => {
  it('hẻm đầu luôn mở; bỏ id lạ/trùng; save cũ = chỉ hẻm', () => {
    expect(openZones(undefined)).toEqual(['hem']);
    expect(openZones(['ngo2', 'xxx', 'ngo2', 'hem'])).toEqual(['hem', 'ngo2']);
  });
  it('các khu không chồng ranh giới; mô tả ≤90 ký tự', () => {
    for (const a of ZONES) {
      expect(a.desc.length).toBeLessThanOrEqual(90);
      for (const b of ZONES) if (a !== b) {
        const overlap = a.bounds.x1 < b.bounds.x2 && b.bounds.x1 < a.bounds.x2 && a.bounds.z1 < b.bounds.z2 && b.bounds.z1 < a.bounds.z2;
        expect(overlap).toBe(false);
      }
    }
  });
  it('tiệm chính, quán nước, tiệm xôi nằm trong hẻm đầu', () => {
    expect(zoneAt(0, 0)?.id).toBe('hem');
    expect(zoneAt(54.4, 1)?.id).toBe('hem');
    expect(zoneAt(46, 1)?.id).toBe('hem');
    expect(zoneAt(0, -60)?.id).toBe('ngo2');
  });
  it('kiểm tra mở khu theo cấp/tiền', () => {
    expect(canOpenZone('ngo2', [], 10, 1e9)).toBe('level');
    expect(canOpenZone('ngo2', [], 45, 1)).toBe('money');
    expect(canOpenZone('ngo2', [], 45, 1e9)).toBe('ok');
    expect(canOpenZone('ngo2', ['ngo2'], 45, 1e9)).toBe('opened');
    expect(canOpenZone('hem', [], 1, 0)).toBe('opened');
    expect(canOpenZone('zz', [], 1, 0)).toBe('unknown');
  });
});
