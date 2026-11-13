import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { installTripVehicleSync, parkedHauler } from '../world/tripVehicle';
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
});
