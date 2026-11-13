import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { driveAway, installTripVehicleSync, parkedHauler } from '../world/tripVehicle';
import { useGame } from '../core/store';

describe('xe chở hàng đậu hông nhà (Hệ 5 L9)', () => {
  it('chỉ ba gác/xe tải đậu; đi tỉnh thì vắng', () => {
    expect(parkedHauler('ba_gac', false)).toBe('ba_gac');
    expect(parkedHauler('xe_tai', false)).toBe('xe_tai');
    expect(parkedHauler('xe_tai', true)).toBeNull();
    expect(parkedHauler('moto', false)).toBeNull();
    expect(parkedHauler(undefined, false)).toBeNull();
  });
  it('cảnh: có xe → hiện, rồi ẩn khi bán/đi tỉnh', () => {
    const scene = new THREE.Scene();
    const root = installTripVehicleSync(scene);
    expect(root.visible).toBe(false);
    useGame.setState({ biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    expect(root.visible).toBe(true);
    expect(root.children.length).toBe(1);
    useGame.setState({ biz: { ...useGame.getState().biz, hauler: undefined } });
    expect(root.visible).toBe(false);
  });
  it('xe rời đi 10 phút đầu, khuất giữa chuyến, về 10 phút cuối', () => {
    const t = { departAt: 100, returnAt: 400 };
    expect(driveAway(undefined, 100)).toBe(0);
    expect(driveAway(t, 100)).toBe(0);
    expect(driveAway(t, 105)).toBeCloseTo(0.5);
    expect(driveAway(t, 200)).toBe(1);
    expect(driveAway(t, 395)).toBeCloseTo(0.5);
    expect(driveAway(t, 400)).toBe(0);
  });
  it('cảnh: xe chạy ra theo tiến độ chuyến', () => {
    const scene = new THREE.Scene();
    const root = installTripVehicleSync(scene);
    const base = useGame.getState();
    useGame.setState({ minutes: 100, biz: { ...base.biz, hauler: 'xe_tai', trip: { routeId: 'x', day: 1, departAt: 100, returnAt: 400, by: 'self', cash: 0 } as never } });
    expect(root.visible).toBe(true);
    const x0 = root.position.x;
    useGame.setState({ minutes: 105 });
    expect(root.position.x).toBeLessThan(x0);
    useGame.setState({ minutes: 200 });
    expect(root.visible).toBe(false);
    useGame.setState({ minutes: 399 });
    expect(root.visible).toBe(true);
    useGame.setState({ minutes: 400, biz: { ...useGame.getState().biz, trip: undefined } });
    expect(root.position.x).toBeCloseTo(x0);
  });
});
