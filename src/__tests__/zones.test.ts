import { describe, expect, it } from 'vitest';
import { ZONES, canOpenZone, openZones, zoneAt, zoneBlockRects } from '../data/zones';

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
    expect(zoneAt(0, -60)?.id).toBe('hem');
    expect(zoneAt(100, 5)?.id).toBe('ngo2');
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

describe('GĐ498: openZone', () => {
  it('cần cấp + tiền, một lần, lưu biz.zones, tin ≤90', async () => {
    const { newGameData, useGame } = await import('../core/store');
    const msgs: string[] = [];
    useGame.setState({ ...newGameData(), level: 10, money: 1e9, notify: (m: string) => { msgs.push(m); } });
    const g = () => useGame.getState();
    expect(g().openZone('ngo2')).toBe(false);
    useGame.setState({ level: 45 });
    expect(g().openZone('ngo2')).toBe(true);
    expect(g().biz.zones).toEqual(['ngo2']);
    expect(g().money).toBe(1e9 - 50_000_000);
    expect(g().openZone('ngo2')).toBe(false);
    expect(g().openZone('hem')).toBe(false);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
});

describe('zoneBlockRects (GĐ500)', () => {
  const inside = (rs: { x1: number; z1: number; x2: number; z2: number }[], x: number, z: number) =>
    rs.some((r) => x >= r.x1 && x < r.x2 && z >= r.z1 && z < r.z2);
  it('chặn Ngõ 2 khi chưa mở, bỏ chặn khi mở; hẻm luôn đi được', () => {
    const closed = zoneBlockRects(undefined);
    expect(inside(closed, 100, 5)).toBe(true);
    expect(inside(closed, 0, 0)).toBe(false);
    expect(inside(closed, -100, 0)).toBe(true);
    const open = zoneBlockRects(['ngo2']);
    expect(inside(open, 100, 5)).toBe(false);
    expect(inside(open, 100, 60)).toBe(true);
  });
});

describe('zoneMapView (GĐ504)', () => {
  it('hẻm luôn mở; Ngõ 2 theo cấp/tiền/đã mở', async () => {
    const { zoneMapView } = await import('../data/zones');
    const st = (saved: string[] | undefined, lv: number, m: number) => zoneMapView(saved, lv, m).map((c) => c.state);
    expect(st(undefined, 1, 0)).toEqual(['open', 'level']);
    expect(st(undefined, 50, 0)).toEqual(['open', 'money']);
    expect(st(undefined, 50, 1e9)).toEqual(['open', 'ok']);
    expect(st(['ngo2'], 50, 0)).toEqual(['open', 'open']);
  });
});
